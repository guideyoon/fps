const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Health check endpoint
app.get('/', (req, res) => {
    res.send('<h1>FPS Game Server is Running!</h1><p>Socket.io is waiting for connections.</p>');
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Room and Player Management
const rooms = {};
const playerRoomMap = {}; // socket.id -> roomId
let globalPlayerCounter = 1; // Global counter for assigning "Player 1", "Player 2", etc.

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 1. Initial Identity Setup (Lobby Join)
    socket.on('setIdentity', (data) => {
        // User Request: Auto-assign "Player N" in order using global counter
        // Use data.name ONLY if it's explicitly set (unlikely with this change), otherwise default to counter
        // Actually, user wants "Player 1, 2..." forced.
        const name = `Player ${globalPlayerCounter++}`;

        socket.userData = {
            id: socket.id,
            name: name,
            hp: 100,
            isDead: false
        };
        // Send existing rooms to the new user
        socket.emit('roomListUpdated', getRoomList());
    });

    // 2. Room Creation
    socket.on('createRoom', (data) => {
        const roomId = generateRoomId();
        const roomName = data.name || `${socket.userData.name}'s Room`;
        const maxPlayers = parseInt(data.maxPlayers) || 4;
        const mapName = data.map || 'factory'; // 기본값 factory

        rooms[roomId] = {
            id: roomId,
            name: roomName,
            host: socket.id,
            maxPlayers: maxPlayers,
            map: mapName,
            players: {},
            gameStarted: false,
            createdAt: Date.now()
        };

        joinRoom(socket, roomId);
        io.emit('roomListUpdated', getRoomList());
    });

    // 3. Join Room
    socket.on('joinRoom', (roomId) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', '존재하지 않는 방입니다.');
            return;
        }
        if (Object.keys(room.players).length >= room.maxPlayers) {
            socket.emit('error', '방이 꽉 찼습니다.');
            return;
        }
        if (room.gameStarted) {
            socket.emit('error', '이미 게임이 시작되었습니다.');
            return;
        }

        joinRoom(socket, roomId);
    });

    // 4. Game Start
    socket.on('requestStart', () => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];

        if (room && room.host === socket.id && !room.gameStarted) {
            room.gameStarted = true;
            // 맵 정보 포함하여 전송
            io.to(roomId).emit('gameStart', { map: room.map });
            io.emit('roomListUpdated', getRoomList()); // Status update
        }
    });

    // 5. In-Game Actions
    socket.on('playerMove', (data) => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].position = data.position;
            room.players[socket.id].rotation = data.rotation;
            socket.to(roomId).emit('playerMoved', room.players[socket.id]);
        }
    });

    socket.on('playerAction', (data) => {
        const roomId = playerRoomMap[socket.id];
        if (roomId) {
            socket.to(roomId).emit('playerActioned', {
                id: socket.id,
                action: data.action,
                weaponIdx: data.weaponIdx
            });
        }
    });

    socket.on('damagePlayer', (data) => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];
        const targetId = data.targetId;

        if (room && room.players[targetId] && !room.players[targetId].isInvincible) {
            room.players[targetId].hp -= data.damage;

            if (room.players[targetId].hp <= 0) {
                room.players[targetId].hp = 0;
                room.players[targetId].isDead = true;
                room.players[targetId].deathTime = Date.now(); // Track death timestamp

                // Send death event with killer info
                io.to(roomId).emit('playerDied', {
                    id: targetId,
                    killerId: socket.id,
                    killerName: room.players[socket.id] ? room.players[socket.id].name : 'Unknown'
                });
            } else {
                io.to(roomId).emit('playerDamaged', { id: targetId, hp: room.players[targetId].hp, dealerId: socket.id });
            }
        }
    });

    socket.on('requestRespawn', () => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];
        const player = room && room.players[socket.id];

        if (player && player.isDead) {
            // Enforce minimum respawn delay (Client has 10s timer, so server uses 8s to be safe against lag/race conditions)
            const timeSinceDeath = Date.now() - (player.deathTime || 0);
            const MIN_RESPAWN_DELAY = 8000; // 8 seconds (Client waits 10s)

            console.log(`[Respawn Request] Player: ${player.name} (${socket.id}), TimeSinceDeath: ${timeSinceDeath}ms`);

            if (timeSinceDeath < MIN_RESPAWN_DELAY) {
                console.log(`[Respawn Denied] Too early. Remaining: ${MIN_RESPAWN_DELAY - timeSinceDeath}ms`);
                // Too early - reject respawn
                socket.emit('respawnDenied', {
                    remainingTime: Math.ceil((MIN_RESPAWN_DELAY - timeSinceDeath) / 1000)
                });
                return;
            }

            // Track respawn count for this room to cycle through spawn points
            if (!room.respawnCounter) room.respawnCounter = 0;
            const spawnPos = getSafeSpawnPosition(room.respawnCounter++, room.map);

            player.hp = 100;
            player.isDead = false;
            player.isInvincible = true;
            player.deathTime = null; // Clear death timestamp
            player.position = spawnPos;
            player.rotation = { x: 0, y: 0 };

            setTimeout(() => {
                if (room && room.players[socket.id]) {
                    room.players[socket.id].isInvincible = false;
                }
            }, 2000);

            io.to(roomId).emit('playerRespawned', {
                id: socket.id,
                name: player.name,
                hp: player.hp,
                position: player.position,
                rotation: player.rotation
            });
        }
    });

    // 6. Chat System
    socket.on('chatMessage', (data) => {
        const roomId = playerRoomMap[socket.id];
        if (roomId && socket.userData) {
            io.to(roomId).emit('chatMessage', {
                sender: socket.userData.name,
                message: data.message,
                timestamp: Date.now()
            });
        }
    });

    // 7. Leave / Disconnect
    socket.on('leaveRoom', () => {
        leaveRoom(socket);
    });

    socket.on('disconnect', () => {
        leaveRoom(socket);
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Helper Functions
// Predefined safe spawn points (tested and clear of pillars/walls)
// Factory Map (200x200)
const FACTORY_SPAWN_POINTS = [
    { x: -15, y: 1.7, z: -15 },
    { x: -15, y: 1.7, z: 15 },
    { x: 15, y: 1.7, z: -15 },
    { x: 15, y: 1.7, z: 15 },
    { x: -25, y: 1.7, z: 0 },
    { x: 25, y: 1.7, z: 0 },
    { x: 0, y: 1.7, z: -25 },
    { x: 0, y: 1.7, z: 25 },
    { x: -5, y: 1.7, z: -5 },
    { x: -5, y: 1.7, z: 5 },
    { x: 5, y: 1.7, z: -5 },
    { x: 5, y: 1.7, z: 5 },
    { x: -15, y: 1.7, z: 0 },
    { x: 15, y: 1.7, z: 0 },
    { x: 0, y: 1.7, z: -15 },
    { x: 0, y: 1.7, z: 15 }
];

// Hotel Map (80x80)
const HOTEL_SPAWN_POINTS = [
    { x: 0, y: 1.7, z: -20 },  // 로비
    { x: -10, y: 1.7, z: 0 },  // 왼쪽 복도
    { x: 10, y: 1.7, z: 0 },   // 오른쪽 복도
    { x: 0, y: 1.7, z: 10 },   // 중앙 복도
    { x: 0, y: 1.7, z: 20 },   // 복도 끝
    { x: -10, y: 1.7, z: -10 },
    { x: 10, y: 1.7, z: -10 },
    { x: -10, y: 1.7, z: 10 },
    { x: 10, y: 1.7, z: 10 }
];

function getSafeSpawnPosition(playerIndex = 0, mapName = 'factory') {
    // 맵에 따라 다른 스폰 포인트 사용
    const spawnPoints = mapName === 'hotel' ? HOTEL_SPAWN_POINTS : FACTORY_SPAWN_POINTS;

    // Pick spawn point based on player index to avoid overlapping
    const index = playerIndex % spawnPoints.length;
    return { ...spawnPoints[index] }; // Clone to avoid mutation
}

function joinRoom(socket, roomId) {
    // Leave previous room if any
    if (playerRoomMap[socket.id]) {
        leaveRoom(socket);
    }

    const room = rooms[roomId];
    if (!room) return;

    // Initialize Player State for Game
    // Use current player count as index for unique spawn position
    const playerIndex = Object.keys(room.players).length;
    const spawnPos = getSafeSpawnPosition(playerIndex, room.map);

    socket.join(roomId);
    playerRoomMap[socket.id] = roomId;

    const newPlayer = {
        ...socket.userData,
        position: spawnPos,
        rotation: { x: 0, y: 0 },
        weaponIdx: 0,
        isInvincible: true
    };

    room.players[socket.id] = newPlayer;

    // Send Room Info to Joiner
    socket.emit('roomJoined', {
        roomId: room.id,
        roomName: room.name,
        isHost: room.host === socket.id,
        map: room.map,
        players: room.players
    });

    // Notify Others
    socket.to(roomId).emit('playerJoined', newPlayer);

    // Update Lobby List
    io.emit('roomListUpdated', getRoomList());

    // Invincibility Timer
    setTimeout(() => {
        if (room.players[socket.id]) {
            room.players[socket.id].isInvincible = false;
        }
    }, 2000);
}

function leaveRoom(socket) {
    const roomId = playerRoomMap[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (room) {
        delete room.players[socket.id];
        socket.leave(roomId);
        delete playerRoomMap[socket.id];

        // If room empty, delete room
        if (Object.keys(room.players).length === 0) {
            delete rooms[roomId];
        } else {
            // If host left, assign new host
            if (room.host === socket.id) {
                const remainingIds = Object.keys(room.players);
                room.host = remainingIds[0];
                io.to(roomId).emit('hostChanged', room.host);
            }
            io.to(roomId).emit('playerLeft', socket.id);
        }
    }

    io.emit('roomListUpdated', getRoomList());
}

function getRoomList() {
    return Object.values(rooms).map(r => ({
        id: r.id,
        name: r.name,
        currentPlayers: Object.keys(r.players).length,
        maxPlayers: r.maxPlayers,
        status: r.gameStarted ? 'playing' : 'waiting'
    }));
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Game server running on port ${PORT}`);
});

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

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 1. Initial Identity Setup (Lobby Join)
    socket.on('setIdentity', (data) => {
        socket.userData = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
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

        rooms[roomId] = {
            id: roomId,
            name: roomName,
            host: socket.id,
            maxPlayers: maxPlayers,
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
            io.to(roomId).emit('gameStart');
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
                io.to(roomId).emit('playerDied', { id: targetId, killerId: socket.id });
            } else {
                io.to(roomId).emit('playerDamaged', { id: targetId, hp: room.players[targetId].hp, dealerId: socket.id });
            }
        }
    });

    socket.on('requestRespawn', () => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];

        if (room && room.players[socket.id] && room.players[socket.id].isDead) {
            // Spawn within map bounds (map is 100x100, so use ±40 for safety)
            const spawnX = (Math.random() - 0.5) * 80;
            const spawnZ = (Math.random() - 0.5) * 80;

            const p = room.players[socket.id];
            p.hp = 100;
            p.isDead = false;
            p.isInvincible = true;
            p.position = { x: spawnX, y: 1.7, z: spawnZ };
            p.rotation = { x: 0, y: 0 };

            setTimeout(() => {
                if (room && room.players[socket.id]) {
                    room.players[socket.id].isInvincible = false;
                }
            }, 2000);

            io.to(roomId).emit('playerRespawned', {
                id: socket.id,
                name: p.name,
                position: p.position,
                rotation: p.rotation
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
function joinRoom(socket, roomId) {
    // Leave previous room if any
    if (playerRoomMap[socket.id]) {
        leaveRoom(socket);
    }

    const room = rooms[roomId];
    if (!room) return;

    // Initialize Player State for Game
    // Spawn within map bounds (map is 100x100, so use ±40 for safety)
    const spawnX = (Math.random() - 0.5) * 80;
    const spawnZ = (Math.random() - 0.5) * 80;

    socket.join(roomId);
    playerRoomMap[socket.id] = roomId;

    const newPlayer = {
        ...socket.userData,
        position: { x: spawnX, y: 1.7, z: spawnZ },
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

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// Health check endpoint
app.get('/', (req, res) => {
    res.send('<h1>FPS Game Server is Running!</h1><p>Socket.io is waiting for connections.</p>');
});

// Explicit route for /FPS
app.get('/FPS', (req, res) => {
    res.sendFile(path.join(__dirname, '../FPS.html'));
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

// Helper function to get the next available player number in a room
function getNextPlayerNumber(room) {
    const usedNumbers = new Set();
    for (const playerId in room.players) {
        const match = room.players[playerId].name.match(/^Player (\d+)$/);
        if (match) {
            usedNumbers.add(parseInt(match[1]));
        }
    }
    // Find the lowest available number starting from 1
    let num = 1;
    while (usedNumbers.has(num)) {
        num++;
    }
    return num;
}

// Helper function to reassign player numbers in order after someone leaves
function reassignPlayerNumbers(room) {
    const playerIds = Object.keys(room.players);
    playerIds.forEach((playerId, index) => {
        const newNumber = index + 1;
        room.players[playerId].name = `Player ${newNumber}`;
    });
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // 1. Initial Identity Setup (Lobby Join)
    socket.on('setIdentity', (data) => {
        // Player number will be assigned when joining a room
        socket.userData = {
            id: socket.id,
            name: null, // Will be set when joining a room
            hp: 100,
            isDead: false
        };
        // Send existing rooms to the new user
        socket.emit('roomListUpdated', getRoomList());
    });

    // 2. Room Creation
    socket.on('createRoom', (data) => {
        const roomId = generateRoomId();
        const hostName = (socket.userData && socket.userData.name) || 'Player';
        const roomName = data.name || `${hostName}'s Room`;
        const maxPlayers = parseInt(data.maxPlayers) || 4;
        const mapName = data.map || 'factory'; // 기본값 factory

        rooms[roomId] = {
            id: roomId,
            name: roomName,
            host: socket.id,
            maxPlayers: maxPlayers,
            map: mapName,
            gameMode: data.gameMode || 'ffa', // ffa or tdm
            players: {},
            gameStarted: false,
            timeLeft: 600, // 10 minutes in seconds
            timerId: null,
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
        // [User Request] 난입 가능 (gameStarted 체크 제거)

        joinRoom(socket, roomId);
    });

    // 4. Game Start
    socket.on('requestStart', () => {
        const roomId = playerRoomMap[socket.id];
        const room = rooms[roomId];

        if (room && room.host === socket.id && !room.gameStarted) {
            room.gameStarted = true;
            room.timeLeft = 600; // Reset timer to 10m on start

            // Start Server-side Timer
            if (room.timerId) clearInterval(room.timerId);
            room.timerId = setInterval(() => {
                if (rooms[roomId]) {
                    rooms[roomId].timeLeft--;
                    io.to(roomId).emit('timerSync', { timeLeft: rooms[roomId].timeLeft });

                    if (rooms[roomId].timeLeft <= 0) {
                        clearInterval(rooms[roomId].timerId);
                        rooms[roomId].timerId = null;
                        rooms[roomId].gameStarted = false; // Match ended
                        io.to(roomId).emit('gameEnded', { message: '시간 종료! 게임이 종료되었습니다.' });
                        io.emit('roomListUpdated', getRoomList());
                    }
                } else {
                    clearInterval(room.timerId);
                }
            }, 1000);

            // 맵 정보 및 초기 상태 전송
            io.to(roomId).emit('gameStart', {
                map: room.map,
                gameMode: room.gameMode,
                timeLeft: room.timeLeft
            });
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
            // Enforce minimum respawn delay (Client has 3s timer, so server uses 2s/2.5s to be safe)
            const timeSinceDeath = Date.now() - (player.deathTime || 0);
            const MIN_RESPAWN_DELAY = 2500; // 2.5 seconds (Client waits 3s)

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
// Predefined safe spawn points - VERIFIED clear of all structures
// Factory Map (200x200)
// Avoiding: Pillars (-20 to 20, step 10), Platforms (±60,±60), Containers (±70,±70, ±85/0),
// Tanks, Crates, Barriers, Cover walls, Corridors, Central structure (±7.5 from center)
const FACTORY_SPAWN_POINTS = [
    // === SAFE ZONE A: Inner ring (between center structure and pillars) ===
    // Center structure is at 0,0 with 15x15 size, pillars start at ±10
    // These spots are in the gaps between structures

    // === SAFE ZONE B: Open areas between pillars and outer structures ===
    // Clear corridor areas (avoiding cover walls, crates, barriers)
    { x: 22, y: 1.7, z: 22 },   // NE quadrant open space
    { x: -22, y: 1.7, z: 22 },  // NW quadrant open space
    { x: 22, y: 1.7, z: -22 },  // SE quadrant open space
    { x: -22, y: 1.7, z: -22 }, // SW quadrant open space

    // === SAFE ZONE C: Mid-range areas ===
    // Avoiding crates at (±45,±15), (±15,±45), (±70,±30), etc.
    { x: 38, y: 1.7, z: 0 },    // East mid
    { x: -38, y: 1.7, z: 0 },   // West mid
    { x: 0, y: 1.7, z: 38 },    // North mid
    { x: 0, y: 1.7, z: -38 },   // South mid

    // === SAFE ZONE D: Diagonal open corridors ===
    { x: 32, y: 1.7, z: 52 },   // NE diagonal
    { x: -32, y: 1.7, z: 52 },  // NW diagonal  
    { x: 32, y: 1.7, z: -52 },  // SE diagonal
    { x: -32, y: 1.7, z: -52 }, // SW diagonal

    // === SAFE ZONE E: Outer ring safe spots ===
    // Avoiding containers (±70,±70), tanks (±50,±70), fences (±90,±40)
    { x: 52, y: 1.7, z: 32 },   // East outer
    { x: -52, y: 1.7, z: 32 },  // West outer
    { x: 52, y: 1.7, z: -32 },  // East outer south
    { x: -52, y: 1.7, z: -32 }, // West outer south

    // === SAFE ZONE F: Corner approach areas ===
    // Avoiding platforms at ±60,±60 and containers
    { x: 78, y: 1.7, z: 52 },   // Far NE
    { x: -78, y: 1.7, z: 52 },  // Far NW
    { x: 78, y: 1.7, z: -52 },  // Far SE
    { x: -78, y: 1.7, z: -52 }  // Far SW
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

    // ALWAYS pick a RANDOM spawn point (not sequential)
    const randomIndex = Math.floor(Math.random() * spawnPoints.length);
    return { ...spawnPoints[randomIndex] }; // Clone to avoid mutation
}

function joinRoom(socket, roomId) {
    // Leave previous room if any
    if (playerRoomMap[socket.id]) {
        leaveRoom(socket);
    }

    const room = rooms[roomId];
    if (!room) return;

    // Ensure userData exists
    if (!socket.userData) {
        socket.userData = {
            id: socket.id,
            name: null,
            hp: 100,
            isDead: false
        };
    }

    // Assign player number when joining the room
    const playerNumber = getNextPlayerNumber(room);
    socket.userData.name = `Player ${playerNumber}`;

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
        gameMode: room.gameMode,
        gameStarted: room.gameStarted,
        timeLeft: room.timeLeft,
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

        // If room empty, delete room & timer
        if (Object.keys(room.players).length === 0) {
            if (room.timerId) clearInterval(room.timerId);
            delete rooms[roomId];
        } else {
            // Reassign player numbers in order (Player 1, 2, 3...)
            reassignPlayerNumbers(room);

            // If host left, assign new host
            if (room.host === socket.id) {
                const remainingIds = Object.keys(room.players);
                room.host = remainingIds[0];
                io.to(roomId).emit('hostChanged', room.host);
            }
            io.to(roomId).emit('playerLeft', socket.id);

            // Notify all players in the room about updated player names
            io.to(roomId).emit('playersUpdated', room.players);
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
        map: r.map,
        gameMode: r.gameMode,
        status: r.gameStarted ? 'playing' : 'waiting'
    }));
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Game server running on port ${PORT}`);
});

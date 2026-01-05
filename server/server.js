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

const players = {};
const MAX_PLAYERS = 4; // 최대 인원
let gameStarted = false;

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // New player joined
    socket.on('join', (data) => {
        // 랜덤 스폰 위치 생성
        const spawnX = (Math.random() - 0.5) * 60; // -30 ~ 30
        const spawnZ = (Math.random() - 0.5) * 60; // -30 ~ 30

        players[socket.id] = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
            position: { x: spawnX, y: 1.7, z: spawnZ },
            rotation: { x: 0, y: 0 },
            hp: 100,
            weaponIdx: 0,
            isDead: false,
            isInvincible: true // 초기 스폰 시 무적
        };

        // 2초 후 무적 해제
        setTimeout(() => {
            if (players[socket.id]) {
                players[socket.id].isInvincible = false;
            }
        }, 2000);

        // Send current players to the new player
        socket.emit('currentPlayers', players);

        // Broadcast new player to others
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // Update player movement
    socket.on('playerMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Synchronize actions (shooting, reloading, etc.)
    socket.on('playerAction', (data) => {
        if (players[socket.id]) {
            socket.broadcast.emit('playerActioned', {
                id: socket.id,
                action: data.action,
                weaponIdx: data.weaponIdx
            });
        }
    });

    // Handle damage
    socket.on('damagePlayer', (data) => {
        const targetId = data.targetId;
        if (players[targetId] && !players[targetId].isInvincible) { // 무적 체크
            players[targetId].hp -= data.damage;
            if (players[targetId].hp <= 0) {
                players[targetId].hp = 0;
                players[targetId].isDead = true;
                io.emit('playerDied', { id: targetId, killerId: socket.id });
            } else {
                io.emit('playerDamaged', { id: targetId, hp: players[targetId].hp, dealerId: socket.id });
            }
        }
    });

    // Force start game
    socket.on('requestStart', () => {
        if (!gameStarted) {
            gameStarted = true;
            io.emit('gameStart');
            console.log('Game force-started by host');
        }
    });

    // Handle respawn request
    socket.on('requestRespawn', () => {
        if (players[socket.id] && players[socket.id].isDead) {
            // 랜덤 스폰 위치 (초기 스폰과 동일한 범위)
            const spawnX = (Math.random() - 0.5) * 60; // -30 ~ 30
            const spawnZ = (Math.random() - 0.5) * 60; // -30 ~ 30

            players[socket.id].hp = 100;
            players[socket.id].isDead = false;
            players[socket.id].isInvincible = true; // 리스폰 시 무적
            players[socket.id].position = { x: spawnX, y: 1.7, z: spawnZ };
            players[socket.id].rotation = { x: 0, y: 0 };

            // 2초 후 무적 해제
            setTimeout(() => {
                if (players[socket.id]) {
                    players[socket.id].isInvincible = false;
                }
            }, 2000);

            // 모든 플레이어에게 리스폰 알림
            io.emit('playerRespawned', {
                id: socket.id,
                name: players[socket.id].name,
                position: players[socket.id].position,
                rotation: players[socket.id].rotation
            });

            console.log(`Player ${socket.id} respawned at (${spawnX.toFixed(1)}, ${spawnZ.toFixed(1)}) with invincibility`);
        }
    });

    // Player disconnected
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);

        // Reset game started flag if all players leave
        if (Object.keys(players).length === 0) {
            gameStarted = false;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Game server running on port ${PORT}`);
});

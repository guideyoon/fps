const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // New player joined
    socket.on('join', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
            position: { x: 0, y: 1.7, z: 5 },
            rotation: { x: 0, y: 0 },
            hp: 100,
            weaponIdx: 0,
            isDead: false
        };
        
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
        if (players[targetId]) {
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

    // Player disconnected
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Game server running on port ${PORT}`);
});

import { io, Socket } from 'socket.io-client';
import { PlayerState } from '../types';

export class Network {
    static socket: Socket;
    static id: string | null = null;
    static isConnected: boolean = false;

    // Event callbacks
    static onPlayerJoined: ((data: any) => void) | null = null;
    static onPlayerMoved: ((data: PlayerState) => void) | null = null;
    static onPlayerLeft: ((id: string) => void) | null = null;
    static onPlayerAction: ((data: any) => void) | null = null; // Shoot, Reload, Switch
    static onChatMessage: ((data: { sender: string, message: string }) => void) | null = null;
    static onPlayerDied: ((data: { id: string, killerId: string, killerName: string }) => void) | null = null;
    static onPlayerRespawned: ((data: any) => void) | null = null;
    static onPlayerDamaged: ((data: { id: string, hp: number, dealerId: string }) => void) | null = null;
    static onGameState: ((state: any) => void) | null = null;

    static init() {
        // Auto-detect production URL or localhost
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        // const serverUrl = isProduction ? 'https://fps-server-guideyoons-projects.vercel.app' : 'http://localhost:3000'; 
        // Use relative path or specific URL if needed. For now assume same origin or configured Proxy.
        // If standalone server, use specific URL.
        const serverUrl = isProduction ? 'https://fps-server-guideyoons-projects.vercel.app' : 'http://localhost:3000';

        this.socket = io(serverUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
            this.id = this.socket.id || null;
            this.isConnected = true;
        });

        this.socket.on('currentPlayers', (players) => {
            if (this.onGameState) this.onGameState(players);
        });

        this.socket.on('newPlayer', (player) => {
            if (this.onPlayerJoined) this.onPlayerJoined(player);
        });

        this.socket.on('playerMoved', (player) => {
            if (this.onPlayerMoved) this.onPlayerMoved(player);
        });

        this.socket.on('playerDisconnected', (id) => {
            if (this.onPlayerLeft) this.onPlayerLeft(id);
        });

        this.socket.on('playerActioned', (data) => {
            if (this.onPlayerAction) this.onPlayerAction(data);
        });

        this.socket.on('chatMessage', (data) => {
            if (this.onChatMessage) this.onChatMessage(data);
        });

        this.socket.on('playerDied', (data) => {
            if (this.onPlayerDied) this.onPlayerDied(data);
        });

        this.socket.on('playerRespawned', (data) => {
            if (this.onPlayerRespawned) this.onPlayerRespawned(data);
        });

        this.socket.on('playerDamaged', (data) => {
            if (this.onPlayerDamaged) this.onPlayerDamaged(data);
        });
    }

    static sendDamage(targetId: string, damage: number) {
        if (this.isConnected) {
            this.socket.emit('damagePlayer', { targetId, damage });
        }
    }

    static requestRespawn() {
        if (this.isConnected) {
            this.socket.emit('requestRespawn');
        }
    }

    static sendMove(pos: { x: number, y: number, z: number }, rot: { x: number, y: number }) {
        if (this.isConnected) {
            this.socket.emit('playerMovement', { x: pos.x, y: pos.y, z: pos.z, rotation: rot });
        }
    }

    static sendAction(action: 'shoot' | 'reload' | 'switch', data?: any) {
        if (this.isConnected) {
            this.socket.emit('playerAction', { action, ...data });
        }
    }

    static sendChat(message: string) {
        if (this.isConnected) {
            this.socket.emit('chatMessage', message);
        }
    }
}

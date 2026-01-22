import * as THREE from 'three';
import { Player } from './entities/Player';
import { RemotePlayer } from './entities/RemotePlayer';
import { InputManager } from './core/InputManager';
import { AudioManager } from './core/AudioManager';
import { Network } from './systems/Network';
import { UIManager } from './ui/UIManager';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectManager } from './systems/EffectManager';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue defaults
scene.fog = new THREE.Fog(0x87CEEB, 0, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('app')!.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// Systems
InputManager.init();
AudioManager.init(camera);
Network.init();
UIManager.init();
UIManager.updateHealth(100);

// Entities
const player = new Player(camera, scene);
const remotePlayers: { [id: string]: RemotePlayer } = {};

// Level Loading (Async)
const loader = new GLTFLoader();
loader.load('/map/map.glb', (gltf) => {
    scene.add(gltf.scene);
    player.physics.loadLevel(gltf.scene);
    console.log("Map Loaded");
}, undefined, (error) => {
    console.error("Map Load Error:", error);
    // Fallback floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
});

// Network Handlers
Network.onPlayerJoined = (data) => {
    if (data.id === Network.id) return;
    remotePlayers[data.id] = new RemotePlayer(scene, data);
};

Network.onPlayerMoved = (data) => {
    if (remotePlayers[data.id]) remotePlayers[data.id].update(data);
};

Network.onPlayerLeft = (id) => {
    if (remotePlayers[id]) {
        remotePlayers[id].remove(scene);
        delete remotePlayers[id];
    }
    if (player.spectatorTargetId === id) {
        player.isSpectating = false;
        player.spectatorTargetId = null;
    }
};

let killStreak = 0;

Network.onPlayerDied = (data) => {
    if (data.id === Network.id) {
        killStreak = 0; // Reset streak on own death
        player.isDead = true;
        player.isSpectating = true;
        player.spectatorTargetId = data.killerId;
        UIManager.showDeathUI(data.killerName);

        // Start respawn countdown locally for UI
        let count = 3;
        const timer = setInterval(() => {
            count--;
            UIManager.updateRespawnTimer(count);
            if (count <= 0) {
                clearInterval(timer);
                Network.requestRespawn();
            }
        }, 1000);
    } else {
        // Did I kill them?
        if (data.killerId === Network.id) {
            killStreak++;
            if (killStreak === 2) UIManager.showKillStreak("DOUBLE KILL!");
            else if (killStreak === 3) UIManager.showKillStreak("TRIPLE KILL!");
            else if (killStreak === 4) UIManager.showKillStreak("ULTRA KILL!");
            else if (killStreak >= 5) UIManager.showKillStreak("RAMPAGE!");
        }

        // Handle remote player death visualization
        if (remotePlayers[data.id]) {
            remotePlayers[data.id].mesh.visible = false;
        }
    }
};

Network.onPlayerRespawned = (data) => {
    if (data.id === Network.id) {
        player.respawn();
        player.camera.position.set(data.position.x, data.position.y, data.position.z);
    } else {
        if (remotePlayers[data.id]) {
            remotePlayers[data.id].mesh.visible = true;
            remotePlayers[data.id].update(data);
        }
    }
};

Network.onPlayerDamaged = (data) => {
    if (data.id === Network.id) {
        player.hp = data.hp;
        UIManager.updateHealth(data.hp);
        UIManager.showDamageEffect();
    }
};

// --- Game Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);

    // Spectator Camera (Killcam) - 3rd Person Follow Camera
    if (player.isSpectating && player.spectatorTargetId) {
        const killer = remotePlayers[player.spectatorTargetId];
        if (killer) {
            // Camera offset: 5m behind, 3m above the killer
            const offsetDistance = 5;
            const offsetHeight = 3;
            const killerRotY = killer.mesh.rotation.y;

            const camX = killer.mesh.position.x - Math.sin(killerRotY) * offsetDistance;
            const camY = killer.mesh.position.y + offsetHeight;
            const camZ = killer.mesh.position.z - Math.cos(killerRotY) * offsetDistance;

            // Smoothly interpolate camera position
            camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);

            // Make camera look at the killer
            camera.lookAt(
                killer.mesh.position.x,
                killer.mesh.position.y + 1.0, // Look at chest level
                killer.mesh.position.z
            );
        }
    } else {
        player.update(dt); // Physics & Input
    }

    EffectManager.update(dt);

    renderer.render(scene, camera);
}

animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

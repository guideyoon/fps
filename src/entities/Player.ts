import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { Physics } from '../systems/Physics';
import { WeaponSystem } from '../systems/WeaponSystem';
import { AudioManager } from '../core/AudioManager';
import { Network } from '../systems/Network';
import { CONFIG, WEAPONS } from '../utils/Constants';
import { UIManager } from '../ui/UIManager';

export class Player {
    camera: THREE.PerspectiveCamera;
    velocity: THREE.Vector3 = new THREE.Vector3();
    onGround: boolean = false;
    physics: Physics;
    weaponSystem: WeaponSystem;

    // Health & State
    hp: number = 100;
    isDead: boolean = false;
    isSpectating: boolean = false;
    spectatorTargetId: string | null = null;

    constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
        this.camera = camera;
        this.physics = new Physics();
        this.weaponSystem = new WeaponSystem(scene, camera);

        // Initial spawn
        this.camera.position.set(0, CONFIG.PLAYER_HEIGHT, 5);
        this.camera.rotation.set(0, 0, 0); // Reset rotation
        scene.add(this.camera);
    }

    respawn() {
        this.hp = 100;
        this.isDead = false;
        this.isSpectating = false;
        this.spectatorTargetId = null;
        this.camera.position.set(0, CONFIG.PLAYER_HEIGHT, 5);
        this.weaponSystem.weapons = JSON.parse(JSON.stringify(WEAPONS)); // Reset ammo
        UIManager.updateHealth(100);
        UIManager.hideDeathUI();
    }


    // State
    moveDistance: number = 0;
    STEP_INTERVAL: number = 2.5;

    // Bobbing
    bobbingCounter: number = 0;

    update(dt: number) {
        if (this.isDead || this.isSpectating) {
            // Weapon System still needs to update for animations/recoil if needed, 
            // but we usually hide it in spectate.
            return;
        }

        const speed = this.onGround ? CONFIG.PLAYER_SPEED : CONFIG.PLAYER_SPEED * 0.5;
        let isMoving = false;

        // Input Movement
        if (InputManager.isLocked) {
            const forward = InputManager.keys['KeyW'] ? 1 : (InputManager.keys['KeyS'] ? -1 : 0);
            const right = InputManager.keys['KeyD'] ? 1 : (InputManager.keys['KeyA'] ? -1 : 0);
            isMoving = forward !== 0 || right !== 0;

            const frontVector = new THREE.Vector3(0, 0, -forward);
            const sideVector = new THREE.Vector3(right, 0, 0);
            const direction = new THREE.Vector3();

            direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed);
            direction.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));

            this.velocity.x = direction.x;
            this.velocity.z = direction.z;

            if (isMoving && this.onGround) {
                this.moveDistance += speed * 60 * dt; // Scale approx to original
                if (this.moveDistance > this.STEP_INTERVAL) {
                    AudioManager.playStep();
                    this.moveDistance = 0;
                }
            }

            // Jump
            if (InputManager.keys['Space'] && this.onGround) {
                this.velocity.y = CONFIG.PLAYER_JUMP_FORCE * 100; // Adjusted for mass
                this.onGround = false;
                // Using placeholder or we need to map a file
                // AudioManager.play('jump'); // Ensure this is mapped!
            }

            // Mouse Look
            const mouseDelta = InputManager.getAndResetMouseDelta();

            // Apply horizontal (Y) and vertical (X) rotation
            this.camera.rotation.y -= mouseDelta.x * InputManager.mouseSensitivity;
            this.camera.rotation.x -= mouseDelta.y * InputManager.mouseSensitivity;

            // Clamp vertical rotation
            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

            // Apply Visual Recoil (Feature 1)
            this.camera.rotation.x += this.weaponSystem.recoil.z * dt;
            this.camera.rotation.y += this.weaponSystem.recoil.x * dt;
        }

        // Physics Step
        this.onGround = this.physics.updatePlayer(dt, this.velocity, this.onGround);

        // Feature 2: View Bobbing
        if (isMoving && this.onGround) {
            const bobSpeed = 10;
            const bobAmount = 0.05;
            this.bobbingCounter += dt * bobSpeed;
            const bobX = Math.cos(this.bobbingCounter * 0.5) * bobAmount * 0.5;
            const bobY = Math.sin(this.bobbingCounter) * bobAmount;

            this.camera.position.copy(this.physics.playerCollider.end).add(new THREE.Vector3(bobX, 0.1 + bobY, 0));
        } else {
            this.bobbingCounter = 0;
            this.camera.position.copy(this.physics.playerCollider.end).add(new THREE.Vector3(0, 0.1, 0));
        }

        // Weapon Update
        this.weaponSystem.isAiming = InputManager.keys['Mouse2'] || false;

        // FOV Zoom for ADS
        const weapon = this.weaponSystem.weapons[this.weaponSystem.curWeaponIdx];
        const targetFov = this.weaponSystem.isAiming ? (weapon.fovAds || 40) : 75;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.2);
        this.camera.updateProjectionMatrix();

        this.weaponSystem.update(dt);

        // Network Sync (Throttle to ~20Hz if needed, but per frame is fine for simple test)
        Network.sendMove(this.camera.position, { x: this.camera.rotation.x, y: this.camera.rotation.y });
    }
}

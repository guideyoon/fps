import * as THREE from 'three';
import { WEAPONS } from '../utils/Constants';
import { AudioManager } from '../core/AudioManager';
import { UIManager } from '../ui/UIManager';
import { Network } from './Network';
import { InputManager } from '../core/InputManager';
import { EffectManager } from './EffectManager';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export class WeaponSystem {
    camera: THREE.Camera;
    scene: THREE.Scene;

    // State
    curWeaponIdx: number = 0;
    weapons = JSON.parse(JSON.stringify(WEAPONS)); // Deep copy state
    isAiming: boolean = false;
    isReloading: boolean = false;
    lastFireTime: number = 0;

    // Recoil
    recoil = { x: 0, z: 0 };
    recoilVel = { x: 0, z: 0 };

    // Meshes
    weaponContainer: THREE.Group;
    currentMesh: THREE.Group | null = null;
    loader = new GLTFLoader();

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;

        this.weaponContainer = new THREE.Group();
        this.camera.add(this.weaponContainer);
        // Explicitly NOT adding camera to scene here to avoid double adding if Player already does it,
        // but we need to ensure the camera IS in the scene for the hierarchy to work.

        this.loadWeaponMesh(this.curWeaponIdx);
    }

    private loadWeaponMesh(idx: number) {
        const weapon = this.weapons[idx];
        if (this.currentMesh) this.weaponContainer.remove(this.currentMesh);

        // Map type to GLB file
        let modelPath = `/gun/Assault Rifle.glb`; // Default
        if (weapon.type === 'PISTOL') modelPath = `/gun/pistol.glb`;
        if (weapon.type === 'SNIPER') modelPath = `/gun/Sniper.glb`;
        if (weapon.type === 'KNIFE') modelPath = `/gun/Knife.glb`;

        this.loader.load(modelPath, (gltf) => {
            this.currentMesh = gltf.scene;
            this.weaponContainer.add(this.currentMesh);
            this.applyWeaponTransform();
        });
    }

    private applyWeaponTransform() {
        if (!this.currentMesh) return;
        const weapon = this.weapons[this.curWeaponIdx];
        const config = this.isAiming ? (weapon.glbAds || weapon.glbHip) : weapon.glbHip;

        if (config) {
            this.currentMesh.position.lerp(config.pos, 0.2);

            // For rotation, we can use quaternions or just lerp euler carefully
            const targetRot = new THREE.Euler(config.rot.x, config.rot.y, config.rot.z);
            this.currentMesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(targetRot), 0.2);

            this.currentMesh.scale.lerp(config.scale, 0.2);
        }
    }

    update(dt: number) {
        // Recoil Recovery
        const RECOIL_SPRING = 70;
        const RECOIL_DAMPING = 12;

        this.recoilVel.x += (0 - this.recoil.x) * RECOIL_SPRING * dt - this.recoilVel.x * RECOIL_DAMPING * dt;
        this.recoilVel.z += (0 - this.recoil.z) * RECOIL_SPRING * dt - this.recoilVel.z * RECOIL_DAMPING * dt;
        this.recoil.x += this.recoilVel.x * dt;
        this.recoil.z += this.recoilVel.z * dt;

        // Apply weapon transforms (Smooth ADS)
        this.applyWeaponTransform();

        // Feature 4: Weapon Shake (Procedural Recoil)
        this.weaponContainer.position.z = this.recoil.z * 0.5;
        this.weaponContainer.rotation.x = this.recoil.z * 0.2;
        this.weaponContainer.rotation.y = this.recoil.x * 0.2;

        // Input Handling for Shooting
        if (InputManager.isLocked && !this.isReloading) {
            if (InputManager.keys['Mouse0']) {
                this.shoot();
            }
        }
    }

    shoot() {
        const now = performance.now() / 1000;
        const weapon = this.weapons[this.curWeaponIdx];

        if (this.isReloading) return;
        if (now - this.lastFireTime < weapon.fireRate) return;

        if (weapon.ammo <= 0 && weapon.type !== 'KNIFE') {
            AudioManager.playEmpty();
            this.lastFireTime = now;
            return;
        }

        // Fire Logic
        if (weapon.type !== 'KNIFE') weapon.ammo--;
        this.lastFireTime = now;

        // Recoil Impulse
        this.recoilVel.x += (Math.random() - 0.5) * weapon.recoil * 2;
        this.recoilVel.z += weapon.recoil;

        // Audio & UI
        AudioManager.playShoot(weapon.type);
        UIManager.updateAmmo(weapon.ammo, weapon.maxAmmo);

        // Network
        Network.sendAction('shoot', {
            origin: this.camera.position,
            direction: this.camera.getWorldDirection(new THREE.Vector3())
        });

        // Raycast
        this.performRaycast(weapon);
    }

    performRaycast(weapon: any) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        if (!this.isAiming && weapon.type !== 'KNIFE') {
            raycaster.ray.direction.x += (Math.random() - 0.5) * 0.05;
            raycaster.ray.direction.y += (Math.random() - 0.5) * 0.05;
        }

        const range = (weapon.type === 'KNIFE') ? 3.0 : 100;
        const targets = this.scene.children.filter(obj => obj.name !== 'WeaponContainer');
        const intersects = raycaster.intersectObjects(targets, true);

        for (const intersect of intersects) {
            if (intersect.distance > range) continue;

            const meshName = intersect.object.name.toLowerCase();
            if (meshName.includes('assault') || meshName.includes('rifle') || meshName.includes('gun') || meshName.includes('weapon')) continue;

            let target: any = intersect.object;
            let hitData: any = null;

            while (target) {
                if (target.userData && target.userData.hp !== undefined) {
                    hitData = target.userData;
                    break;
                }
                if (target.parent === this.scene || !target.parent) break;
                target = target.parent;
            }

            if (hitData) {
                const falloff = 1 - (intersect.distance / 100) * 0.5;
                let finalDamage = weapon.damage * Math.max(0.5, falloff);

                const isHead = meshName.includes('head') || intersect.object.userData.isHead;
                const isChest = meshName.includes('chest') || meshName.includes('torso') || meshName.includes('spine');
                const isStomach = meshName.includes('stomach') || meshName.includes('hips');
                const isLimb = meshName.includes('arm') || meshName.includes('leg');
                const isExtremity = meshName.includes('hand') || meshName.includes('foot');

                if (isHead) {
                    finalDamage *= 3.0;
                    UIManager.showHitMarker(true);
                    AudioManager.play('headshot');
                } else if (isChest) {
                    finalDamage *= 1.2;
                } else if (isExtremity) {
                    finalDamage *= 0.5;
                } else if (isLimb) {
                    finalDamage *= 0.7;
                }

                if (hitData.armor > 0 && (isChest || isStomach)) {
                    finalDamage *= 0.7;
                }

                UIManager.showHitMarker();
                EffectManager.createBlood(intersect.point, intersect.face?.normal || new THREE.Vector3(0, 1, 0));
                if (hitData.onHit) hitData.onHit(finalDamage);
                break;
            }

            if (weapon.type !== 'KNIFE') {
                const normal = intersect.face?.normal?.clone().applyQuaternion(intersect.object.quaternion) || new THREE.Vector3(0, 1, 0);
                EffectManager.createDust(intersect.point, normal);
                EffectManager.createDecal(intersect.point, normal);
                break;
            }
        }
    }

    reload() {
        if (this.isReloading) return;
        const weapon = this.weapons[this.curWeaponIdx];
        if (weapon.ammo >= weapon.maxAmmo) return;

        this.isReloading = true;
        AudioManager.playReload();

        setTimeout(() => {
            weapon.ammo = weapon.maxAmmo;
            this.isReloading = false;
            UIManager.updateAmmo(weapon.ammo, weapon.maxAmmo);
        }, 2000);
    }

    switchWeapon(idx: number) {
        if (idx < 0 || idx >= this.weapons.length) return;
        if (this.curWeaponIdx === idx) return;

        this.curWeaponIdx = idx;
        this.isReloading = false;

        const weapon = this.weapons[this.curWeaponIdx];
        AudioManager.playSwitch(weapon.switchSound);
        UIManager.updateWeaponSlots(idx);
        UIManager.updateAmmo(weapon.ammo, weapon.maxAmmo);

        this.loadWeaponMesh(idx);
        Network.sendAction('switch', { weaponIdx: idx });
    }
}

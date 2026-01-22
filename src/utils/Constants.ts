import * as THREE from 'three';
import { Weapon } from '../types';

export const WEAPONS: Weapon[] = [
    {
        id: 0, name: "ASSAULT RIFLE",
        type: 'RIFLE', maxAmmo: 30, ammo: 30, automatic: true,
        posHip: new THREE.Vector3(0.08, -0.25, -0.45),
        glbHip: {
            pos: new THREE.Vector3(0.23, -0.47, 0.44),
            rot: new THREE.Vector3(0.43, 1.69, -0.25),
            scale: new THREE.Vector3(0.50, 0.50, 0.50)
        },
        glbAds: {
            pos: new THREE.Vector3(0.00, -0.47, -0.06),
            rot: new THREE.Vector3(0.36, 1.57, -0.29),
            scale: new THREE.Vector3(0.45, 0.45, 0.45)
        },
        posAds: new THREE.Vector3(0, -0.062, -0.45),
        rotAds: new THREE.Vector3(0, 0, 0),
        fovAds: 25, fireRate: 0.12, recoil: 0.06, damage: 30, // fireRate adjusted to 0.12 per previous fix
        muzzleHip: new THREE.Vector3(0, 0.12, -0.65),
        muzzleAds: new THREE.Vector3(-0.049, 0.024, -0.655),
        lArmHip: { pos: new THREE.Vector3(-0.05, -0.25, -0.44), rot: new THREE.Vector3(0.54, -0.82, 0.60) },
        lArmAds: { pos: new THREE.Vector3(-0.10, -0.27, -1.46), rot: new THREE.Vector3(0.80, -0.80, 0.62) },
        switchSound: 'c-sochong'
    },
    {
        id: 1, name: "TACTICAL PISTOL",
        type: 'PISTOL', maxAmmo: 10, ammo: 10, automatic: false,
        posHip: new THREE.Vector3(0.08, -0.2, -0.45),
        glbHip: {
            pos: new THREE.Vector3(-0.02, 0.02, 0.09),
            rot: new THREE.Vector3(0.04, 1.61, 0.05),
            scale: new THREE.Vector3(0.20, 0.20, 0.20)
        },
        glbAds: {
            pos: new THREE.Vector3(0.00, -0.09, 0.07),
            rot: new THREE.Vector3(-0.04, 1.57, 0.06),
            scale: new THREE.Vector3(0.17, 0.17, 0.17)
        },
        posAds: new THREE.Vector3(0, -0.048, -0.35),
        fovAds: 55, fireRate: 0.15, recoil: 0.1, damage: 20,
        muzzleHip: new THREE.Vector3(-0.066, 0.190, -0.199),
        muzzleAds: new THREE.Vector3(0.01, 0.01, -0.20),
        switchSound: 'c-gun'
    },
    {
        id: 2, name: "TAC-50 SNIPER",
        type: 'SNIPER', maxAmmo: 4, ammo: 4, automatic: false,
        posHip: new THREE.Vector3(0.08, -0.3, -0.5),
        glbHip: {
            pos: new THREE.Vector3(0.19, -0.11, 0.17),
            rot: new THREE.Vector3(0.45, 1.59, -0.39),
            scale: new THREE.Vector3(0.64, 0.64, 0.64)
        },
        glbAds: {
            pos: new THREE.Vector3(0, -0.15, 0.2),
            rot: new THREE.Vector3(0, 3.14, 0),
            scale: new THREE.Vector3(0.2, 0.2, 0.2)
        },
        posAds: new THREE.Vector3(0, -0.06, -0.15),
        fovAds: 8, fireRate: 1.5, recoil: 0.4, damage: 100,
        muzzleHip: new THREE.Vector3(0.0, 0.28, -2.5),
        muzzleAds: new THREE.Vector3(0, 0.035, -0.85),
        lArmHip: { pos: new THREE.Vector3(0.01, -0.24, -0.60), rot: new THREE.Vector3(0.72, -0.76, -0.02) },
        lArmAds: { pos: new THREE.Vector3(-0.15, -0.25, -0.6), rot: new THREE.Vector3(0.7, 0.3, -0.35) },
        rArmHip: { pos: new THREE.Vector3(0.15, -0.17, 0.08), rot: new THREE.Vector3(-0.02, 0.02, 0.58) },
        rArmAds: { pos: new THREE.Vector3(0.12, -0.28, 0.1), rot: new THREE.Vector3(0.2, -0.2, 0.4) },
        switchSound: 'c-rifle'
    },
    {
        id: 3, name: "KNIFE",
        type: 'KNIFE', maxAmmo: 0, ammo: 0, automatic: true,
        posHip: new THREE.Vector3(0.25, -0.25, -0.5),
        posAds: new THREE.Vector3(0.25, -0.25, -0.45),
        glbHip: {
            pos: new THREE.Vector3(-0.47, 0.11, -0.31),
            rot: new THREE.Vector3(1.16, 1.18, -0.10),
            scale: new THREE.Vector3(2.70, 2.70, 2.70)
        },
        lArmHip: { pos: new THREE.Vector3(-1.63, -0.14, -0.11), rot: new THREE.Vector3(0.56, -0.56, -1.98) },
        rArmHip: { pos: new THREE.Vector3(0.02, 0.02, -0.15), rot: new THREE.Vector3(0.18, 0.36, 3.14) },
        fovAds: 65, fireRate: 0.4, recoil: 0, damage: 15,
        switchSound: 'c-sword'
    },
    {
        id: 4, name: "GRENADE",
        type: 'GRENADE', maxAmmo: 3, ammo: 3, automatic: false,
        posHip: new THREE.Vector3(0.05, -0.2, -0.3),
        posAds: new THREE.Vector3(0.1, -0.2, -0.3),
        fovAds: 70, fireRate: 1.5, recoil: 0, damage: 100,
        switchSound: 'grenade_switch'
    }
];

export const CONFIG = {
    PLAYER_HEIGHT: 1.6,
    PLAYER_SPEED: 0.38, // 0.19 * 2
    PLAYER_JUMP_FORCE: 0.15,
    GRAVITY: 0.006,
    MOUSE_SENSITIVITY: 0.002
};

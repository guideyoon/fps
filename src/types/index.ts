import * as THREE from 'three';

export interface TransformData {
    pos: THREE.Vector3;
    rot: THREE.Vector3; // Euler angles in Vector3 for config simplicity
    scale?: THREE.Vector3;
}

export interface Weapon {
    id: number;
    name: string;
    type: 'RIFLE' | 'PISTOL' | 'SNIPER' | 'KNIFE' | 'GRENADE';
    maxAmmo: number;
    ammo: number;
    automatic: boolean;
    posHip: THREE.Vector3;
    posAds: THREE.Vector3;
    rotAds?: THREE.Vector3;
    glbHip?: TransformData;
    glbAds?: TransformData;
    fovAds: number;
    fireRate: number;
    recoil: number;
    damage: number;
    muzzleHip?: THREE.Vector3;
    muzzleAds?: THREE.Vector3;
    lArmHip?: TransformData;
    lArmAds?: TransformData;
    rArmHip?: TransformData;
    rArmAds?: TransformData;
    switchSound?: string;
}

export interface PlayerState {
    id: string;
    position: THREE.Vector3;
    rotation: { x: number, y: number };
    hp: number;
    weaponIdx: number;
    name: string;
}

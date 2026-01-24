import * as THREE from 'three';
import { PlayerState } from '../types';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Network } from '../systems/Network';

const loader = new GLTFLoader();

export class RemotePlayer {
    id: string;
    mesh: THREE.Group;

    constructor(scene: THREE.Scene, state: PlayerState) {
        this.id = state.id;
        this.mesh = new THREE.Group();
        scene.add(this.mesh);

        // Load Actual Model
        loader.load('/char/cr.glb', (gltf) => {
            const model = gltf.scene;

            // Fix orientation/scale if needed
            model.rotation.y = Math.PI; // Often GLBs face away
            model.position.y = 0; // Adjust based on model's origin

            this.mesh.add(model);

            // Auto-detect head mesh for headshot detection
            model.traverse((child: any) => {
                if (child.isMesh && child.name.toLowerCase().includes('head')) {
                    child.userData.isHead = true;
                }
            });

            // Add hit info to the mesh
            this.mesh.userData = {
                hp: 100,
                armor: 100, // Initial armor
                playerId: state.id,
                onHit: (dmg: number) => {
                    Network.sendDamage(state.id, dmg);
                }
            };
        }, undefined, (err) => {
            console.error("RemotePlayer Load Error:", err);
            // Fallback
            const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const body = new THREE.Mesh(geometry, material);
            body.position.y = 0.9;
            this.mesh.add(body);
        });

        this.update(state);
    }

    update(state: PlayerState) {
        this.mesh.position.set(state.position.x, state.position.y, state.position.z);
        this.mesh.rotation.y = state.rotation.y;
    }

    remove(scene: THREE.Scene) {
        scene.remove(this.mesh);
    }
}

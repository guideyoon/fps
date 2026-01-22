import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';

export class Physics {
    worldOctree: Octree;
    playerCollider: Capsule;

    // Config
    GRAVITY = 30;
    STEPS_PER_FRAME = 5;

    constructor() {
        this.worldOctree = new Octree();
        this.playerCollider = new Capsule(
            new THREE.Vector3(0, 0.35, 0),
            new THREE.Vector3(0, 1.45, 0), // Height ~1.8m (1.45 - 0.35 + 2*radius)
            0.35
        );
    }

    loadLevel(scene: THREE.Object3D) {
        this.worldOctree.fromGraphNode(scene);
    }

    updatePlayer(dt: number, playerVelocity: THREE.Vector3, onGround: boolean) {
        let damping = Math.exp(-4 * dt) - 1;

        if (!onGround) {
            playerVelocity.y -= this.GRAVITY * dt;
            damping *= 0.1; // Less air resistance
        }

        playerVelocity.addScaledVector(playerVelocity, damping);

        const deltaPosition = playerVelocity.clone().multiplyScalar(dt);
        this.playerCollider.translate(deltaPosition);

        return this.playerCollisions(playerVelocity);
    }

    playerCollisions(velocity: THREE.Vector3): boolean {
        const result = this.worldOctree.capsuleIntersect(this.playerCollider);
        let onGround = false;

        if (result) {
            onGround = result.normal.y > 0;
            if (!onGround) {
                velocity.addScaledVector(result.normal, -result.normal.dot(velocity));
            } else {
                velocity.y = 0; // Stop falling
            }
            this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
        return onGround;
    }
}

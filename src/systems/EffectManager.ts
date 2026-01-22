import * as THREE from 'three';

export class EffectManager {
    static scene: THREE.Scene;
    static particles: Array<{
        mesh: THREE.Points;
        life: number;
        velocity: THREE.Vector3[];
        fadeStart: number;
    }> = [];
    static decals: Array<{
        mesh: THREE.Mesh;
        life: number;
    }> = [];

    static init(scene: THREE.Scene) {
        this.scene = scene;
    }

    static createBlood(point: THREE.Vector3, normal: THREE.Vector3) {
        this.createParticles(point, normal, 0x880000, 20, 0.1, 1.0);
    }

    static createDust(point: THREE.Vector3, normal: THREE.Vector3) {
        this.createParticles(point, normal, 0xaaaaaa, 10, 0.08, 0.5);
    }

    private static createParticles(point: THREE.Vector3, normal: THREE.Vector3, color: number, count: number, size: number, life: number) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;

            const v = normal.clone().multiplyScalar(1.5 + Math.random() * 2);
            v.x += (Math.random() - 0.5) * 2;
            v.y += (Math.random() - 0.5) * 2;
            v.z += (Math.random() - 0.5) * 2;
            velocities.push(v);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: 1.0
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.particles.push({
            mesh: points,
            life: life,
            velocity: velocities,
            fadeStart: life * 0.5
        });
    }

    static createDecal(point: THREE.Vector3, normal: THREE.Vector3) {
        const size = 0.08;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4
        });

        const decal = new THREE.Mesh(geometry, material);
        decal.position.copy(point).add(normal.clone().multiplyScalar(0.01));
        decal.lookAt(point.clone().add(normal));

        this.scene.add(decal);
        this.decals.push({ mesh: decal, life: 15.0 });
    }

    static update(dt: number) {
        // Particles Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                (p.mesh.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
                continue;
            }

            const positions = p.mesh.geometry.attributes.position.array as Float32Array;
            for (let j = 0; j < p.velocity.length; j++) {
                const v = p.velocity[j];
                v.y -= 9.8 * dt * 0.5; // Gravity
                positions[j * 3] += v.x * dt;
                positions[j * 3 + 1] += v.y * dt;
                positions[j * 3 + 2] += v.z * dt;
            }
            p.mesh.geometry.attributes.position.needsUpdate = true;

            if (p.life < p.fadeStart) {
                (p.mesh.material as THREE.PointsMaterial).opacity = p.life / p.fadeStart;
            }
        }

        // Decals Update
        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            d.life -= dt;
            if (d.life < 2.0) {
                (d.mesh.material as THREE.Material).opacity = d.life / 2.0;
            }
            if (d.life <= 0) {
                this.scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                (d.mesh.material as THREE.Material).dispose();
                this.decals.splice(i, 1);
            }
        }
    }
}

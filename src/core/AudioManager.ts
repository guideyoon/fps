import * as THREE from 'three';

export class AudioManager {
    static listener: THREE.AudioListener;
    static soundMap: Map<string, AudioBuffer> = new Map();
    static masterVolume: number = 0.5;

    static init(camera: THREE.Camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.loadSounds();
    }

    static loadSounds() {
        const audioLoader = new THREE.AudioLoader();
        const sounds = [
            'rifle-shoot', 'pistol-shoot', 'reload', 'empty',
            'walk', 'jump', 'hit', 'death'
        ];

        // Mapping for specific filenames found in original code
        const fileMap: { [key: string]: string } = {
            'rifle-shoot': 'rifle2.MP3',
            'pistol-shoot': 'gunshot.mp3',
            'reload': 'reload1.mp3',
            'c-sochong': 'c-sochong.mp3',
            'c-gun': 'c-gun.mp3',
            'c-rifle': 'c-rifle.mp3', // Sniper switch
            'c-sword': 'c-sword.mp3',
            'grenade_switch': 'grenade.mp3',
            'empty': 'empty.mp3',
            'hit': 'hit.MP3',
            'headshot': 'headshot.mp3'
        };

        // Preload essential sounds
        for (const [key, file] of Object.entries(fileMap)) {
            // Note: In Vite, assets in public/sounds are accessed via /sounds/
            audioLoader.load(`/sounds/${file}`, (buffer) => {
                this.soundMap.set(key, buffer);
            });
        }
    }

    static play(key: string, volume: number = 1.0) {
        if (key === 'step') {
            this.playProceduralStep(volume);
            return;
        }

        if (this.soundMap.has(key)) {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(this.soundMap.get(key)!);
            sound.setVolume(volume * this.masterVolume);
            sound.play();
        }
    }

    static playProceduralStep(volume: number = 1.0) {
        if (!this.listener.context) return;
        const ctx = this.listener.context;
        const bufferSize = ctx.sampleRate * 0.1; // 0.1s
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        const gain = ctx.createGain();
        gain.gain.value = volume * 0.5 * this.masterVolume;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.listener.getInput()); // Connect to listener input
        noise.start();
    }

    static playStep() {
        this.play('step', 0.5);
    }

    static playShoot(type: string) {
        if (type === 'RIFLE') this.play('rifle-shoot', 0.8);
        else if (type === 'PISTOL') this.play('pistol-shoot', 0.8);
        else if (type === 'SNIPER') this.play('rifle-shoot', 1.0); // Reuse rifle for now or specific
    }

    static playReload() {
        this.play('reload', 1.0);
    }

    static playEmpty() {
        this.play('empty', 1.0);
    }

    static playHit() {
        this.play('hit', 1.0);
    }

    static playSwitch(soundName: string) {
        if (soundName) this.play(soundName, 0.5);
    }
}

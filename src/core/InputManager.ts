export class InputManager {
    static keys: { [key: string]: boolean } = {};
    static isLocked: boolean = false;
    static onPointerLockChange: ((isLocked: boolean) => void) | null = null;
    static onSensitivityChange: ((val: number) => void) | null = null;

    // Sensitivity
    static mouseSensitivity: number = 0.002;

    // State
    static mouseDelta = { x: 0, y: 0 };

    static init() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            InputManager.keys[e.code] = true;
            InputManager.keys[e.key] = true; // Fallback
        });

        window.addEventListener('keyup', (e) => {
            InputManager.keys[e.code] = false;
            InputManager.keys[e.key] = false;
        });

        // Mouse Buttons
        window.addEventListener('mousedown', (e) => {
            InputManager.keys[`Mouse${e.button}`] = true;
        });

        window.addEventListener('mouseup', (e) => {
            InputManager.keys[`Mouse${e.button}`] = false;
        });

        // Mouse Movement
        window.addEventListener('mousemove', (e) => {
            if (InputManager.isLocked) {
                InputManager.mouseDelta.x += e.movementX;
                InputManager.mouseDelta.y += e.movementY;
            }
        });

        // Pointer Lock
        document.addEventListener('pointerlockchange', () => {
            InputManager.isLocked = document.pointerLockElement === document.body;
            if (InputManager.onPointerLockChange) {
                InputManager.onPointerLockChange(InputManager.isLocked);
            }
        });

        document.addEventListener('click', () => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (!InputManager.isLocked && !isMobile) {
                const target = document.activeElement;
                const isInput = target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
                if (!isInput) {
                    document.body.requestPointerLock();
                }
            }
        });
    }

    static getAndResetMouseDelta() {
        const delta = { ...InputManager.mouseDelta };
        InputManager.mouseDelta.x = 0;
        InputManager.mouseDelta.y = 0;
        return delta;
    }

    static isKeyPressed(code: string): boolean {
        return !!InputManager.keys[code];
    }
}

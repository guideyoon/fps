import { InputManager } from '../core/InputManager';

export class MobileControls {
    static init() {
        // Porting the joystick logic would go here
        // For now, ensuring we don't crash on mobile setup
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            InputManager.mouseSensitivity = 0.005; // Different sens for touch
        }
    }
}

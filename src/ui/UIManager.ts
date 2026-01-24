export class UIManager {
    // Cache DOM elements
    private static els = {
        hpText: document.getElementById('hud-hp-text'),
        hpBar: document.getElementById('hud-hp-bar'),
        ammoCurrent: document.querySelector('.ammo-current') as HTMLElement,
        ammoReserve: document.querySelector('.ammo-reserve') as HTMLElement,
        weaponSlots: document.querySelectorAll('.weapon-slot'),
        crosshair: document.getElementById('hud-crosshair'),
        damageOverlay: document.querySelector('.damage-vignette') as HTMLElement,
        headshotText: document.getElementById('headshot-msg'),
        hitMarker: document.getElementById('hit-marker'),
        scopeOverlay: document.getElementById('scope-overlay'),
        deathOverlay: document.getElementById('death-overlay'),
        killerName: document.getElementById('killer-name'),
        respawnTimer: document.getElementById('respawn-timer'),
        manualRespawnBtn: document.getElementById('manual-respawn-btn'),
        chatInput: document.getElementById('chat-input') as HTMLInputElement,
        chatContainer: document.getElementById('chat-container'),
        chatMessages: document.getElementById('chat-messages'),
        killStreak: document.getElementById('kill-streak-overlay')
    };

    static showDeathUI(killerName: string) {
        if (this.els.deathOverlay) this.els.deathOverlay.style.display = 'flex';
        if (this.els.killerName) this.els.killerName.innerText = killerName;
        if (this.els.manualRespawnBtn) this.els.manualRespawnBtn.style.display = 'none';
        this.updateRespawnTimer(3);
    }

    static hideDeathUI() {
        if (this.els.deathOverlay) this.els.deathOverlay.style.display = 'none';
    }

    static updateRespawnTimer(seconds: number) {
        if (this.els.respawnTimer) this.els.respawnTimer.innerText = seconds.toString();
        if (seconds <= 0 && this.els.manualRespawnBtn) {
            this.els.manualRespawnBtn.style.display = 'block';
        }
    }

    static updateHealth(hp: number) {
        if (this.els.hpText) this.els.hpText.innerText = Math.max(0, Math.floor(hp)).toString();
        if (this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, hp)}%`;

        // Color changes based on HP
        if (this.els.hpBar) {
            if (hp > 50) this.els.hpBar.style.backgroundColor = 'var(--neon-cyan)';
            else if (hp > 20) this.els.hpBar.style.backgroundColor = '#ff9800';
            else this.els.hpBar.style.backgroundColor = '#f44336';
        }
    }

    static updateArmor(armor: number) {
        // Placeholder for armor HUD update if added to index.html
        const armorBar = document.getElementById('hud-armor-bar');
        if (armorBar) armorBar.style.width = `${Math.max(0, armor)}%`;
    }

    static updateAmmo(current: number, max: number) {
        if (this.els.ammoCurrent) this.els.ammoCurrent.innerText = current.toString();
        if (this.els.ammoReserve) this.els.ammoReserve.innerText = `/ ${max}`;
    }

    static updateWeaponSlots(activeIdx: number) {
        this.els.weaponSlots.forEach((slot, idx) => {
            if (idx === activeIdx) slot.classList.add('active');
            else slot.classList.remove('active');
        });
    }

    static showDamageEffect() {
        if (this.els.damageOverlay) {
            this.els.damageOverlay.style.opacity = '1';
            setTimeout(() => {
                if (this.els.damageOverlay) this.els.damageOverlay.style.opacity = '0';
            }, 300);
        }
    }

    static showHitMarker(isHeadshot: boolean = false) {
        if (this.els.hitMarker) {
            if (isHeadshot) {
                this.els.hitMarker.classList.add('headshot');
                this.showHeadshotUI();
            } else {
                this.els.hitMarker.classList.remove('headshot');
            }

            this.els.hitMarker.style.opacity = '1';
            this.els.hitMarker.style.transform = `translate(-50%, -50%) scale(${isHeadshot ? 1.8 : 1.2})`;

            setTimeout(() => {
                if (this.els.hitMarker) {
                    this.els.hitMarker.style.opacity = '0';
                    this.els.hitMarker.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            }, 150);
        }
    }

    static showKillStreak(text: string) {
        if (this.els.killStreak) {
            this.els.killStreak.innerText = text;
            this.els.killStreak.classList.add('show');
            setTimeout(() => {
                if (this.els.killStreak) this.els.killStreak.classList.remove('show');
            }, 2000);
        }
    }

    private static showHeadshotUI() {
        if (this.els.headshotText) {
            this.els.headshotText.classList.add('active');
            setTimeout(() => {
                if (this.els.headshotText) this.els.headshotText.classList.remove('active');
            }, 800);
        }
    }

    static toggleScope(enabled: boolean) {
        if (this.els.scopeOverlay) {
            this.els.scopeOverlay.style.display = enabled ? 'block' : 'none';
        }
    }

    static addChatMessage(sender: string, message: string, isSystem: boolean = false) {
        if (!this.els.chatMessages) return;

        const div = document.createElement('div');
        div.className = 'chat-msg' + (isSystem ? ' system' : '');
        div.innerHTML = `<span class="sender">${sender}:</span> ${message}`;
        this.els.chatMessages.appendChild(div);
        this.els.chatMessages.scrollTop = this.els.chatMessages.scrollHeight;
    }

    static updateDynamicUI() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;

        // Apply orientation specific adjustments via JS if CSS is not enough
        const weaponSelector = document.getElementById('weapon-selector-vertical');
        const joystickZone = document.getElementById('joystick-zone');
        const chatContainer = document.getElementById('chat-container');

        if (isMobile) {
            if (isLandscape) {
                if (weaponSelector) weaponSelector.style.display = 'flex';
                if (joystickZone) joystickZone.style.display = 'block';
                if (chatContainer) chatContainer.style.display = 'none'; // Hide chat in landscape mobile
            } else {
                if (weaponSelector) weaponSelector.style.display = 'none';
                if (joystickZone) joystickZone.style.display = 'block';
                if (chatContainer) chatContainer.style.display = 'block';
            }
        } else {
            // PC
            if (weaponSelector) weaponSelector.style.display = 'none';
            if (joystickZone) joystickZone.style.display = 'none';
        }
    }

    static init() {
        window.addEventListener('resize', () => this.updateDynamicUI());
        window.addEventListener('orientationchange', () => setTimeout(() => this.updateDynamicUI(), 100));
        this.updateDynamicUI();
    }
}

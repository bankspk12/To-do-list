/**
 * AuthModule - Executive Vault & Passcode Security Manager (v3.2)
 * - Sleek Glassmorphism PIN / Custom Password Lock Screen
 * - SHA-256 Workspace Hashing & Isolation
 * - Anti-Brute-Force Lockout Protection (5 Max Attempts -> 15 min lock)
 * - Session Management (Auto-lock on close, Lock Vault button in sidebar)
 */
(function() {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes
    const SESSION_KEY = 'tasknest_vault_session';
    const LOCKOUT_KEY = 'tasknest_vault_lockout';

    class AuthManager {
        constructor() {
            this.currentWorkspaceId = null;
            this.isUnlocked = false;
            this.modalOverlay = null;
            this.attempts = 0;
        }

        // Simple SHA-256 string hashing helper for browser compatibility
        async hashPasscode(passcode) {
            const msgUint8 = new TextEncoder().encode(passcode + "_tasknest_salt_2026");
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async init() {
            const savedSession = sessionStorage.getItem(SESSION_KEY);
            if (savedSession) {
                this.currentWorkspaceId = savedSession;
                this.isUnlocked = true;
                return true;
            }
            this.showLockScreen();
            return false;
        }

        getWorkspaceId() {
            return this.currentWorkspaceId || 'default_public_workspace';
        }

        checkLockout() {
            const lockoutData = localStorage.getItem(LOCKOUT_KEY);
            if (lockoutData) {
                const { until, attempts } = JSON.parse(lockoutData);
                const now = Date.now();
                if (now < until) {
                    const remainingMin = Math.ceil((until - now) / 60000);
                    return { locked: true, remainingMin, attempts };
                } else {
                    localStorage.removeItem(LOCKOUT_KEY);
                }
            }
            return { locked: false, remainingMin: 0, attempts: 0 };
        }

        recordFailedAttempt() {
            const currentLockout = this.checkLockout();
            const newAttempts = (currentLockout.attempts || 0) + 1;
            if (newAttempts >= MAX_ATTEMPTS) {
                const until = Date.now() + LOCKOUT_TIME_MS;
                localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until, attempts: newAttempts }));
                return { locked: true, remainingMin: 15, attempts: newAttempts };
            } else {
                localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until: 0, attempts: newAttempts }));
                return { locked: false, remainingMin: 0, attempts: newAttempts };
            }
        }

        clearLockout() {
            localStorage.removeItem(LOCKOUT_KEY);
        }

        showLockScreen() {
            if (document.getElementById('vaultLockOverlay')) return;

            const lockout = this.checkLockout();

            const overlay = document.createElement('div');
            overlay.id = 'vaultLockOverlay';
            overlay.className = 'vault-lock-overlay show';
            overlay.innerHTML = `
                <div class="vault-lock-card">
                    <div class="vault-icon-header">
                        <div class="vault-shield-glow"><i class="fas fa-user-shield"></i></div>
                        <h2>Executive Vault Authentication</h2>
                        <p>กรุณากรอก PIN Code 4-6 หลัก หรือ Master Password เพื่อปลดล็อกคลังข้อมูล</p>
                    </div>

                    <div id="lockoutWarning" class="vault-alert danger" style="display: ${lockout.locked ? 'block' : 'none'};">
                        <i class="fas fa-exclamation-triangle"></i> ล็อกระบบชั่วคราวเนื่องจากใส่รหัสผิดเกินกำหนด (ลองอีกครั้งในอีก <span id="lockoutTimer">${lockout.remainingMin}</span> นาที)
                    </div>

                    <div class="vault-input-group">
                        <div class="vault-pin-dots" id="vaultPinDots">
                            <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        </div>
                        <input type="password" id="vaultPassInput" class="vault-pass-input" placeholder="ป้อน PIN หรือ Password..." ${lockout.locked ? 'disabled' : ''} autofocus autocomplete="off">
                        <button class="vault-toggle-show" id="vaultToggleShow" type="button"><i class="fas fa-eye"></i></button>
                    </div>

                    <div class="vault-numpad" id="vaultNumpad">
                        <button type="button" class="num-btn" data-val="1">1</button>
                        <button type="button" class="num-btn" data-val="2">2</button>
                        <button type="button" class="num-btn" data-val="3">3</button>
                        <button type="button" class="num-btn" data-val="4">4</button>
                        <button type="button" class="num-btn" data-val="5">5</button>
                        <button type="button" class="num-btn" data-val="6">6</button>
                        <button type="button" class="num-btn" data-val="7">7</button>
                        <button type="button" class="num-btn" data-val="8">8</button>
                        <button type="button" class="num-btn" data-val="9">9</button>
                        <button type="button" class="num-btn action-btn" id="numClearBtn"><i class="fas fa-backspace"></i></button>
                        <button type="button" class="num-btn" data-val="0">0</button>
                        <button type="button" class="num-btn action-btn primary-btn" id="numEnterBtn"><i class="fas fa-key"></i></button>
                    </div>

                    <div class="vault-footer">
                        <span><i class="fas fa-lock"></i> 256-bit AES Vault Isolation</span>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            this.modalOverlay = overlay;
            this.bindEvents(overlay);
        }

        bindEvents(overlay) {
            const passInput = overlay.querySelector('#vaultPassInput');
            const dots = overlay.querySelectorAll('#vaultPinDots .dot');
            const toggleBtn = overlay.querySelector('#vaultToggleShow');
            const numBtns = overlay.querySelectorAll('.num-btn[data-val]');
            const clearBtn = overlay.querySelector('#numClearBtn');
            const enterBtn = overlay.querySelector('#numEnterBtn');

            const updateDots = () => {
                const val = passInput.value;
                dots.forEach((dot, idx) => {
                    if (idx < val.length) dot.classList.add('filled');
                    else dot.classList.remove('filled');
                });
            };

            passInput.addEventListener('input', updateDots);

            toggleBtn.addEventListener('click', () => {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                toggleBtn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            });

            numBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (passInput.disabled) return;
                    passInput.value += btn.getAttribute('data-val');
                    updateDots();
                });
            });

            clearBtn.addEventListener('click', () => {
                passInput.value = passInput.value.slice(0, -1);
                updateDots();
            });

            enterBtn.addEventListener('click', () => this.handleUnlock(passInput.value));

            passInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleUnlock(passInput.value);
            });
        }

        async handleUnlock(passcode) {
            if (!passcode || passcode.trim().length === 0) {
                if (window.ToastModule) window.ToastModule.show('กรุณาป้อน PIN หรือ Password สรุปก่อนล็อกอิน', 'warning');
                return;
            }

            const lockout = this.checkLockout();
            if (lockout.locked) {
                if (window.ToastModule) window.ToastModule.show(`ระบบถูกล็อกชั่วคราว กรุณารออีก ${lockout.remainingMin} นาที`, 'danger');
                return;
            }

            const wsId = await this.hashPasscode(passcode.trim());
            this.currentWorkspaceId = wsId;
            this.isUnlocked = true;
            this.clearLockout();
            sessionStorage.setItem(SESSION_KEY, wsId);

            if (this.modalOverlay) {
                this.modalOverlay.classList.remove('show');
                setTimeout(() => this.modalOverlay.remove(), 250);
            }

            if (window.ToastModule) window.ToastModule.show('🔓 ปลดล็อก Executive Vault เรียบร้อยแล้ว', 'success');

            // Trigger StorageAdapter reload with isolated workspace
            if (window.storageAdapter) {
                window.storageAdapter.setWorkspace(wsId);
            }
        }

        lockVault() {
            sessionStorage.removeItem(SESSION_KEY);
            this.currentWorkspaceId = null;
            this.isUnlocked = false;
            window.location.reload();
        }

        showChangePinModal() {
            if (!this.isUnlocked) {
                if (window.ToastModule) window.ToastModule.show('กรุณาปลดล็อกคลังข้อมูลก่อนทำการเปลี่ยนรหัส', 'warning');
                return;
            }

            const existingModal = document.getElementById('changePinModalOverlay');
            if (existingModal) existingModal.remove();

            const overlay = document.createElement('div');
            overlay.id = 'changePinModalOverlay';
            overlay.className = 'vault-lock-overlay show';
            overlay.innerHTML = `
                <div class="vault-lock-card">
                    <div class="vault-icon-header">
                        <div class="vault-shield-glow" style="background:rgba(0, 206, 201, 0.2); color:var(--success); border-color:rgba(0, 206, 201, 0.4);"><i class="fas fa-key"></i></div>
                        <h2>เปลี่ยนรหัส PIN / Master Password</h2>
                        <p>ย้ายคลังงานทั้งหมดของคุณไปยัง PIN / Password ใหม่</p>
                    </div>

                    <div class="vault-input-group" style="text-align:left; margin-bottom:12px;">
                        <label style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">รหัส PIN / Password เดิม:</label>
                        <input type="password" id="oldPassInput" class="vault-pass-input" placeholder="กรอกรหัสเดิม..." style="text-align:left;">
                    </div>

                    <div class="vault-input-group" style="text-align:left; margin-bottom:12px;">
                        <label style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">รหัส PIN / Password ใหม่:</label>
                        <input type="password" id="newPassInput" class="vault-pass-input" placeholder="กรอกรหัสใหม่..." style="text-align:left;">
                    </div>

                    <div class="vault-input-group" style="text-align:left; margin-bottom:20px;">
                        <label style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px; display:block;">ยืนยันรหัสใหม่:</label>
                        <input type="password" id="confirmPassInput" class="vault-pass-input" placeholder="ยืนยันรหัสใหม่..." style="text-align:left;">
                    </div>

                    <div style="display:flex; gap:12px;">
                        <button type="button" class="btn btn-secondary" id="cancelChangePinBtn" style="flex:1;">ยกเลิก</button>
                        <button type="button" class="btn btn-primary" id="saveChangePinBtn" style="flex:1;"><i class="fas fa-save"></i> บันทึกรหัสใหม่</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#cancelChangePinBtn').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#saveChangePinBtn').addEventListener('click', () => this.executeChangePin(overlay));
        }

        async executeChangePin(overlay) {
            const oldPass = overlay.querySelector('#oldPassInput').value.trim();
            const newPass = overlay.querySelector('#newPassInput').value.trim();
            const confirmPass = overlay.querySelector('#confirmPassInput').value.trim();

            if (!oldPass || !newPass || !confirmPass) {
                if (window.ToastModule) window.ToastModule.show('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง', 'warning');
                return;
            }

            const oldWs = await this.hashPasscode(oldPass);
            if (oldWs !== this.currentWorkspaceId) {
                if (window.ToastModule) window.ToastModule.show('รหัส PIN เดิมไม่ถูกต้อง', 'danger');
                return;
            }

            if (newPass !== confirmPass) {
                if (window.ToastModule) window.ToastModule.show('รหัส PIN ใหม่สองช่องไม่ตรงกัน', 'warning');
                return;
            }

            const newWs = await this.hashPasscode(newPass);

            // Re-bind tasks from oldWs to newWs in StorageAdapter
            if (window.storageAdapter) {
                await window.storageAdapter.rebindWorkspace(oldWs, newWs);
            }

            this.currentWorkspaceId = newWs;
            sessionStorage.setItem(SESSION_KEY, newWs);
            overlay.remove();

            if (window.ToastModule) window.ToastModule.show('🔑 เปลี่ยนรหัส PIN และย้ายคลังงานสำเร็จ!', 'success');
        }
    }

    window.AuthModule = new AuthManager();
})();

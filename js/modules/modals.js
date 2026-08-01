/**
 * Modals Module - Edit Task & Quick Inbox (Ctrl+K) with Smart Date Detection
 */
window.ModalsModule = (function() {
    let editingTaskId = null;

    function init() {
        createEditModal();
        createQuickInboxModal();
        setupGlobalShortcuts();
    }

    // --- Edit Task Modal ---
    function createEditModal() {
        if (document.getElementById('editModal')) return;
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ แก้ไขงาน</h3>
                    <button class="modal-close" id="closeModal">&times;</button>
                </div>
                <div class="modal-body">
                    <label>ชื่องาน</label>
                    <input type="text" id="editText">
                    <label>หมวดหมู่ / Project</label>
                    <select id="editCategory">
                        <option value="งาน">🏢 งาน</option>
                        <option value="ส่วนตัว">👤 ส่วนตัว</option>
                        <option value="การเรียน">📚 การบ้าน</option>
                        <option value="อื่นๆ">📌 อื่นๆ</option>
                    </select>
                    <label>วันครบกำหนด</label>
                    <input type="date" id="editDueDate">
                    <label>เวลาประมาณการ (ชั่วโมง)</label>
                    <input type="number" id="editEstHours" min="0" step="0.5" placeholder="ชม.">
                    <label>ความสำคัญ</label>
                    <select id="editPriority">
                        <option value="high">🔴 P0 - สำคัญด่วน</option>
                        <option value="medium">🟡 P1 - ปานกลาง</option>
                        <option value="low">🟢 P2 - ทั่วไป</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button id="cancelEdit" class="modal-btn-cancel">ยกเลิก</button>
                    <button id="saveEdit" class="modal-btn-save">💾 บันทึก</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('closeModal').addEventListener('click', closeEditModal);
        document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
        document.getElementById('saveEdit').addEventListener('click', saveEditTask);
        modal.addEventListener('click', e => { if (e.target === modal) closeEditModal(); });
    }

    async function openEdit(task) {
        if (!task) return;
        editingTaskId = task.id;
        document.getElementById('editText').value = task.text || '';
        document.getElementById('editCategory').value = task.category || 'งาน';
        document.getElementById('editDueDate').value = task.dueDate || '';
        document.getElementById('editEstHours').value = task.estHours || '';
        document.getElementById('editPriority').value = task.priority || 'medium';
        document.getElementById('editModal').classList.add('show');
    }

    function closeEditModal() {
        editingTaskId = null;
        const m = document.getElementById('editModal');
        if (m) m.classList.remove('show');
    }

    async function saveEditTask() {
        if (!editingTaskId || !window.storageAdapter) return;
        const updates = {
            text: document.getElementById('editText').value.trim(),
            category: document.getElementById('editCategory').value,
            dueDate: document.getElementById('editDueDate').value,
            estHours: parseFloat(document.getElementById('editEstHours').value) || 0,
            priority: document.getElementById('editPriority').value
        };

        if (updates.text) {
            await window.storageAdapter.updateTask(editingTaskId, updates);
            if (window.ToastModule) window.ToastModule.show('💾 อัปเดตงานเรียบร้อยแล้ว');
        }
        closeEditModal();
    }

    // --- Quick Dump Inbox Modal ---
    function createQuickInboxModal() {
        if (document.getElementById('quickInboxOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'quickInboxOverlay';
        overlay.className = 'quick-inbox-overlay';
        overlay.innerHTML = `
            <div class="quick-inbox-modal">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>⚡ จดด่วนลง Quick Inbox</h3>
                    <span style="font-size:0.8rem;color:var(--text-muted);">กด Esc เพื่อปิด</span>
                </div>
                <div class="quick-inbox-input-wrapper">
                    <input type="text" id="quickInboxInput" class="quick-inbox-input" placeholder="พิมพ์งานที่ต้องทำ หรือเรื่องที่คิดออกแทรกเข้ามาที่นี่...">
                    <button class="btn btn-primary" id="saveQuickInboxBtn">บันทึกด่วน</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('saveQuickInboxBtn').addEventListener('click', saveQuickInboxTask);
        document.getElementById('quickInboxInput').addEventListener('keypress', e => {
            if (e.key === 'Enter') saveQuickInboxTask();
        });
        overlay.addEventListener('click', e => { if (e.target === overlay) closeQuickInbox(); });
    }

    function openQuickInbox() {
        const overlay = document.getElementById('quickInboxOverlay');
        const input = document.getElementById('quickInboxInput');
        if (overlay) {
            overlay.classList.add('show');
            if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
        }
    }

    function closeQuickInbox() {
        const overlay = document.getElementById('quickInboxOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    async function saveQuickInboxTask() {
        const input = document.getElementById('quickInboxInput');
        const text = input ? input.value.trim() : '';
        if (!text || !window.storageAdapter) return;

        // Smart date auto-detection
        let dueDate = '';
        let smartHint = '';
        if (window.SmartDateParser) {
            const parsed = window.SmartDateParser.parse(text);
            if (parsed) {
                dueDate = parsed.date;
                smartHint = parsed.label;
            }
        }

        const newTask = {
            id: Date.now().toString(),
            text,
            category: 'งาน',
            dueDate,
            estHours: 1,
            priority: 'medium',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await window.storageAdapter.addTask(newTask);
        closeQuickInbox();
        const msg = smartHint
            ? `⚡ บันทึกเรียบร้อย! 📅 ${smartHint} (${dueDate})`
            : '⚡ บันทึกงานลง Inbox เรียบร้อยแล้ว!';
        if (window.ToastModule) window.ToastModule.show(msg);
    }

    function setupGlobalShortcuts() {
        window.addEventListener('keydown', (e) => {
            const isKKey = e.key.toLowerCase() === 'k' || e.keyCode === 75;
            if ((e.ctrlKey || e.metaKey || e.altKey) && isKKey) {
                e.preventDefault();
                e.stopPropagation();
                openQuickInbox();
            }
            if (e.key === 'Escape') {
                closeQuickInbox();
                closeEditModal();
            }
        }, true);
    }

    return { init, openEdit, openQuickInbox };
})();

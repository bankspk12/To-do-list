/**
 * Todo App - Main Logic
 * Features: CRUD, Search, Edit, Drag&Drop, Progress, Calendar, Due Date Alerts
 */

(function () {
    // ============================================================
    // State
    // ============================================================
    const STATE = {
        tasks: [],
        filter: 'all',
        search: '',
        theme: 'dark',
        currentView: 'list',
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        editingId: null,
        draggedId: null,
        refreshInterval: null,
        charts: { status: null, category: null }
    };

    const THAI_MONTHS = [
        'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
    ];

    // ============================================================
    // DOM Cache
    // ============================================================
    const DOM = {
        sidebarContainer: document.getElementById('sidebar-container'),
        mainContent: document.getElementById('mainContent'),
        taskList: document.getElementById('taskList'),
        taskInput: document.getElementById('taskInput'),
        taskCategory: document.getElementById('taskCategory'),
        taskDueDate: document.getElementById('taskDueDate'),
        taskPriority: document.getElementById('taskPriority'),
        addTaskBtn: document.getElementById('addTaskBtn'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        progressText: document.getElementById('progressText'),
        progressPercent: document.getElementById('progressPercent'),
        progressFill: document.getElementById('progressFill'),
        listViewBtn: document.getElementById('listViewBtn'),
        calendarViewBtn: document.getElementById('calendarViewBtn'),
        calendarView: document.getElementById('calendarView'),
        calMonthYear: document.getElementById('calMonthYear'),
        calDays: document.getElementById('calDays'),
        calPrev: document.getElementById('calPrev'),
        calNext: document.getElementById('calNext'),
        calToday: document.getElementById('calToday'),
        // Dashboard
        totalTasks: document.getElementById('totalTasks'),
        completedTasks: document.getElementById('completedTasks'),
        pendingTasks: document.getElementById('pendingTasks'),
        completionRate: document.getElementById('completionRate'),
        statusChartCanvas: document.getElementById('statusChart'),
        categoryChartCanvas: document.getElementById('categoryChart')
    };

    // ============================================================
    // Init
    // ============================================================
    function init() {
        loadState();
        initTheme();
        loadSidebar().then(() => { setupSidebarEvents(); highlightActiveNav(); });

        if (isDashboard()) initDashboard();
        else if (isTaskPage()) initTaskPage();

        startAutoRefresh();
        createEditModal();
    }

    function isDashboard() { return !!DOM.statusChartCanvas; }
    function isTaskPage() { return !!DOM.taskList; }

    // ============================================================
    // State Persistence
    // ============================================================
    function loadState() {
        try {
            STATE.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            STATE.theme = localStorage.getItem('theme') || 'dark';
        } catch (e) { STATE.tasks = []; }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(STATE.tasks));
        refreshUI();
    }

    function refreshUI() {
        if (isDashboard()) { updateStats(); updateCharts(); }
        else if (isTaskPage()) { renderTasks(); updateProgress(); renderCalendar(); }
    }

    // ============================================================
    // Sidebar & Nav
    // ============================================================
    async function loadSidebar() {
        try {
            const res = await fetch('components/sidebar.html');
            const html = await res.text();
            if (DOM.sidebarContainer) DOM.sidebarContainer.innerHTML = html;
        } catch (e) { console.error('Sidebar load failed:', e); }
    }

    function setupSidebarEvents() {
        const el = (id) => document.getElementById(id);
        const on = (id, fn) => { const e = el(id); if (e) e.addEventListener('click', fn); };
        on('toggleSidebarBtn', toggleSidebar);
        on('themeToggleBtn', toggleTheme);
        on('exportPdfBtn', exportToPDF);
        on('exportExcelBtn', exportToExcel);
    }

    function highlightActiveNav() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const path = window.location.href.toLowerCase();
        const navId = path.includes('tasks') ? 'nav-tasks' : 'nav-dashboard';
        const el = document.getElementById(navId);
        if (el) el.classList.add('active');
    }

    function toggleSidebar() {
        const s = document.getElementById('sidebar');
        if (s) s.classList.toggle('collapsed');
        if (DOM.mainContent) DOM.mainContent.classList.toggle('expanded');
    }

    // ============================================================
    // Theme
    // ============================================================
    function initTheme() {
        document.documentElement.setAttribute('data-theme', STATE.theme);
        updateThemeIcon();
    }

    function toggleTheme() {
        STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', STATE.theme);
        document.documentElement.setAttribute('data-theme', STATE.theme);
        updateThemeIcon();
        if (isDashboard()) updateChartsTheme();
    }

    function updateThemeIcon() {
        const i = document.querySelector('.theme-btn i');
        if (i) i.className = STATE.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ============================================================
    // Dashboard
    // ============================================================
    function initDashboard() { updateStats(); initCharts(); }

    function updateStats() {
        if (!DOM.totalTasks) return;
        const t = STATE.tasks.length,
              c = STATE.tasks.filter(x => x.status === 'completed').length;
        DOM.totalTasks.textContent = t;
        DOM.completedTasks.textContent = c;
        DOM.pendingTasks.textContent = t - c;
        DOM.completionRate.textContent = t > 0 ? Math.round((c / t) * 100) + '%' : '0%';
    }

    function getChartColors() {
        const d = STATE.theme === 'dark';
        return { text: d ? '#a0a0cc' : '#5a5a7a', grid: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' };
    }

    function initCharts() {
        if (!window.Chart) return;
        const c = getChartColors();

        STATE.charts.status = new Chart(DOM.statusChartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['เสร็จแล้ว', 'รอดำเนินการ'],
                datasets: [{ data: [0, 0], backgroundColor: ['#00cec9', '#fdcb6e'], borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '70%',
                plugins: {
                    title: { display: true, text: 'สถานะงาน', color: c.text, font: { size: 14, family: 'Inter', weight: '600' } },
                    legend: { position: 'bottom', labels: { color: c.text, font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } }
                }
            }
        });

        STATE.charts.category = new Chart(DOM.categoryChartCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'จำนวนงาน', data: [], backgroundColor: 'rgba(108,92,231,0.7)', borderRadius: 8, borderSkipped: false, barThickness: 32 }] },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    title: { display: true, text: 'งานตามหมวดหมู่', color: c.text, font: { size: 14, family: 'Inter', weight: '600' } },
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { color: c.text }, grid: { color: c.grid } },
                    x: { ticks: { color: c.text }, grid: { display: false } }
                }
            }
        });

        updateCharts();
    }

    function updateCharts() {
        if (!STATE.charts.status) return;
        const comp = STATE.tasks.filter(t => t.status === 'completed').length;
        STATE.charts.status.data.datasets[0].data = [comp, STATE.tasks.length - comp];
        STATE.charts.status.update();
        const cats = {};
        STATE.tasks.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
        STATE.charts.category.data.labels = Object.keys(cats);
        STATE.charts.category.data.datasets[0].data = Object.values(cats);
        STATE.charts.category.update();
    }

    function updateChartsTheme() {
        const c = getChartColors();
        [STATE.charts.status, STATE.charts.category].forEach(ch => {
            if (!ch) return;
            ch.options.plugins.title.color = c.text;
            if (ch.options.plugins.legend) ch.options.plugins.legend.labels.color = c.text;
            if (ch.options.scales) {
                ['x', 'y'].forEach(a => {
                    if (ch.options.scales[a]) {
                        ch.options.scales[a].ticks.color = c.text;
                        if (ch.options.scales[a].grid) ch.options.scales[a].grid.color = c.grid;
                    }
                });
            }
            ch.update();
        });
    }

    // ============================================================
    // Task Page Init
    // ============================================================
    function initTaskPage() {
        renderTasks();
        updateProgress();
        setupFilterEvents();
        setupSearchEvents();
        setupViewToggle();
        setupCalendarNav();

        if (DOM.addTaskBtn) DOM.addTaskBtn.addEventListener('click', addTask);
        if (DOM.taskInput) DOM.taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
    }

    // ============================================================
    // Search
    // ============================================================
    function setupSearchEvents() {
        if (!DOM.searchInput) return;
        DOM.searchInput.addEventListener('input', (e) => {
            STATE.search = e.target.value.trim().toLowerCase();
            if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = STATE.search ? 'block' : 'none';
            renderTasks();
        });
        if (DOM.clearSearchBtn) {
            DOM.clearSearchBtn.addEventListener('click', () => {
                DOM.searchInput.value = '';
                STATE.search = '';
                DOM.clearSearchBtn.style.display = 'none';
                renderTasks();
            });
        }
    }

    // ============================================================
    // Filters
    // ============================================================
    function setupFilterEvents() {
        const btns = document.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', e => {
                btns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                STATE.filter = e.currentTarget.dataset.filter || 'all';
                renderTasks();
            });
        });
    }

    // ============================================================
    // View Toggle (List / Calendar)
    // ============================================================
    function setupViewToggle() {
        if (DOM.listViewBtn) {
            DOM.listViewBtn.addEventListener('click', () => {
                STATE.currentView = 'list';
                DOM.listViewBtn.classList.add('active');
                if (DOM.calendarViewBtn) DOM.calendarViewBtn.classList.remove('active');
                if (DOM.taskList) DOM.taskList.style.display = '';
                if (DOM.calendarView) DOM.calendarView.style.display = 'none';
            });
        }
        if (DOM.calendarViewBtn) {
            DOM.calendarViewBtn.addEventListener('click', () => {
                STATE.currentView = 'calendar';
                DOM.calendarViewBtn.classList.add('active');
                if (DOM.listViewBtn) DOM.listViewBtn.classList.remove('active');
                if (DOM.taskList) DOM.taskList.style.display = 'none';
                if (DOM.calendarView) DOM.calendarView.style.display = '';
                renderCalendar();
            });
        }
    }

    // ============================================================
    // Progress Bar
    // ============================================================
    function updateProgress() {
        if (!DOM.progressFill) return;
        const total = STATE.tasks.length;
        const done = STATE.tasks.filter(t => t.status === 'completed').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        DOM.progressText.textContent = `${done} / ${total} งานเสร็จ`;
        DOM.progressPercent.textContent = `${pct}%`;
        DOM.progressFill.style.width = `${pct}%`;
    }

    // ============================================================
    // Due Date Helpers
    // ============================================================
    function getDueStatus(task) {
        if (!task.dueDate || task.status === 'completed') return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate + 'T00:00:00');
        const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'overdue';
        if (diff === 0) return 'today';
        if (diff <= 3) return 'soon';
        return null;
    }

    function getDueBadge(status) {
        const span = document.createElement('span');
        span.className = 'due-badge';
        if (status === 'overdue') { span.classList.add('overdue'); span.textContent = '⚠️ เลยกำหนด'; }
        else if (status === 'today') { span.classList.add('today'); span.textContent = '📅 วันนี้'; }
        else if (status === 'soon') { span.classList.add('soon'); span.textContent = '🔔 ใกล้ถึง'; }
        return span;
    }

    // ============================================================
    // CRUD
    // ============================================================
    function addTask() {
        const text = DOM.taskInput.value.trim();
        if (!text) return;
        STATE.tasks.push({
            id: Date.now().toString(), text,
            category: DOM.taskCategory.value,
            dueDate: DOM.taskDueDate.value,
            priority: DOM.taskPriority.value,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        saveTasks();
        DOM.taskInput.value = '';
        DOM.taskInput.focus();
    }

    function deleteTask(id) {
        if (!confirm('ต้องการลบงานนี้?')) return;
        STATE.tasks = STATE.tasks.filter(t => t.id !== id);
        saveTasks();
    }

    function toggleStatus(id) {
        const t = STATE.tasks.find(t => t.id === id);
        if (t) { t.status = t.status === 'completed' ? 'pending' : 'completed'; saveTasks(); }
    }

    // ============================================================
    // Edit Task (Modal)
    // ============================================================
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
                    <label>หมวดหมู่</label>
                    <select id="editCategory">
                        <option value="งาน">🏢 งาน</option>
                        <option value="ส่วนตัว">👤 ส่วนตัว</option>
                        <option value="การเรียน">📚 การบ้าน</option>
                        <option value="อื่นๆ">📌 อื่นๆ</option>
                    </select>
                    <label>วันครบกำหนด</label>
                    <input type="date" id="editDueDate">
                    <label>ความสำคัญ</label>
                    <select id="editPriority">
                        <option value="low">🟢 ต่ำ</option>
                        <option value="medium">🟡 ปานกลาง</option>
                        <option value="high">🔴 สูง</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button id="cancelEdit" class="modal-btn-cancel">ยกเลิก</button>
                    <button id="saveEdit" class="modal-btn-save">💾 บันทึก</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('closeModal').addEventListener('click', closeModal);
        document.getElementById('cancelEdit').addEventListener('click', closeModal);
        document.getElementById('saveEdit').addEventListener('click', saveEdit);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    }

    function openEditModal(id) {
        const task = STATE.tasks.find(t => t.id === id);
        if (!task) return;
        STATE.editingId = id;
        document.getElementById('editText').value = task.text;
        document.getElementById('editCategory').value = task.category;
        document.getElementById('editDueDate').value = task.dueDate || '';
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editModal').classList.add('show');
    }

    function closeModal() {
        STATE.editingId = null;
        document.getElementById('editModal').classList.remove('show');
    }

    function saveEdit() {
        const task = STATE.tasks.find(t => t.id === STATE.editingId);
        if (!task) return;
        task.text = document.getElementById('editText').value.trim() || task.text;
        task.category = document.getElementById('editCategory').value;
        task.dueDate = document.getElementById('editDueDate').value;
        task.priority = document.getElementById('editPriority').value;
        saveTasks();
        closeModal();
    }

    // ============================================================
    // Render Task List (with Drag & Drop)
    // ============================================================
    function getFilteredTasks() {
        return STATE.tasks.filter(task => {
            // Filter
            if (STATE.filter === 'pending' && task.status !== 'pending') return false;
            if (STATE.filter === 'completed' && task.status !== 'completed') return false;
            if (STATE.filter === 'high' && task.priority !== 'high') return false;
            // Search
            if (STATE.search && !task.text.toLowerCase().includes(STATE.search) &&
                !task.category.toLowerCase().includes(STATE.search)) return false;
            return true;
        });
    }

    function renderTasks() {
        if (!DOM.taskList) return;
        DOM.taskList.innerHTML = '';
        const filtered = getFilteredTasks();

        if (filtered.length === 0) {
            const empty = document.createElement('li');
            empty.style.cssText = 'text-align:center;color:var(--text-muted);border-left-color:var(--border);justify-content:center;grid-template-columns:1fr;cursor:default;';
            empty.textContent = STATE.search ? '🔍 ไม่พบงานที่ค้นหา' : (STATE.filter === 'all' ? 'ยังไม่มีงาน กดเพิ่มงานได้เลย!' : '🔍 ไม่พบงานที่ตรงตามตัวกรอง');
            DOM.taskList.appendChild(empty);
            return;
        }

        filtered.forEach(task => {
            const li = document.createElement('li');
            li.className = `${task.priority}-priority`;
            li.setAttribute('draggable', 'true');
            li.dataset.id = task.id;

            // Due date class
            const dueStatus = getDueStatus(task);
            if (dueStatus === 'overdue') li.classList.add('due-overdue');
            else if (dueStatus === 'today') li.classList.add('due-today');
            else if (dueStatus === 'soon') li.classList.add('due-soon');

            // Drag events
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragend', handleDragEnd);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragleave', handleDragLeave);

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.status === 'completed';
            checkbox.addEventListener('change', () => toggleStatus(task.id));

            // Content
            const contentDiv = document.createElement('div');
            const titleDiv = document.createElement('div');
            titleDiv.textContent = task.text;
            titleDiv.style.fontWeight = '500';
            if (task.status === 'completed') {
                titleDiv.style.textDecoration = 'line-through';
                titleDiv.style.opacity = '0.6';
            }

            const metaDiv = document.createElement('div');
            metaDiv.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap;';

            const catSpan = document.createElement('span');
            catSpan.className = 'task-category';
            catSpan.textContent = task.category;
            metaDiv.appendChild(catSpan);

            if (task.dueDate) {
                const dateSpan = document.createElement('span');
                dateSpan.className = 'task-due-date';
                dateSpan.textContent = '📅 ' + task.dueDate;
                metaDiv.appendChild(dateSpan);
            }

            if (dueStatus) metaDiv.appendChild(getDueBadge(dueStatus));

            contentDiv.appendChild(titleDiv);
            contentDiv.appendChild(metaDiv);

            // Status
            const statusSpan = document.createElement('span');
            statusSpan.className = `task-status ${task.status === 'completed' ? 'status-completed' : 'status-pending'}`;
            statusSpan.textContent = task.status === 'completed' ? '✅ เสร็จ' : '⏳ รอ';

            // Actions
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = '✏️';
            editBtn.title = 'แก้ไข';
            editBtn.addEventListener('click', () => openEditModal(task.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'ลบ';
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(checkbox);
            li.appendChild(contentDiv);
            li.appendChild(statusSpan);
            li.appendChild(actionsDiv);
            DOM.taskList.appendChild(li);
        });
    }

    // ============================================================
    // Drag & Drop
    // ============================================================
    function handleDragStart(e) {
        STATE.draggedId = e.currentTarget.dataset.id;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        STATE.draggedId = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget;
        if (target.dataset.id !== STATE.draggedId) {
            target.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove('drag-over');
        const targetId = target.dataset.id;
        if (!STATE.draggedId || STATE.draggedId === targetId) return;

        const fromIdx = STATE.tasks.findIndex(t => t.id === STATE.draggedId);
        const toIdx = STATE.tasks.findIndex(t => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = STATE.tasks.splice(fromIdx, 1);
        STATE.tasks.splice(toIdx, 0, moved);
        saveTasks();
    }

    // ============================================================
    // Calendar View
    // ============================================================
    function setupCalendarNav() {
        if (DOM.calPrev) DOM.calPrev.addEventListener('click', () => { STATE.calMonth--; if (STATE.calMonth < 0) { STATE.calMonth = 11; STATE.calYear--; } renderCalendar(); });
        if (DOM.calNext) DOM.calNext.addEventListener('click', () => { STATE.calMonth++; if (STATE.calMonth > 11) { STATE.calMonth = 0; STATE.calYear++; } renderCalendar(); });
        if (DOM.calToday) DOM.calToday.addEventListener('click', () => { const n = new Date(); STATE.calMonth = n.getMonth(); STATE.calYear = n.getFullYear(); renderCalendar(); });
    }

    function renderCalendar() {
        if (!DOM.calDays || !DOM.calMonthYear) return;

        DOM.calMonthYear.textContent = `${THAI_MONTHS[STATE.calMonth]} ${STATE.calYear + 543}`;
        DOM.calDays.innerHTML = '';

        const firstDay = new Date(STATE.calYear, STATE.calMonth, 1).getDay();
        const daysInMonth = new Date(STATE.calYear, STATE.calMonth + 1, 0).getDate();
        const daysInPrev = new Date(STATE.calYear, STATE.calMonth, 0).getDate();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        // Previous month padding
        for (let i = firstDay - 1; i >= 0; i--) {
            DOM.calDays.appendChild(createCalDay(daysInPrev - i, true, null));
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${STATE.calYear}-${String(STATE.calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date(dateStr + 'T00:00:00').getTime() === today.getTime();
            const tasksOnDay = STATE.tasks.filter(t => t.dueDate === dateStr);
            DOM.calDays.appendChild(createCalDay(d, false, tasksOnDay, isToday));
        }

        // Next month padding
        const totalCells = DOM.calDays.children.length;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            DOM.calDays.appendChild(createCalDay(i, true, null));
        }
    }

    function createCalDay(dayNum, isOtherMonth, tasks, isToday = false) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        if (isOtherMonth) div.classList.add('other-month');
        if (isToday) div.classList.add('today');

        const num = document.createElement('div');
        num.className = 'cal-day-number';
        num.textContent = dayNum;
        div.appendChild(num);

        if (tasks && tasks.length > 0) {
            const maxShow = 3;
            tasks.slice(0, maxShow).forEach(t => {
                const chip = document.createElement('div');
                chip.className = `cal-task priority-${t.priority}`;
                if (t.status === 'completed') chip.classList.add('completed');
                chip.textContent = t.text;
                chip.title = t.text;
                chip.addEventListener('click', () => openEditModal(t.id));
                div.appendChild(chip);
            });
            if (tasks.length > maxShow) {
                const more = document.createElement('div');
                more.className = 'cal-task-more';
                more.textContent = `+${tasks.length - maxShow} งาน`;
                div.appendChild(more);
            }
        }

        return div;
    }

    // ============================================================
    // Export
    // ============================================================
    function exportToPDF() {
        const el = isDashboard() ? document.querySelector('.container') : DOM.taskList || document.querySelector('.container');
        if (!window.html2pdf) return alert('PDF library not loaded');
        window.html2pdf().set({
            margin: 1, filename: isDashboard() ? 'dashboard.pdf' : 'tasks.pdf',
            image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        }).from(el).save();
    }

    function exportToExcel() {
        if (!window.XLSX) return alert('Excel library not loaded');
        const ws = XLSX.utils.aoa_to_sheet([
            [isDashboard() ? 'รายงานแดชบอร์ด' : 'รายการสิ่งที่ต้องทำ'],
            ['#', 'รายการ', 'หมวดหมู่', 'วันครบกำหนด', 'ความสำคัญ', 'สถานะ'],
            ...STATE.tasks.map((t, i) => [i + 1, t.text, t.category, t.dueDate, t.priority, t.status === 'completed' ? 'เสร็จ' : 'รอ'])
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'รายงาน');
        XLSX.writeFile(wb, isDashboard() ? 'dashboard.xlsx' : 'tasks.xlsx');
    }

    // ============================================================
    // Auto Refresh
    // ============================================================
    function startAutoRefresh() {
        STATE.refreshInterval = setInterval(() => { loadState(); refreshUI(); }, 30000);
    }

    // ============================================================
    // Boot
    // ============================================================
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
/**
 * Todo App - Main Application Controller (v3.0 Refactored & Modularized)
 * Relies on StorageAdapter, ThemeModule, SidebarModule, ToastModule, ModalsModule, ExportModule
 */

(function () {
    // ============================================================
    // State
    // ============================================================
    const STATE = {
        tasks: [],
        filter: 'all',
        search: '',
        currentView: 'list',
        calMonth: new Date().getMonth(),
        calYear: new Date().getFullYear(),
        draggedId: null,
        charts: { status: null, category: null, priority: null }
    };

    const THAI_MONTHS = [
        'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
    ];

    window.getTaskById = (id) => STATE.tasks.find(t => t.id === id);

    // ============================================================
    // DOM Cache
    // ============================================================
    const DOM = {
        taskList: document.getElementById('taskList'),
        taskInput: document.getElementById('taskInput'),
        taskCategory: document.getElementById('taskCategory'),
        taskDueDate: document.getElementById('taskDueDate'),
        taskEstHours: document.getElementById('taskEstHours'),
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
        totalHoursText: document.getElementById('totalHoursText'),
        completedHoursText: document.getElementById('completedHoursText'),
        pendingUrgentText: document.getElementById('pendingUrgentText'),
        completionProgressFill: document.getElementById('completionProgressFill'),
        sysHealthStatus: document.getElementById('sysHealthStatus'),
        aiVelocityScore: document.getElementById('aiVelocityScore'),
        aiInsightsText: document.getElementById('aiInsightsText'),
        aiRecommendationChips: document.getElementById('aiRecommendationChips'),
        executiveWatchlist: document.getElementById('executiveWatchlist'),
        statusChartCanvas: document.getElementById('statusChart'),
        categoryChartCanvas: document.getElementById('categoryChart'),
        priorityChartCanvas: document.getElementById('priorityChart'),
        dashQuickAddBtn: document.getElementById('dashQuickAddBtn'),
        dashExportPdfBtn: document.getElementById('dashExportPdfBtn')
    };

    // ============================================================
    // Init & Boot
    // ============================================================
    async function init() {
        if (window.ThemeModule) window.ThemeModule.init();
        if (window.SidebarModule) await window.SidebarModule.load();
        if (window.ModalsModule) window.ModalsModule.init();

        if (isDashboard()) initDashboard();
        else if (isTaskPage()) initTaskPage();

        // Single Source of Truth: Data Storage Adapter Initialization
        if (window.storageAdapter) {
            STATE.tasks = await window.storageAdapter.getTasks();
            refreshUI();

            window.storageAdapter.onTasksUpdated((tasks) => {
                STATE.tasks = tasks;
                refreshUI();
            });
        }
    }

    function isDashboard() { return !!DOM.statusChartCanvas; }
    function isTaskPage() { return !!DOM.taskList; }

    function refreshUI() {
        if (isDashboard()) {
            updateStats();
            updateAIInsights();
            updateCharts();
            renderExecutiveWatchlist();
        }
        else if (isTaskPage()) { renderTasks(); updateProgress(); renderCalendar(); }
    }

    // ============================================================
    // Executive C-Suite Dashboard Logic
    // ============================================================
    function initDashboard() {
        if (DOM.dashQuickAddBtn) {
            DOM.dashQuickAddBtn.addEventListener('click', () => {
                if (window.ModalsModule) window.ModalsModule.openQuickInbox();
            });
        }
        if (DOM.dashExportPdfBtn) {
            DOM.dashExportPdfBtn.addEventListener('click', () => {
                if (window.ExportModule) window.ExportModule.exportToPDF();
            });
        }
        updateStats();
        updateAIInsights();
        initCharts();
        renderExecutiveWatchlist();
    }

    function updateStats() {
        if (!DOM.totalTasks) return;
        const tasks = STATE.tasks;
        const total = tasks.length;
        const completed = tasks.filter(x => x.status === 'completed');
        const pending = tasks.filter(x => x.status === 'pending');
        const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

        DOM.totalTasks.textContent = total;
        DOM.completedTasks.textContent = completed.length;
        DOM.pendingTasks.textContent = pending.length;
        DOM.completionRate.textContent = rate + '%';

        if (DOM.completionProgressFill) DOM.completionProgressFill.style.width = rate + '%';

        // Hours & Subtexts
        const totalEst = tasks.reduce((sum, t) => sum + (parseFloat(t.estHours) || 0), 0);
        const compEst = completed.reduce((sum, t) => sum + (parseFloat(t.estHours) || 0), 0);
        const p0Pending = pending.filter(t => t.priority === 'high' || t.priority === 'P0');

        if (DOM.totalHoursText) DOM.totalHoursText.textContent = `⏱️ ${totalEst} ชม. ประเมินรวม`;
        if (DOM.completedHoursText) DOM.completedHoursText.textContent = `🎯 สำเร็จแล้ว ${compEst} ชม.`;
        if (DOM.pendingUrgentText) DOM.pendingUrgentText.textContent = `🔥 P0/ด่วน: ${p0Pending.length} รายการ`;

        // System Health Status Indicator
        const today = new Date(); today.setHours(0,0,0,0);
        const overdueCount = pending.filter(t => t.dueDate && new Date(t.dueDate + 'T00:00:00') < today).length;

        if (DOM.sysHealthStatus) {
            if (overdueCount > 0) {
                DOM.sysHealthStatus.textContent = 'ATTENTION REQUIRED';
                DOM.sysHealthStatus.style.color = 'var(--danger)';
            } else if (rate >= 80) {
                DOM.sysHealthStatus.textContent = 'EXCELLENT VELOCITY';
                DOM.sysHealthStatus.style.color = 'var(--success)';
            } else {
                DOM.sysHealthStatus.textContent = 'OPTIMAL';
                DOM.sysHealthStatus.style.color = 'var(--accent-light)';
            }
        }
    }

    function updateAIInsights() {
        if (!DOM.aiInsightsText) return;
        const tasks = STATE.tasks;
        if (tasks.length === 0) {
            DOM.aiInsightsText.innerHTML = '🤖 <strong>AI Intelligence Analytics:</strong> ระบบยังไม่มีงานที่ถูกบันทึกในขณะนี้ เริ่มต้นกด <strong>"+ เพิ่มงาน"</strong> หรือ <strong>"Ctrl+K"</strong> เพื่อเริ่มการประมวลผลดัชนีองค์กร';
            if (DOM.aiVelocityScore) DOM.aiVelocityScore.textContent = '100/100';
            if (DOM.aiRecommendationChips) DOM.aiRecommendationChips.innerHTML = '';
            return;
        }

        const completed = tasks.filter(t => t.status === 'completed');
        const pending = tasks.filter(t => t.status === 'pending');
        const today = new Date(); today.setHours(0,0,0,0);
        const overdue = pending.filter(t => t.dueDate && new Date(t.dueDate + 'T00:00:00') < today);
        const p0Pending = pending.filter(t => t.priority === 'high' || t.priority === 'P0');
        const rate = Math.round((completed.length / tasks.length) * 100);

        // Velocity Health Score Algorithm
        let score = 100;
        score -= (overdue.length * 15);
        score -= (p0Pending.length * 5);
        if (rate < 50) score -= 10;
        score = Math.max(10, Math.min(100, score));

        if (DOM.aiVelocityScore) {
            DOM.aiVelocityScore.textContent = `${score}/100`;
            DOM.aiVelocityScore.style.color = score >= 80 ? 'var(--success)' : (score >= 50 ? 'var(--warning)' : 'var(--danger)');
        }

        // Executive Narrative Generation
        let analysisStr = `🤖 <strong>Executive Summary:</strong> ระบบวิเคราะห์ภาระงานรวม <strong>${tasks.length} รายการ</strong> สำเร็จแล้ว <strong>${completed.length} รายการ (${rate}%)</strong>`;
        if (overdue.length > 0) {
            analysisStr += ` พบงาน <strong>เลยกำหนดส่งสะสม ${overdue.length} รายการ</strong> ที่ต้องเร่งรัดติดตามทันที`;
        } else if (p0Pending.length > 0) {
            analysisStr += ` มีงานความสำคัญสูง (P0) อยู่ระหว่างดำเนินการ <strong>${p0Pending.length} รายการ</strong> ควรให้ความสำคัญเป็นอันดับแรก`;
        } else {
            analysisStr += ` 🚀 การบริหารจัดการงานอยู่ในเกณฑ์ยอดเยี่ยม ไม่มีงานค้างเกินกำหนด`;
        }

        DOM.aiInsightsText.innerHTML = analysisStr;

        // Recommendation Chips
        if (DOM.aiRecommendationChips) {
            DOM.aiRecommendationChips.innerHTML = '';
            const chips = [];
            if (overdue.length > 0) chips.push({ icon: 'fa-exclamation-circle', text: `งานเกินกำหนด: ${overdue.length} รายการ`, type: 'danger' });
            if (p0Pending.length > 0) chips.push({ icon: 'fa-fire', text: `P0 ด่วนเร่งด่วน: ${p0Pending.length} รายการ`, type: 'warning' });
            chips.push({ icon: 'fa-check-circle', text: `อัตราสำเร็จ: ${rate}%`, type: 'success' });
            const totalHours = tasks.reduce((s, t) => s + (parseFloat(t.estHours) || 0), 0);
            chips.push({ icon: 'fa-clock', text: `รวมเวลาประเมิน: ${totalHours} ชม.`, type: 'accent' });

            chips.forEach(chip => {
                const span = document.createElement('span');
                span.className = `ai-chip ai-chip-${chip.type}`;
                span.innerHTML = `<i class="fas ${chip.icon}"></i> ${chip.text}`;
                DOM.aiRecommendationChips.appendChild(span);
            });
        }
    }

    function getChartColors() {
        const d = (window.ThemeModule ? window.ThemeModule.getTheme() : 'dark') === 'dark';
        return { text: d ? '#a0a0cc' : '#5a5a7a', grid: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' };
    }

    function initCharts() {
        if (!window.Chart || !DOM.statusChartCanvas) return;
        const c = getChartColors();

        STATE.charts.status = new Chart(DOM.statusChartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['เสร็จแล้ว', 'รอดำเนินการ'],
                datasets: [{ data: [0, 0], backgroundColor: ['#00cec9', '#fdcb6e'], borderWidth: 0, hoverOffset: 8 }]
            },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '72%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: c.text, font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } }
                }
            }
        });

        STATE.charts.category = new Chart(DOM.categoryChartCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'จำนวนงาน', data: [], backgroundColor: 'rgba(108, 92, 231, 0.8)', borderRadius: 8, borderSkipped: false, barThickness: 28 }] },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } },
                    x: { ticks: { color: c.text }, grid: { display: false } }
                }
            }
        });

        if (DOM.priorityChartCanvas) {
            STATE.charts.priority = new Chart(DOM.priorityChartCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['🔴 P0 - สำคัญด่วน', '🟡 P1 - ปานกลาง', '🟢 P2 - ทั่วไป'],
                    datasets: [{
                        label: 'จำนวนงาน',
                        data: [0, 0, 0],
                        backgroundColor: ['rgba(255, 107, 107, 0.85)', 'rgba(253, 203, 110, 0.85)', 'rgba(0, 206, 201, 0.85)'],
                        borderRadius: 8, borderSkipped: false, barThickness: 36
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: c.text, precision: 0 }, grid: { color: c.grid } },
                        x: { ticks: { color: c.text }, grid: { display: false } }
                    }
                }
            });
        }

        updateCharts();
    }

    function updateCharts() {
        if (!STATE.charts.status) return;
        const comp = STATE.tasks.filter(t => t.status === 'completed').length;
        STATE.charts.status.data.datasets[0].data = [comp, STATE.tasks.length - comp];
        STATE.charts.status.update();

        // Category Chart
        const cats = {};
        STATE.tasks.forEach(t => { cats[t.category || 'งาน'] = (cats[t.category || 'งาน'] || 0) + 1; });
        STATE.charts.category.data.labels = Object.keys(cats);
        STATE.charts.category.data.datasets[0].data = Object.values(cats);
        STATE.charts.category.update();

        // Priority Chart
        if (STATE.charts.priority) {
            const p0 = STATE.tasks.filter(t => t.priority === 'high' || t.priority === 'P0').length;
            const p1 = STATE.tasks.filter(t => !t.priority || t.priority === 'medium' || t.priority === 'P1').length;
            const p2 = STATE.tasks.filter(t => t.priority === 'low' || t.priority === 'P2').length;
            STATE.charts.priority.data.datasets[0].data = [p0, p1, p2];
            STATE.charts.priority.update();
        }
    }

    function renderExecutiveWatchlist() {
        if (!DOM.executiveWatchlist) return;
        const pending = STATE.tasks.filter(t => t.status === 'pending');
        const today = new Date(); today.setHours(0,0,0,0);

        // Sort: overdue first, then P0, then soonest due
        const urgentTasks = pending.sort((a, b) => {
            const isOverdueA = a.dueDate && new Date(a.dueDate + 'T00:00:00') < today;
            const isOverdueB = b.dueDate && new Date(b.dueDate + 'T00:00:00') < today;
            if (isOverdueA && !isOverdueB) return -1;
            if (!isOverdueA && isOverdueB) return 1;
            if ((a.priority === 'high' || a.priority === 'P0') && (b.priority !== 'high' && b.priority !== 'P0')) return -1;
            if ((a.priority !== 'high' && a.priority !== 'P0') && (b.priority === 'high' || b.priority === 'P0')) return 1;
            return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
        }).slice(0, 4);

        if (urgentTasks.length === 0) {
            DOM.executiveWatchlist.innerHTML = `<div class="empty-watchlist">✨ ยินดีด้วย! ไม่พบรายการงานค้างสะสมหรือเร่งด่วนในขณะนี้ (All Clean)</div>`;
            return;
        }

        let html = `<ul class="watchlist-list">`;
        urgentTasks.forEach(task => {
            const isOverdue = task.dueDate && new Date(task.dueDate + 'T00:00:00') < today;
            const prioBadge = (task.priority === 'high' || task.priority === 'P0')
                ? `<span class="badge priority-high">🔴 P0 ด่วน</span>`
                : `<span class="badge priority-medium">🟡 P1</span>`;
            const dateBadge = task.dueDate 
                ? (isOverdue ? `<span class="due-badge overdue">⚠️ เลยกำหนด (${task.dueDate})</span>` : `<span class="due-badge">📅 ${task.dueDate}</span>`)
                : `<span class="due-badge">📌 ไม่ระบุวัน</span>`;

            html += `
                <li class="watchlist-item ${isOverdue ? 'item-overdue' : ''}">
                    <div class="watchlist-item-main">
                        <strong class="watchlist-title">${escapeHTML(task.text)}</strong>
                        <div class="watchlist-meta">
                            <span class="badge badge-cat">${escapeHTML(task.category || 'งาน')}</span>
                            ${prioBadge}
                            ${dateBadge}
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="if(window.ModalsModule) window.ModalsModule.openEdit(window.getTaskById('${task.id}'))">
                        <i class="fas fa-edit"></i> จัดการ
                    </button>
                </li>
            `;
        });
        html += `</ul>`;
        DOM.executiveWatchlist.innerHTML = html;
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
    // CRUD Operations (Strictly via StorageAdapter)
    // ============================================================
    async function addTask() {
        const text = DOM.taskInput.value.trim();
        if (!text || !window.storageAdapter) return;

        // Smart date: auto-detect if user didn't set a date manually
        let dueDate = DOM.taskDueDate ? DOM.taskDueDate.value : '';
        let smartHint = '';
        if (!dueDate && window.SmartDateParser) {
            const parsed = window.SmartDateParser.parse(text);
            if (parsed) {
                dueDate = parsed.date;
                smartHint = parsed.label;
            }
        }
        
        const newTask = {
            id: Date.now().toString(),
            text,
            category: DOM.taskCategory ? DOM.taskCategory.value : 'งาน',
            dueDate,
            estHours: DOM.taskEstHours ? parseFloat(DOM.taskEstHours.value) || 0 : 0,
            priority: DOM.taskPriority ? DOM.taskPriority.value : 'medium',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await window.storageAdapter.addTask(newTask);

        DOM.taskInput.value = '';
        if (DOM.taskDueDate) DOM.taskDueDate.value = '';
        if (DOM.taskEstHours) DOM.taskEstHours.value = '';
        DOM.taskInput.focus();
        const msg = smartHint
            ? `⚡ เพิ่มงานเรียบร้อย! 📅 ตั้งวันที่อัตโนมัติ: ${smartHint} (${dueDate})`
            : '⚡ เพิ่มงานเรียบร้อยแล้ว!';
        if (window.ToastModule) window.ToastModule.show(msg);
    }

    async function deleteTask(id) {
        if (!confirm('ต้องการลบงานนี้?') || !window.storageAdapter) return;
        await window.storageAdapter.deleteTask(id);
        if (window.ToastModule) window.ToastModule.show('🗑️ ลบงานเรียบร้อยแล้ว');
    }

    async function toggleStatus(id) {
        const t = STATE.tasks.find(t => t.id === id);
        if (t && window.storageAdapter) {
            const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
            await window.storageAdapter.updateTask(id, { status: nextStatus });
        }
    }

    function getFilteredTasks() {
        return STATE.tasks.filter(task => {
            if (STATE.filter === 'pending' && task.status !== 'pending') return false;
            if (STATE.filter === 'completed' && task.status !== 'completed') return false;
            if (STATE.filter === 'high' && task.priority !== 'high' && task.priority !== 'P0') return false;
            
            if (STATE.search && !task.text.toLowerCase().includes(STATE.search) &&
                !(task.category || '').toLowerCase().includes(STATE.search)) return false;
            return true;
        });
    }

    function renderTasks() {
        if (!DOM.taskList) return;
        DOM.taskList.innerHTML = '';
        const filtered = getFilteredTasks();
        const canDrag = STATE.filter === 'all' && !STATE.search;

        if (filtered.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'task-empty-state';
            empty.textContent = STATE.search ? '🔍 ไม่พบงานที่ค้นหา' : (STATE.filter === 'all' ? 'ยังไม่มีงาน กดเพิ่มงานได้เลย!' : '🔍 ไม่พบงานที่ตรงตามตัวกรอง');
            DOM.taskList.appendChild(empty);
            return;
        }

        filtered.forEach(task => {
            const li = document.createElement('li');
            li.className = `${task.priority || 'medium'}-priority`;
            li.dataset.id = task.id;

            if (canDrag) {
                li.setAttribute('draggable', 'true');
                li.addEventListener('dragstart', handleDragStart);
                li.addEventListener('dragend', handleDragEnd);
                li.addEventListener('dragover', handleDragOver);
                li.addEventListener('drop', handleDrop);
                li.addEventListener('dragleave', handleDragLeave);
            } else {
                li.setAttribute('draggable', 'false');
                li.classList.add('not-draggable');
            }

            const dueStatus = getDueStatus(task);
            if (dueStatus === 'overdue') li.classList.add('due-overdue');
            else if (dueStatus === 'today') li.classList.add('due-today');
            else if (dueStatus === 'soon') li.classList.add('due-soon');


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
            catSpan.textContent = task.category || 'งาน';
            metaDiv.appendChild(catSpan);

            if (task.dueDate) {
                const dateSpan = document.createElement('span');
                dateSpan.className = 'task-due-date';
                dateSpan.textContent = '📅 ' + task.dueDate;
                metaDiv.appendChild(dateSpan);
            }

            if (task.estHours) {
                const hoursSpan = document.createElement('span');
                hoursSpan.className = 'task-due-date';
                hoursSpan.textContent = '⏱️ ' + task.estHours + ' ชม.';
                metaDiv.appendChild(hoursSpan);
            }

            if (dueStatus) metaDiv.appendChild(getDueBadge(dueStatus));

            contentDiv.appendChild(titleDiv);
            contentDiv.appendChild(metaDiv);

            // Status
            const statusSpan = document.createElement('span');
            statusSpan.className = `task-status ${task.status === 'completed' ? 'status-completed' : 'status-pending'}`;
            statusSpan.innerHTML = task.status === 'completed' 
                ? '<i class="fas fa-check-circle"></i> เสร็จแล้ว' 
                : '<i class="fas fa-clock"></i> รอดำเนินการ';

            // Actions
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-pen"></i>';
            editBtn.title = 'แก้ไขงาน';
            editBtn.setAttribute('aria-label', 'แก้ไขงาน');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.ModalsModule) window.ModalsModule.openEdit(task);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'ลบงาน';
            deleteBtn.setAttribute('aria-label', 'ลบงาน');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });

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
        if (STATE.filter !== 'all' || STATE.search) return;
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
        if (STATE.filter !== 'all' || STATE.search) return;
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

    async function handleDrop(e) {
        e.preventDefault();
        if (STATE.filter !== 'all' || STATE.search) return;
        const target = e.currentTarget;
        target.classList.remove('drag-over');
        const targetId = target.dataset.id;
        if (!STATE.draggedId || STATE.draggedId === targetId) return;

        const fromIdx = STATE.tasks.findIndex(t => t.id === STATE.draggedId);
        const toIdx = STATE.tasks.findIndex(t => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = STATE.tasks.splice(fromIdx, 1);
        STATE.tasks.splice(toIdx, 0, moved);

        if (window.storageAdapter) {
            await window.storageAdapter.saveTasks(STATE.tasks);
        }
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

        for (let i = firstDay - 1; i >= 0; i--) {
            DOM.calDays.appendChild(createCalDay(daysInPrev - i, true, null));
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${STATE.calYear}-${String(STATE.calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date(dateStr + 'T00:00:00').getTime() === today.getTime();
            const tasksOnDay = STATE.tasks.filter(t => t.dueDate === dateStr);
            DOM.calDays.appendChild(createCalDay(d, false, tasksOnDay, isToday));
        }

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
                chip.className = `cal-task priority-${t.priority || 'medium'}`;
                if (t.status === 'completed') chip.classList.add('completed');
                chip.textContent = t.text;
                chip.title = t.text;
                chip.addEventListener('click', () => {
                    if (window.ModalsModule) window.ModalsModule.openEdit(t);
                });
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

    // Boot
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
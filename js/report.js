/**
 * Report Module - Generates Monthly Summary Reports and Handles Export Features
 */
(function () {
    const STATE_KEY = 'tasknest_report_filters';
    const THAI_MONTHS = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const state = {
        selectedYear: new Date().getFullYear(),
        selectedMonth: new Date().getMonth(),
        selectedCategory: 'all'
    };

    let allTasks = [];

    const DOM = {
        reportMonthSelect: document.getElementById('reportMonthSelect'),
        reportCategorySelect: document.getElementById('reportCategorySelect'),
        copyMarkdownBtn: document.getElementById('copyMarkdownBtn'),
        exportPdfReportBtn: document.getElementById('exportPdfReportBtn'),
        reportPeriodText: document.getElementById('reportPeriodText'),
        reportGeneratedDate: document.getElementById('reportGeneratedDate'),
        executiveSummaryText: document.getElementById('executiveSummaryText'),
        kpiCompleted: document.getElementById('kpiCompleted'),
        kpiOngoing: document.getElementById('kpiOngoing'),
        kpiOverdue: document.getElementById('kpiOverdue'),
        kpiEstHours: document.getElementById('kpiEstHours'),
        completedListSection: document.getElementById('completedListSection'),
        ongoingListSection: document.getElementById('ongoingListSection'),
        plannedListSection: document.getElementById('plannedListSection'),
        blockersListSection: document.getElementById('blockersListSection')
    };

    function populateMonthFilter() {
        if (!DOM.reportMonthSelect) return;
        const now = new Date();
        const currentY = now.getFullYear();
        const currentM = now.getMonth();
        DOM.reportMonthSelect.innerHTML = '';

        for (let offset = -6; offset <= 3; offset++) {
            const d = new Date(currentY, currentM + offset, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            const opt = document.createElement('option');
            opt.value = `${y}-${m}`;
            opt.textContent = `${THAI_MONTHS[m]} ${y + 543}`;
            if (offset === 0) {
                opt.selected = true;
            }
            DOM.reportMonthSelect.appendChild(opt);
        }
    }

    async function init() {
        if (window.AuthModule) await window.AuthModule.init();
        if (window.ThemeModule) window.ThemeModule.init();
        if (window.SidebarModule) await window.SidebarModule.load();
        if (window.ModalsModule) window.ModalsModule.init();

        populateMonthFilter();
        setupControls();
        
        if (window.storageAdapter) {
            allTasks = await window.storageAdapter.getTasks();
            populateCategoryFilter();
            renderReport();

            window.storageAdapter.onTasksUpdated((tasks) => {
                allTasks = tasks;
                populateCategoryFilter();
                renderReport();
            });
        }
    }

    function populateCategoryFilter() {
        if (!DOM.reportCategorySelect) return;
        const current = DOM.reportCategorySelect.value || 'all';
        const categories = Array.from(new Set(allTasks.map(t => t.category).filter(Boolean)));
        
        DOM.reportCategorySelect.innerHTML = '<option value="all">ทุกหมวดหมู่ (All Categories)</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            DOM.reportCategorySelect.appendChild(opt);
        });
        DOM.reportCategorySelect.value = categories.includes(current) ? current : 'all';
        state.selectedCategory = DOM.reportCategorySelect.value;
    }

    function setupControls() {
        if (DOM.reportMonthSelect) {
            DOM.reportMonthSelect.addEventListener('change', (e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                state.selectedYear = y;
                state.selectedMonth = m;
                renderReport();
            });
        }
        if (DOM.reportCategorySelect) {
            DOM.reportCategorySelect.addEventListener('change', (e) => {
                state.selectedCategory = e.target.value;
                renderReport();
            });
        }
        if (DOM.copyMarkdownBtn) {
            DOM.copyMarkdownBtn.addEventListener('click', copyReportMarkdown);
        }
        if (DOM.exportPdfReportBtn) {
            DOM.exportPdfReportBtn.addEventListener('click', () => {
                if (window.ExportModule) window.ExportModule.exportToPDF();
            });
        }
    }

    function isTaskInMonth(task, year, month) {
        if (!task.dueDate && !task.createdAt) return true;
        const d = new Date(task.dueDate || task.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
    }

    function getFilteredReportTasks() {
        return allTasks.filter(t => {
            if (state.selectedCategory !== 'all' && t.category !== state.selectedCategory) return false;
            return isTaskInMonth(t, state.selectedYear, state.selectedMonth);
        });
    }

    function renderReport() {
        const filtered = getFilteredReportTasks();

        const completed = filtered.filter(t => t.status === 'completed');
        const ongoing = filtered.filter(t => t.status === 'pending');
        
        const today = new Date(); today.setHours(0,0,0,0);
        const overdue = ongoing.filter(t => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate + 'T00:00:00');
            return due < today;
        });

        const totalEstHours = filtered.reduce((acc, t) => acc + (parseFloat(t.estHours) || 0), 0);

        if (DOM.kpiCompleted) DOM.kpiCompleted.textContent = completed.length;
        if (DOM.kpiOngoing) DOM.kpiOngoing.textContent = ongoing.length;
        if (DOM.kpiOverdue) DOM.kpiOverdue.textContent = overdue.length;
        if (DOM.kpiEstHours) DOM.kpiEstHours.textContent = `${totalEstHours} ชม.`;

        const periodStr = `${THAI_MONTHS[state.selectedMonth]} ${state.selectedYear + 543}`;
        if (DOM.reportPeriodText) DOM.reportPeriodText.textContent = `ประจำเดือน: ${periodStr}`;
        if (DOM.reportGeneratedDate) {
            const nowStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            DOM.reportGeneratedDate.textContent = `วันที่สร้างรายงาน: ${nowStr}`;
        }

        const total = filtered.length;
        const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
        if (DOM.executiveSummaryText) {
            DOM.executiveSummaryText.innerHTML = `ในประจำเดือน <strong>${escapeHTML(periodStr)}</strong> มีงานและโปรเจกต์ที่ได้รับการบันทึกทั้งหมด <strong>${total} รายการ</strong> ดำเนินการสำเร็จแล้ว <strong>${completed.length} รายการ (${rate}%)</strong> และอยู่ระหว่างดำเนินการ <strong>${ongoing.length} รายการ</strong> โดยมีรายการที่ต้องเร่งรัดติดตามพิเศษจำนวน <strong>${overdue.length} รายการ</strong>`;
        }

        renderSectionList(DOM.completedListSection, completed, 'ยังไม่มีรายการงานที่เสร็จสิ้นในเดือนนี้');
        renderSectionList(DOM.ongoingListSection, ongoing, 'ไม่มีงานค้างดำเนินการในเดือนนี้');

        // Section 3: Smart planned — upcoming due date within 14 days OR high priority
        const in14Days = new Date(today);
        in14Days.setDate(in14Days.getDate() + 14);
        const planned = ongoing.filter(t => {
            if (t.priority === 'high' || t.priority === 'P0') return true;
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate + 'T00:00:00');
            return due >= today && due <= in14Days;
        }).sort((a, b) => {
            // Sort: soonest due first, then by priority
            const da = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
            const db = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
            return da - db;
        });
        renderSectionList(DOM.plannedListSection, planned, 'ไม่มีแผนงานเร่งด่วนหรือกำหนดส่งภายใน 2 สัปดาห์');

        // Section 4: Smart blockers — overdue + tasks with no due date (risk items)
        const noDueDate = ongoing.filter(t => !t.dueDate);
        const blockers = [...overdue, ...noDueDate];
        const blockerMsg = overdue.length === 0 && noDueDate.length === 0
            ? '✨ ไม่พบงานที่ติดขัดหรือเลยกำหนด (All clean)'
            : null;
        renderSectionList(DOM.blockersListSection, blockers, blockerMsg || '✨ ไม่พบงานที่ติดขัดหรือเลยกำหนด (All clean)');
    }

    function renderSectionList(container, tasks, emptyMsg) {
        if (!container) return;
        container.innerHTML = '';
        if (tasks.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-list-text';
            emptyDiv.textContent = emptyMsg;
            container.appendChild(emptyDiv);
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'report-item-list';
        tasks.forEach(t => {
            const li = document.createElement('li');
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'report-item-title';
            
            const strong = document.createElement('strong');
            strong.textContent = t.text;
            titleDiv.appendChild(strong);

            const metaDiv = document.createElement('div');
            metaDiv.className = 'report-item-meta';

            const catSpan = document.createElement('span');
            catSpan.className = 'badge badge-cat';
            catSpan.textContent = t.category || 'งาน';
            metaDiv.appendChild(catSpan);

            const prioSpan = document.createElement('span');
            prioSpan.className = `badge priority-${t.priority || 'medium'}`;
            prioSpan.textContent = (t.priority || 'medium').toUpperCase();
            metaDiv.appendChild(prioSpan);

            if (t.dueDate) {
                const dateSpan = document.createElement('span');
                dateSpan.className = 'report-item-date';
                dateSpan.innerHTML = `<i class="fas fa-calendar"></i> `;
                dateSpan.appendChild(document.createTextNode(t.dueDate));
                metaDiv.appendChild(dateSpan);
            }

            if (t.estHours) {
                const hoursSpan = document.createElement('span');
                hoursSpan.className = 'report-item-hours';
                hoursSpan.innerHTML = `<i class="fas fa-clock"></i> `;
                hoursSpan.appendChild(document.createTextNode(`${t.estHours}h`));
                metaDiv.appendChild(hoursSpan);
            }

            titleDiv.appendChild(metaDiv);
            li.appendChild(titleDiv);
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    function copyReportMarkdown() {
        const periodStr = `${THAI_MONTHS[state.selectedMonth]} ${state.selectedYear + 543}`;
        const filtered = getFilteredReportTasks();
        const completed = filtered.filter(t => t.status === 'completed');
        const ongoing = filtered.filter(t => t.status === 'pending');

        const today = new Date(); today.setHours(0,0,0,0);
        const overdue = ongoing.filter(t => t.dueDate && new Date(t.dueDate + 'T00:00:00') < today);

        // Smart planned: upcoming 14 days or high priority
        const in14Days = new Date(today); in14Days.setDate(in14Days.getDate() + 14);
        const planned = ongoing.filter(t => {
            if (t.priority === 'high' || t.priority === 'P0') return true;
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate + 'T00:00:00');
            return due >= today && due <= in14Days;
        });

        // Smart blockers: overdue + no due date
        const noDueDate = ongoing.filter(t => !t.dueDate);

        let md = `# 📊 TASKNEST SUMMARY REPORT: ประจำเดือน ${periodStr}\n`;
        if (state.selectedCategory !== 'all') {
            md += `*หมวดหมู่/โปรเจกต์: ${state.selectedCategory}*\n`;
        }
        md += `*วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}*\n\n`;
        md += `---
### 📌 1. ภาพรวมสรุปการดำเนินงาน (Task Overview)
- **งานทั้งหมดในงวด:** ${filtered.length} รายการ
- **ดำเนินการสำเร็จแล้ว:** ${completed.length} รายการ (${filtered.length > 0 ? Math.round((completed.length/filtered.length)*100) : 0}%)
- **กำลังดำเนินการอยู่:** ${ongoing.length} รายการ

---
### ✅ 2. ผลงานที่ทำเสร็จแล้ว (Completed Tasks)
`;
        if (completed.length === 0) md += `- ไม่มีรายการงานที่เสร็จสิ้น\n`;
        else completed.forEach((t, i) => { md += `${i+1}. [${t.category}] ${t.text} (${t.dueDate || 'ไม่ระบุวัน'})\n`; });

        md += `\n---
### 🔄 3. งานและโปรเจกต์กำลังดำเนินการ (Ongoing Tasks)
`;
        if (ongoing.length === 0) md += `- ไม่มีงานค้างดำเนินการ\n`;
        else ongoing.forEach((t, i) => { md += `${i+1}. [${t.category}] [${(t.priority||'Medium').toUpperCase()}] ${t.text} (กำหนดส่ง: ${t.dueDate || 'N/A'})\n`; });

        md += `\n---
### 🎯 4. แผนงานเร่งด่วน & กำหนดส่งเร็ว ๆ นี้ (Upcoming Priority Tasks)
`;
        if (planned.length === 0) md += `- ไม่มีแผนงานเร่งด่วนหรือกำหนดส่งภายใน 2 สัปดาห์\n`;
        else planned.forEach((t, i) => { md += `${i+1}. ⭐ [${t.category}] ${t.text} (กำหนดส่ง: ${t.dueDate || 'ไม่ระบุ'})\n`; });

        md += `\n---
### ⚠️ 5. ประเด็นเสี่ยงและงานติดขัด (Blockers & Risk Items)
`;
        if (overdue.length === 0 && noDueDate.length === 0) md += `- ✨ ไม่พบงานที่ติดขัดหรือเลยกำหนด\n`;
        else {
            overdue.forEach((t, i) => { md += `${i+1}. ⚠️ [OVERDUE] ${t.text} (เลยกำหนดวันที่ ${t.dueDate})\n`; });
            noDueDate.forEach((t, i) => { md += `${overdue.length+i+1}. ⚠️ [ไม่มีกำหนดส่ง] ${t.text}\n`; });
        }

        navigator.clipboard.writeText(md).then(() => {
            if (window.ToastModule) window.ToastModule.show('📋 คัดลอกสรุปข้อความ Markdown เรียบร้อยแล้ว!');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('ไม่สามารถคัดลอกข้อความได้');
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

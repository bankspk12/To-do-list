let autoRefreshInterval;
let statusChart, categoryChart;
let currentFilter = 'all';

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Auto Refresh
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        if (window.location.pathname.includes('index.html')) {
            updateStats();
            updateCharts();
        } else {
            loadTasks();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// Dashboard Functions
function initCharts() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // สถานะงาน
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const statusData = {
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length
    };
    
    // Get current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const textColor = currentTheme === 'dark' ? '#e0e0e0' : '#333';
    
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['เสร็จแล้ว', 'รอดำเนินการ'],
            datasets: [{
                data: [statusData.completed, statusData.pending],
                backgroundColor: ['#28a745', '#ffc107']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'สถานะงาน',
                    color: textColor,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });

    // หมวดหมู่งาน
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categories = {};
    tasks.forEach(task => {
        categories[task.category] = (categories[task.category] || 0) + 1;
    });
    
    categoryChart = new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                label: 'จำนวนงาน',
                data: Object.values(categories),
                backgroundColor: '#1a73e8'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'จำนวนงานตามหมวดหมู่',
                    color: textColor,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function updateCharts() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // อัพเดทกราฟสถานะ
    const statusData = {
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length
    };
    statusChart.data.datasets[0].data = [statusData.completed, statusData.pending];
    statusChart.update();

    // อัพเดทกราฟหมวดหมู่
    const categories = {};
    tasks.forEach(task => {
        categories[task.category] = (categories[task.category] || 0) + 1;
    });
    categoryChart.data.labels = Object.keys(categories);
    categoryChart.data.datasets[0].data = Object.values(categories);
    categoryChart.update();
}

function updateStats() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = total - completed;
    document.getElementById('completionRate').textContent = completionRate + '%';
}

// Tasks Functions
function loadTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    taskList.innerHTML = '';
    savedTasks
        .filter(task => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'pending') return task.status === 'pending';
            if (currentFilter === 'completed') return task.status === 'completed';
            if (currentFilter === 'high') return task.priority === 'high';
            return true;
        })
        .forEach(task => {
            const li = document.createElement('li');
            li.className = `${task.priority}-priority`;
            li.innerHTML = `
                <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                    onchange="toggleTaskStatus('${task.id}')">
                <div>
                    <div>${task.text}</div>
                    <span class="task-category">${task.category}</span>
                    <span class="task-due-date">${task.dueDate}</span>
                </div>
                <span class="task-status ${task.status === 'completed' ? 'status-completed' : 'status-pending'}">
                    ${task.status === 'completed' ? 'เสร็จแล้ว' : 'รอดำเนินการ'}
                </span>
                <button class="delete-btn" onclick="deleteTask('${task.id}')">ลบ</button>
            `;
            taskList.appendChild(li);
        });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    
    if (input.value.trim() !== '') {
        const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const newTask = {
            id: Date.now().toString(),
            text: input.value.trim(),
            category: category,
            dueDate: dueDate,
            priority: priority,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        savedTasks.push(newTask);
        localStorage.setItem('tasks', JSON.stringify(savedTasks));
        
        loadTasks();
        input.value = '';
    }
}

function deleteTask(taskId) {
    const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const updatedTasks = savedTasks.filter(task => task.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    loadTasks();
}

function toggleTaskStatus(taskId) {
    const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = savedTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        savedTasks[taskIndex].status = savedTasks[taskIndex].status === 'completed' ? 'pending' : 'completed';
        localStorage.setItem('tasks', JSON.stringify(savedTasks));
        loadTasks();
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    loadTasks();
}

// Export Functions
function exportToPDF() {
    const element = window.location.pathname.includes('index.html') 
        ? document.querySelector('.container')
        : document.getElementById('taskList');
    const opt = {
        margin: 1,
        filename: window.location.pathname.includes('index.html') ? 'todo-dashboard.pdf' : 'todo-list.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function exportToExcel() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const ws = XLSX.utils.aoa_to_sheet([
        [window.location.pathname.includes('index.html') ? 'รายงานแดชบอร์ด' : 'รายการสิ่งที่ต้องทำ'],
        window.location.pathname.includes('index.html') ? [
            ['จำนวนงานทั้งหมด', tasks.length],
            ['งานที่เสร็จแล้ว', tasks.filter(t => t.status === 'completed').length],
            ['งานที่รอดำเนินการ', tasks.filter(t => t.status === 'pending').length],
            ['อัตราการเสร็จสิ้น', Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) + '%'],
            [],
            ['รายละเอียดงาน']
        ] : [],
        ['ลำดับ', 'รายการ', 'หมวดหมู่', 'วันครบกำหนด', 'ความสำคัญ', 'สถานะ'],
        ...tasks.map((task, index) => [
            index + 1,
            task.text,
            task.category,
            task.dueDate,
            task.priority,
            task.status === 'completed' ? 'เสร็จแล้ว' : 'รอดำเนินการ'
        ])
    ]);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
    
    XLSX.writeFile(wb, window.location.pathname.includes('index.html') ? "todo-dashboard.xlsx" : "todo-list.xlsx");
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const themeIcon = document.querySelector('.theme-btn i');
    if (newTheme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
    
    // Update charts if on dashboard
    if (window.location.pathname.includes('index.html')) {
        updateChartsTheme(newTheme);
    }
}

// Update charts theme
function updateChartsTheme(theme) {
    const textColor = theme === 'dark' ? '#e0e0e0' : '#333';
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Update status chart
    if (statusChart) {
        statusChart.options.plugins.title.color = textColor;
        statusChart.options.plugins.legend.labels.color = textColor;
        statusChart.update();
    }
    
    // Update category chart
    if (categoryChart) {
        categoryChart.options.plugins.title.color = textColor;
        categoryChart.options.plugins.legend.labels.color = textColor;
        categoryChart.options.scales.y.ticks.color = textColor;
        categoryChart.options.scales.x.ticks.color = textColor;
        categoryChart.options.scales.y.grid.color = gridColor;
        categoryChart.options.scales.x.grid.color = gridColor;
        categoryChart.update();
    }
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set correct icon
    const themeIcon = document.querySelector('.theme-btn i');
    if (savedTheme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}

// Event Listeners
window.onload = function() {
    if (window.location.pathname.includes('index.html')) {
        updateStats();
        initCharts();
    } else {
        loadTasks();
    }
    startAutoRefresh();
    initTheme();
}

window.onbeforeunload = function() {
    stopAutoRefresh();
}

document.addEventListener('DOMContentLoaded', function() {
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }
}); 
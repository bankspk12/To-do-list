/**
 * Sidebar Module - Handles Navigation, Sidebar Toggle, Mobile Sidebar, and Event Binding
 */
window.SidebarModule = (function() {
    async function load() {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        try {
            const res = await fetch('components/sidebar.html');
            const html = await res.text();
            container.innerHTML = html;
            setupEvents();
            highlightNav();

            // Re-sync Theme Icon after Sidebar HTML Injection (Issue 7 Fix)
            if (window.ThemeModule) window.ThemeModule.init();
        } catch (e) {
            console.error('Failed to load sidebar:', e);
        }
    }

    function setupEvents() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('toggleSidebarBtn', toggleSidebar);
        bind('mobileMenuBtn', toggleMobileSidebar);
        bind('sidebarOverlay', closeMobileSidebar);

        bind('themeToggleBtn', () => {
            if (window.ThemeModule) window.ThemeModule.toggle();
        });
        bind('exportPdfBtn', () => {
            if (window.ExportModule) window.ExportModule.exportToPDF();
        });
        bind('exportExcelBtn', () => {
            if (window.ExportModule) window.ExportModule.exportToExcel();
        });
        bind('quickAddShortcutBtn', () => {
            closeMobileSidebar();
            if (window.ModalsModule) window.ModalsModule.openQuickInbox();
        });

        // Close mobile menu when navigating links
        document.querySelectorAll('#sidebar .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                closeMobileSidebar();
            });
        });
    }

    function highlightNav() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const path = window.location.href.toLowerCase();
        let navId = 'nav-dashboard';
        if (path.includes('tasks')) navId = 'nav-tasks';
        else if (path.includes('report')) navId = 'nav-report';

        const el = document.getElementById(navId);
        if (el) el.classList.add('active');
    }

    function toggleSidebar() {
        const s = document.getElementById('sidebar');
        const m = document.getElementById('mainContent');
        if (s) s.classList.toggle('collapsed');
        if (m) m.classList.toggle('expanded');
    }

    function toggleMobileSidebar() {
        const s = document.getElementById('sidebar');
        const o = document.getElementById('sidebarOverlay');
        if (s) s.classList.toggle('open');
        if (o) o.classList.toggle('show');
    }

    function closeMobileSidebar() {
        const s = document.getElementById('sidebar');
        const o = document.getElementById('sidebarOverlay');
        if (s) s.classList.remove('open');
        if (o) o.classList.remove('show');
    }

    return { load, highlightNav };
})();

/**
 * Theme Module - Centralized Theme Management
 */
window.ThemeModule = (function() {
    let currentTheme = localStorage.getItem('theme') || 'dark';

    function init() {
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateIcon();
    }

    function toggle() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateIcon();
        return currentTheme;
    }

    function updateIcon() {
        const i = document.querySelector('.theme-btn i');
        if (i) i.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    function getTheme() {
        return currentTheme;
    }

    return { init, toggle, getTheme };
})();

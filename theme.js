

const STORAGE_KEY = 'theme';

export function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'light';
    applyTheme(saved, false);
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
}

function applyTheme(theme, animate) {
    const root = document.documentElement;

    if (animate) {
        root.classList.add('theme-transition');
        setTimeout(function () { root.classList.remove('theme-transition'); }, 400);
    }

    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }

    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcon(theme);
}

function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
    }
}

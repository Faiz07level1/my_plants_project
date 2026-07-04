import { showToast } from './utils.js';
import { syncUserDataFromServer } from './data.js';

export async function initAuth() {
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
        await syncUserDataFromServer();
        hideAuthModal();
        updateUserBar(currentUser);
    }
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
}

// Показываем имя текущего пользователя в шапке сайдбара
function updateUserBar(username) {
    const nameEl = document.getElementById('current-user-name');
    if (nameEl) nameEl.textContent = username || '—';
}

// Смена пользователя: очищаем localStorage и возвращаемся к экрану входа.
// Отдельной страницы login.html в проекте нет — вход оформлен как модальное
// окно поверх index.html, поэтому просто перезагружаем страницу: при
// отсутствии current_user в localStorage initAuth() снова покажет это окно.
export function switchAccount() {
    const confirmed = confirm('Сменить пользователя? Вы выйдете из текущего аккаунта.');
    if (!confirmed) return;

    try {
        localStorage.removeItem('current_user');
        localStorage.removeItem('notified_water');
        localStorage.removeItem('notified_repot');
    } catch (error) {
        console.error('Не удалось очистить localStorage:', error);
    }

    window.location.reload();
}

export function toggleAuthForms(event, target) {
    event.preventDefault();
    const loginBox = document.getElementById('login-form-box');
    const signupBox = document.getElementById('signup-form-box');
    
    if (target === 'signup') {
        loginBox.style.display = 'none';
        signupBox.style.display = 'block';
    } else {
        loginBox.style.display = 'block';
        signupBox.style.display = 'none';
    }
}

export async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('current_user', result.username || username);
            await syncUserDataFromServer();
            hideAuthModal();
            updateUserBar(result.username || username);
            showToast("Вы успешно вошли!");
        } else {
            showToast(result.message || "Неверное имя пользователя или пароль");
        }
    } catch (error) {
        showToast("Не удалось связаться с сервером");
    }
}

export async function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (username.length < 3 || password.length < 4) {
        showToast("Никнейм от 3 симв., пароль от 4 симв.!");
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('current_user', result.username || username);
            await syncUserDataFromServer();
            hideAuthModal();
            updateUserBar(result.username || username);
            showToast("Регистрация успешна!");
        } else {
            showToast(result.message || "Ошибка регистрации");
        }
    } catch (error) {
        showToast("Не удалось связаться с сервером");
    }
}


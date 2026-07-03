import { showToast } from './utils.js';
import { syncUserDataFromServer } from './data.js';

export async function initAuth() {
    const currentUser = localStorage.getItem('current_user');
    
    if (currentUser) {
        await syncUserDataFromServer();
        hideAuthModal();
    } else {
        const container = document.getElementById('auth-container');
        if (container) {
            try {
                const response = await fetch('./auth.html');
                if (response.ok) {
                    container.innerHTML = await response.text();
                }
            } catch (error) {
                console.error("Не удалось загрузить формы авторизации:", error);
            }
        }
    }
}

function hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
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
            showToast("Регистрация успешна!");
        } else {
            showToast(result.message || "Ошибка регистрации");
        }
    } catch (error) {
        showToast("Не удалось связаться с сервером");
    }
}


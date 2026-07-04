
import { showToast } from './utils.js';

const HISTORY_KEY = 'recognition_history';
const MAX_HISTORY = 10;


export function initRecognize() {
    const dropzone = document.getElementById('recognize-dropzone');
    const fileInput = document.getElementById('recognize-file-input');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', function () {
        fileInput.click();
    });

    fileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    });

    renderHistory();
}


function processFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Пожалуйста, выберите файл изображения');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('Файл слишком большой (макс. 10 МБ)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        sendForRecognition(event.target.result);
    };
    reader.readAsDataURL(file);
}

async function sendForRecognition(base64) {
    showLoading(true);
    hideResult();

    try {
        const response = await fetch('/api/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
        });

        const result = await response.json();
        showLoading(false);

        if (result.success) {
            showSuccessResult(result, base64);
            addToHistory(result, base64);
        } else {
            showErrorResult(result);
        }

    } catch (error) {
        showLoading(false);
        showErrorResult({
            error: 'no_internet',
            message: 'Не удалось связаться с сервером. Проверьте подключение к интернету.'
        });
    }
}


function showLoading(show) {
    const loading = document.getElementById('recognize-loading');
    const dropzone = document.getElementById('recognize-dropzone');
    if (loading) loading.style.display = show ? 'block' : 'none';
    if (dropzone) dropzone.style.display = show ? 'none' : 'block';
}

function hideResult() {
    const container = document.getElementById('recognize-result');
    if (container) { container.style.display = 'none'; container.innerHTML = ''; }
}

function showSuccessResult(result, base64) {
    const container = document.getElementById('recognize-result');
    if (!container) return;

    const accuracyText = result.accuracy !== null ? result.accuracy + '%' : '—';

    let catalogMatchHtml = '';
    if (result.catalogMatch) {
        catalogMatchHtml =
            '<p style="margin-top:8px;">✅ Найдено в справочнике: <strong>' + escapeHtml(result.catalogMatch.name) + '</strong></p>' +
            '<button class="btn btn-primary btn-goto-catalog" data-id="' + result.catalogMatch.id + '">Открыть карточку в справочнике</button>';
    } else {
        catalogMatchHtml =
            '<p style="margin-top:8px;color:var(--color-card-text-muted);">В нашем справочнике не найдено. Попробуйте ' +
            '<a href="https://www.google.com/search?q=' + encodeURIComponent(result.guessedName + ' растение') + '" target="_blank" rel="noopener" style="color:var(--color-accent);">найти в интернете</a>.</p>';
    }

    let altHtml = '';
    if (result.alternativeSuggestions && result.alternativeSuggestions.length > 0) {
        altHtml = '<p style="margin-top:12px;font-size:0.85rem;color:var(--color-card-text-muted);">Другие варианты: ' +
            result.alternativeSuggestions.map(function (s) { return s.name + ' (' + s.accuracy + '%)'; }).join(', ') + '</p>';
    }

    container.innerHTML =
        '<img class="recognize-result-photo" src="' + base64 + '" alt="Распознаваемое фото">' +
        '<div class="recognize-result-info">' +
            '<h3>' + escapeHtml(result.guessedName) + '</h3>' +
            '<div class="recognize-accuracy">Точность: ' + accuracyText + '</div>' +
            catalogMatchHtml +
            altHtml +
            '<div class="recognize-result-actions">' +
                '<button class="btn btn-secondary" onclick="resetRecognize()">📷 Загрузить другое фото</button>' +
            '</div>' +
        '</div>';

    container.style.display = 'flex';

    const gotoBtn = container.querySelector('.btn-goto-catalog');
    if (gotoBtn) {
        gotoBtn.addEventListener('click', function () {
            const catalogId = parseInt(this.getAttribute('data-id'));
            if (window.showCatalogCard) window.showCatalogCard(catalogId);
        });
    }
}

function showErrorResult(result) {
    const container = document.getElementById('recognize-result');
    if (!container) return;

    const errorMessages = {
        no_image: 'Изображение не было передано.',
        no_api_key: 'На сервере не настроен ключ Plant.id (см. файл .env).',
        no_internet: 'Не удалось связаться с сервисом распознавания. Проверьте подключение к интернету.',
        rate_limit: 'Превышен лимит бесплатных запросов Plant.id. Попробуйте позже.',
        not_recognized: 'Не удалось распознать растение. Попробуйте другое фото — крупным планом, при хорошем освещении.',
        api_error: 'Сервис распознавания временно недоступен. Попробуйте позже.',
        server_error: 'Внутренняя ошибка сервера.'
    };

    const message = result.message || errorMessages[result.error] || 'Неизвестная ошибка.';

    container.innerHTML =
        '<div class="recognize-error-box" style="width:100%;">' +
            '<p><strong>Не удалось распознать</strong></p>' +
            '<p>' + escapeHtml(message) + '</p>' +
            '<button class="btn btn-secondary" onclick="resetRecognize()" style="margin-top:14px;">📷 Попробовать ещё раз</button>' +
        '</div>';

    container.style.display = 'flex';
}
export function resetRecognize() {
    hideResult();
    const dropzone = document.getElementById('recognize-dropzone');
    if (dropzone) dropzone.style.display = 'block';
    const fileInput = document.getElementById('recognize-file-input');
    if (fileInput) fileInput.value = '';
}


function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) { return []; }
}

function addToHistory(result, base64) {
    const history = getHistory();

    history.unshift({
        name: result.guessedName,
        accuracy: result.accuracy,
        photo: result.savedPhotoUrl || base64.slice(0, 200),
        date: new Date().toLocaleString('ru-RU')
    });

    // Оставляем только 10 последних
    while (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    renderHistory();
}

export function renderHistory() {
    const container = document.getElementById('recognize-history-list');
    if (!container) return;

    const history = getHistory();
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--color-card-text-muted);">Пока ничего не распознано.</p>';
        return;
    }

    history.forEach(function (item) {
        const card = document.createElement('div');
        card.className = 'recognize-history-item';

        // Фото может быть URL (с сервера) или обрезанный base64 (fallback)
        const imgSrc = item.photo && item.photo.startsWith('/')
            ? item.photo
            : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e6f4ea"/><text x="50" y="58" font-size="40" text-anchor="middle">📷</text></svg>';

        card.innerHTML =
            '<img src="' + imgSrc + '" alt="' + escapeHtml(item.name) + '">' +
            '<div><strong>' + escapeHtml(item.name) + '</strong></div>' +
            '<div>' + (item.accuracy !== null ? item.accuracy + '%' : '') + '</div>' +
            '<div style="font-size:0.7rem;color:var(--color-card-text-muted);">' + item.date + '</div>';

        container.appendChild(card);
    });
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

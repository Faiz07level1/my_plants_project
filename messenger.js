
import { showToast } from './utils.js';

// Текущий открытый чат (null = ничего не выбрано)
let currentChatId = null;
// Информация о текущем чате (для меню: blocked/pinned/muted/isGroup)
let currentChatMeta = null;
// Список участников для создания группового чата
let pendingGroupMembers = [];
// Счётчик сообщений по чатам, чтобы определять «новые»
let lastKnownCounts = {};
// Интервал автообновления
let messengerPollInterval = null;

function getUsername() {
    return localStorage.getItem('current_user') || '';
}



export async function renderMessengerChatList() {
    const container = document.getElementById('messenger-chat-list');
    if (!container) return;

    const username = getUsername();
    if (!username) {
        container.innerHTML = '<p>Войдите в систему, чтобы увидеть чаты.</p>';
        return;
    }

    try {
        const response = await fetch('/api/messenger/chats?username=' + encodeURIComponent(username));
        const chats = await response.json();

        container.innerHTML = '';
        let totalUnread = 0;

        if (chats.length === 0) {
            container.innerHTML = '<p style="color:var(--color-card-text-muted);padding:20px;text-align:center;">Нет чатов. Найдите пользователя или создайте группу!</p>';
        }

        chats.forEach(function (chat) {
            totalUnread += chat.unreadCount;

            const item = document.createElement('div');
            item.className = 'messenger-chat-item' + (chat.chatId === currentChatId ? ' active' : '');

            const pinIcon = chat.pinned ? '📌 ' : '';
            const muteIcon = chat.muted ? ' 🔕' : '';
            const groupIcon = chat.isGroup ? '👥 ' : '';

            let previewText = '';
            if (chat.lastMessage) {
                previewText = chat.lastMessage.username + ': ' + chat.lastMessage.message;
                if (previewText.length > 50) previewText = previewText.slice(0, 47) + '...';
            }

            item.innerHTML =
                '<div class="messenger-chat-item-top">' +
                    '<div class="messenger-chat-item-name">' + pinIcon + groupIcon + chat.title + muteIcon + '</div>' +
                    (chat.unreadCount > 0 ? '<div class="messenger-unread-dot">' + chat.unreadCount + '</div>' : '') +
                '</div>' +
                (previewText ? '<div class="messenger-chat-item-preview">' + escapeHtml(previewText) + '</div>' : '');

            item.addEventListener('click', function () {
                openChat(chat.chatId, chat);
            });

            container.appendChild(item);
        });

        updateMessengerBadge(totalUnread);

        chats.forEach(function (chat) {
            const prevCount = lastKnownCounts[chat.chatId] || 0;
            const currentTotal = chat.lastMessage ? 1 : 0; // упрощённо
            if (chat.unreadCount > 0 && !chat.muted) {
                // Если чат не замьючен и есть непрочитанные — уведомляем
                const key = 'messenger_notified_' + chat.chatId;
                const prevNotified = parseInt(localStorage.getItem(key) || '0', 10);
                if (chat.unreadCount > prevNotified) {
                    playNotificationSound();
                    showBrowserNotification(chat.title, chat.lastMessage ? chat.lastMessage.message : '');
                    localStorage.setItem(key, String(chat.unreadCount));
                }
            } else {
                localStorage.removeItem('messenger_notified_' + chat.chatId);
            }
        });

    } catch (error) {
        console.error('Ошибка загрузки списка чатов:', error);
    }
}



async function openChat(chatId, meta) {
    currentChatId = chatId;
    currentChatMeta = meta || {};

    const emptyState = document.getElementById('messenger-empty-state');
    const activeChat = document.getElementById('messenger-active-chat');
    if (emptyState) emptyState.style.display = 'none';
    if (activeChat) activeChat.style.display = 'flex';

    const titleEl = document.getElementById('messenger-chat-title');
    const subtitleEl = document.getElementById('messenger-chat-subtitle');
    if (titleEl) titleEl.textContent = meta.title || chatId;
    if (subtitleEl) {
        if (meta.isGroup && meta.members) {
            subtitleEl.textContent = 'Участники: ' + meta.members.join(', ');
        } else {
            subtitleEl.textContent = '';
        }
    }

    updateChatMenuButtons();

    document.querySelectorAll('.messenger-chat-item').forEach(function (el) {
        el.classList.remove('active');
    });
    const items = document.querySelectorAll('.messenger-chat-item');
    items.forEach(function (el) {
      
    });

    await loadChatMessages();
    renderMessengerChatList(); 
}

export async function loadChatMessages() {
    if (!currentChatId) return;
    const container = document.getElementById('messenger-messages');
    if (!container) return;

    const username = getUsername();

    try {
        const response = await fetch('/api/messenger/messages/' + encodeURIComponent(currentChatId) + '?username=' + encodeURIComponent(username));
        const messages = await response.json();
        renderChatMessages(messages, container, username);
    } catch (error) {
        console.error('Ошибка загрузки сообщений мессенджера:', error);
    }
}

function renderChatMessages(messages, container, myUsername) {
    const wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 20;
    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="chat-empty">Начните переписку!</p>';
        return;
    }

    messages.forEach(function (msg) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-message';
        if (msg.username === myUsername) {
            bubble.style.alignSelf = 'flex-end';
            bubble.style.background = 'var(--color-accent-light)';
        }

        const author = document.createElement('span');
        author.className = 'chat-author';
        author.textContent = msg.username + ': ';

        const text = document.createElement('span');
        text.className = 'chat-text';
        text.textContent = msg.message;

        const time = document.createElement('span');
        time.className = 'chat-time';
        time.textContent = formatTime(msg.createdAt);

        bubble.appendChild(author);
        bubble.appendChild(text);
        bubble.appendChild(time);
        container.appendChild(bubble);
    });

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function formatTime(isoString) {
    try {
        return new Date(isoString).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return ''; }
}



export async function sendMessengerMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messenger-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text || !currentChatId) return;

    const username = getUsername();
    if (!username) { showToast('Сначала войдите в систему'); return; }

    try {
        const response = await fetch('/api/messenger/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: currentChatId, fromUsername: username, text: text })
        });

        if (!response.ok) {
            const err = await response.json().catch(function () { return {}; });
            showToast(err.error || 'Не удалось отправить сообщение');
            return;
        }

        input.value = '';
        await loadChatMessages();
        renderMessengerChatList();
    } catch (error) {
        showToast('Ошибка отправки сообщения');
    }
}



export function openUserSearchModal() {
    document.getElementById('user-search-modal').style.display = 'flex';
    document.getElementById('user-search-input').value = '';
    document.getElementById('user-search-results').innerHTML = '';
    document.getElementById('user-search-input').focus();
}

export function closeUserSearchModal() {
    document.getElementById('user-search-modal').style.display = 'none';
}

export async function handleUserSearchInput(query) {
    const container = document.getElementById('user-search-results');
    if (!container) return;

    if (!query.trim()) { container.innerHTML = ''; return; }

    const username = getUsername();
    try {
        const response = await fetch('/api/messenger/users/search?query=' + encodeURIComponent(query) + '&me=' + encodeURIComponent(username));
        const users = await response.json();

        container.innerHTML = '';
        users.forEach(function (u) {
            const item = document.createElement('div');
            item.className = 'user-search-result-item';
            item.innerHTML =
                '<span>' + escapeHtml(u.username) + '</span>' +
                '<button class="btn btn-primary">Написать</button>';
            item.querySelector('button').addEventListener('click', function () {
                closeUserSearchModal();
                startDmChat(u.username);
            });
            container.appendChild(item);
        });

        if (users.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--color-card-text-muted);">Никого не найдено</p>';
        }
    } catch (error) {
        console.error('Ошибка поиска пользователей:', error);
    }
}

async function startDmChat(toUsername) {
    const username = getUsername();
    
    const chatId = [username, toUsername].sort(function (a, b) { return a.localeCompare(b); }).join('__');
    openChat(chatId, { chatId: chatId, title: toUsername, otherUser: toUsername, isGroup: false });
}



export function openCreateGroupModal() {
    pendingGroupMembers = [];
    document.getElementById('create-group-modal').style.display = 'flex';
    document.getElementById('group-name-input').value = '';
    document.getElementById('group-members-search').value = '';
    document.getElementById('group-members-results').innerHTML = '';
    renderSelectedGroupMembers();
}

export function closeCreateGroupModal() {
    document.getElementById('create-group-modal').style.display = 'none';
}

export async function handleGroupMemberSearch(query) {
    const container = document.getElementById('group-members-results');
    if (!container) return;
    if (!query.trim()) { container.innerHTML = ''; return; }

    const username = getUsername();
    try {
        const response = await fetch('/api/messenger/users/search?query=' + encodeURIComponent(query) + '&me=' + encodeURIComponent(username));
        const users = await response.json();
        container.innerHTML = '';

        users.forEach(function (u) {
            if (pendingGroupMembers.includes(u.username)) return; // уже добавлен
            const item = document.createElement('div');
            item.className = 'user-search-result-item';
            item.innerHTML =
                '<span>' + escapeHtml(u.username) + '</span>' +
                '<button class="btn btn-secondary">+ Добавить</button>';
            item.querySelector('button').addEventListener('click', function () {
                pendingGroupMembers.push(u.username);
                renderSelectedGroupMembers();
                handleGroupMemberSearch(document.getElementById('group-members-search').value);
            });
            container.appendChild(item);
        });
    } catch (error) {
        console.error(error);
    }
}

function renderSelectedGroupMembers() {
    const container = document.getElementById('group-members-selected');
    if (!container) return;
    container.innerHTML = '';

    pendingGroupMembers.forEach(function (name) {
        const chip = document.createElement('div');
        chip.className = 'group-member-chip';
        chip.innerHTML = escapeHtml(name) + ' <button data-remove="' + name + '">✕</button>';
        chip.querySelector('button').addEventListener('click', function () {
            pendingGroupMembers = pendingGroupMembers.filter(function (n) { return n !== name; });
            renderSelectedGroupMembers();
        });
        container.appendChild(chip);
    });
}

export async function submitCreateGroup() {
    const name = document.getElementById('group-name-input').value.trim();
    if (!name) { showToast('Введите название группы'); return; }
    if (pendingGroupMembers.length === 0) { showToast('Добавьте хотя бы одного участника'); return; }

    const username = getUsername();
    try {
        const response = await fetch('/api/messenger/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, members: pendingGroupMembers, owner: username })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            closeCreateGroupModal();
            showToast('Группа «' + name + '» создана!');
            await renderMessengerChatList();
            openChat(result.chatId, {
                chatId: result.chatId,
                title: name,
                isGroup: true,
                members: result.group.members
            });
        } else {
            showToast(result.error || 'Ошибка создания группы');
        }
    } catch (error) {
        showToast('Не удалось создать группу');
    }
}



export function toggleChatMenu() {
    const menu = document.getElementById('messenger-chat-menu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function closeChatMenu() {
    const menu = document.getElementById('messenger-chat-menu');
    if (menu) menu.style.display = 'none';
}

function updateChatMenuButtons() {
    const meta = currentChatMeta || {};
    const blockBtn = document.getElementById('messenger-block-btn');
    const pinBtn = document.getElementById('messenger-pin-btn');
    const muteBtn = document.getElementById('messenger-mute-btn');
    const renameBtn = document.getElementById('messenger-rename-btn');

    if (blockBtn) {
        blockBtn.style.display = meta.isGroup ? 'none' : 'block';
        blockBtn.textContent = meta.blocked ? '✅ Разблокировать пользователя' : '🚫 Заблокировать пользователя';
    }
    if (pinBtn) pinBtn.textContent = meta.pinned ? '📌 Открепить чат' : '📌 Закрепить чат';
    if (muteBtn) muteBtn.textContent = meta.muted ? '🔔 Включить уведомления' : '🔕 Отключить уведомления';
    if (renameBtn) renameBtn.style.display = meta.isGroup ? 'block' : 'none';
}

export async function handleBlockToggle() {
    closeChatMenu();
    if (!currentChatMeta || !currentChatMeta.otherUser) return;
    const username = getUsername();
    const nowBlocked = !currentChatMeta.blocked;

    try {
        await fetch('/api/messenger/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, target: currentChatMeta.otherUser, block: nowBlocked })
        });
        currentChatMeta.blocked = nowBlocked;
        updateChatMenuButtons();
        showToast(nowBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    } catch (error) {
        showToast('Ошибка');
    }
}

export async function handlePinToggle() {
    closeChatMenu();
    if (!currentChatId) return;
    const username = getUsername();
    const nowPinned = !currentChatMeta.pinned;

    try {
        await fetch('/api/messenger/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, chatId: currentChatId, pin: nowPinned })
        });
        currentChatMeta.pinned = nowPinned;
        updateChatMenuButtons();
        renderMessengerChatList();
        showToast(nowPinned ? 'Чат закреплён' : 'Чат откреплён');
    } catch (error) {
        showToast('Ошибка');
    }
}

export async function handleMuteToggle() {
    closeChatMenu();
    if (!currentChatId) return;
    const username = getUsername();
    const nowMuted = !currentChatMeta.muted;

    try {
        await fetch('/api/messenger/mute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, chatId: currentChatId, mute: nowMuted })
        });
        currentChatMeta.muted = nowMuted;
        updateChatMenuButtons();
        renderMessengerChatList();
        showToast(nowMuted ? 'Уведомления отключены' : 'Уведомления включены');
    } catch (error) {
        showToast('Ошибка');
    }
}

export function handleDeleteChat() {
    closeChatMenu();
    document.getElementById('confirm-delete-chat-modal').style.display = 'flex';
}

export function closeConfirmDeleteChatModal() {
    document.getElementById('confirm-delete-chat-modal').style.display = 'none';
}

export async function confirmDeleteChat() {
    closeConfirmDeleteChatModal();
    if (!currentChatId) return;
    const username = getUsername();

    try {
        await fetch('/api/messenger/chats/' + encodeURIComponent(currentChatId), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });
        currentChatId = null;
        currentChatMeta = null;

        const emptyState = document.getElementById('messenger-empty-state');
        const activeChat = document.getElementById('messenger-active-chat');
        if (emptyState) emptyState.style.display = 'flex';
        if (activeChat) activeChat.style.display = 'none';

        showToast('Чат удалён');
        renderMessengerChatList();
    } catch (error) {
        showToast('Ошибка удаления чата');
    }
}

export async function handleRenameGroup() {
    closeChatMenu();
    if (!currentChatMeta || !currentChatMeta.isGroup) return;
    const newName = prompt('Новое название группы:', currentChatMeta.title);
    if (!newName || !newName.trim()) return;

    try {
        await fetch('/api/messenger/groups/' + encodeURIComponent(currentChatId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });
        currentChatMeta.title = newName.trim();
        const titleEl = document.getElementById('messenger-chat-title');
        if (titleEl) titleEl.textContent = newName.trim();
        renderMessengerChatList();
        showToast('Группа переименована');
    } catch (error) {
        showToast('Ошибка переименования');
    }
}



function updateMessengerBadge(count) {
    const badge = document.getElementById('messenger-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = String(count);
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0.15;
        osc.start();
        osc.frequency.setValueAtTime(520, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.2);
    } catch (error) {
    }
}

function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💬 ' + title, { body: body || 'Новое сообщение' });
    }
}


export function startMessengerPolling() {
    stopMessengerPolling();
    messengerPollInterval = setInterval(async function () {
        await renderMessengerChatList();
        if (currentChatId) await loadChatMessages();
    }, 5000);
}

export function stopMessengerPolling() {
    if (messengerPollInterval) {
        clearInterval(messengerPollInterval);
        messengerPollInterval = null;
    }
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

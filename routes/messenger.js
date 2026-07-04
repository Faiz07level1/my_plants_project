import express from 'express';
import { readDB, writeDB } from '../db.js';

export const messengerRouter = express.Router();

function dmChatId(userA, userB) {
    return [userA, userB].sort(function (a, b) { return a.localeCompare(b); }).join('__');
}

function isGroupChatId(chatId) {
    return typeof chatId === 'string' && chatId.startsWith('group_');
}

messengerRouter.get('/users/search', function (req, res) {
    const query = String(req.query.query || '').trim().toLowerCase();
    const me = String(req.query.me || '');

    const db = readDB();
    const users = db.users || [];

    const results = users
        .filter(function (u) { return u.username !== me; })
        .filter(function (u) { return !query || u.username.toLowerCase().includes(query); })
        .map(function (u) { return { username: u.username }; });

    res.json(results);
});

messengerRouter.get('/chats', function (req, res) {
    const username = String(req.query.username || '');
    if (!username) return res.status(400).json({ error: 'Не передан username' });

    const db = readDB();
    const allChatIds = Object.keys(db.messages || {});
    const pinned = (db.pinnedChats && db.pinnedChats[username]) || [];
    const muted = (db.mutedChats && db.mutedChats[username]) || [];
    const blockedByMe = (db.blockedUsers && db.blockedUsers[username]) || [];
    const deletedByMe = (db.deletedFor && db.deletedFor[username]) || [];

    const myChatIds = allChatIds.filter(function (chatId) {
        if (deletedByMe.includes(chatId)) return false;
        if (isGroupChatId(chatId)) {
            const group = db.groups && db.groups[chatId];
            return group && group.members.includes(username);
        }
        const parts = chatId.split('__');
        return parts.includes(username);
    });

    const chats = myChatIds.map(function (chatId) {
        const messages = db.messages[chatId] || [];
        const lastMessage = messages.length ? messages[messages.length - 1] : null;
        const unreadCount = messages.filter(function (m) {
            return m.username !== username && !(m.readBy || []).includes(username);
        }).length;

        let title, isGroup = false, otherUser = null, members = null;

        if (isGroupChatId(chatId)) {
            isGroup = true;
            const group = db.groups[chatId] || { name: 'Группа', members: [] };
            title = group.name;
            members = group.members;
        } else {
            const parts = chatId.split('__');
            otherUser = parts.find(function (p) { return p !== username; }) || parts[0];
            title = otherUser;
        }

        return {
            chatId: chatId,
            isGroup: isGroup,
            title: title,
            otherUser: otherUser,
            members: members,
            lastMessage: lastMessage,
            unreadCount: unreadCount,
            pinned: pinned.includes(chatId),
            muted: muted.includes(chatId),
            blocked: otherUser ? blockedByMe.includes(otherUser) : false
        };
    });

    chats.sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
    });

    res.json(chats);
});

messengerRouter.get('/messages/:chatId', function (req, res) {
    const chatId = req.params.chatId;
    const username = String(req.query.username || '');

    const db = readDB();
    db.messages = db.messages || {};
    const messages = db.messages[chatId] || [];

    if (username) {
        let changed = false;
        messages.forEach(function (m) {
            if (m.username !== username && !(m.readBy || []).includes(username)) {
                m.readBy = m.readBy || [];
                m.readBy.push(username);
                changed = true;
            }
        });
        if (changed) writeDB(db);
    }

    res.json(messages);
});

messengerRouter.post('/messages', function (req, res) {
    try {
        const { chatId: incomingChatId, toUsername, fromUsername, text } = req.body;

        if (!fromUsername || !text || !String(text).trim()) {
            return res.status(400).json({ error: 'Не хватает данных: fromUsername и text обязательны' });
        }

        const db = readDB();
        db.messages = db.messages || {};
        db.blockedUsers = db.blockedUsers || {};

        let chatId = incomingChatId;
        if (!chatId) {
            if (!toUsername) return res.status(400).json({ error: 'Не указан получатель (toUsername) или chatId' });
            chatId = dmChatId(fromUsername, toUsername);
        }

        if (!isGroupChatId(chatId)) {
            const parts = chatId.split('__');
            const otherUser = parts.find(function (p) { return p !== fromUsername; }) || parts[0];
            const theyBlockedMe = (db.blockedUsers[otherUser] || []).includes(fromUsername);
            if (theyBlockedMe) {
                return res.status(403).json({ error: 'Пользователь заблокировал вас, сообщение не доставлено' });
            }
        } else {
            const group = db.groups && db.groups[chatId];
            if (!group || !group.members.includes(fromUsername)) {
                return res.status(403).json({ error: 'Вы не состоите в этой группе' });
            }
        }

        db.messages[chatId] = db.messages[chatId] || [];
        const newMessage = {
            id: Date.now(),
            username: String(fromUsername),
            message: String(text).trim(),
            createdAt: new Date().toISOString(),
            readBy: [fromUsername]
        };
        db.messages[chatId].push(newMessage);

        if (db.deletedFor) {
            Object.keys(db.deletedFor).forEach(function (u) {
                db.deletedFor[u] = db.deletedFor[u].filter(function (c) { return c !== chatId; });
            });
        }

        writeDB(db);

        res.json({ success: true, chatId: chatId, message: newMessage });
    } catch (error) {
        console.error('Ошибка отправки сообщения в мессенджере:', error);
        res.status(500).json({ error: 'Не удалось отправить сообщение' });
    }
});

messengerRouter.delete('/chats/:chatId', function (req, res) {
    const chatId = req.params.chatId;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Не передан username' });

    const db = readDB();
    db.pinnedChats = db.pinnedChats || {};
    db.mutedChats = db.mutedChats || {};
    db.deletedFor = db.deletedFor || {}; 

    db.deletedFor[username] = db.deletedFor[username] || [];
    if (!db.deletedFor[username].includes(chatId)) {
        db.deletedFor[username].push(chatId);
    }
    if (db.pinnedChats[username]) {
        db.pinnedChats[username] = db.pinnedChats[username].filter(function (c) { return c !== chatId; });
    }

    if (isGroupChatId(chatId) && db.groups && db.groups[chatId]) {
        db.groups[chatId].members = db.groups[chatId].members.filter(function (m) { return m !== username; });
    }

    writeDB(db);
    res.json({ success: true });
});

messengerRouter.post('/block', function (req, res) {
    const { username, target, block } = req.body;
    if (!username || !target) return res.status(400).json({ error: 'Не хватает данных' });

    const db = readDB();
    db.blockedUsers = db.blockedUsers || {};
    db.blockedUsers[username] = db.blockedUsers[username] || [];

    if (block) {
        if (!db.blockedUsers[username].includes(target)) {
            db.blockedUsers[username].push(target);
        }
    } else {
        db.blockedUsers[username] = db.blockedUsers[username].filter(function (u) { return u !== target; });
    }

    writeDB(db);
    res.json({ success: true, blocked: db.blockedUsers[username] });
});

messengerRouter.post('/pin', function (req, res) {
    const { username, chatId, pin } = req.body;
    if (!username || !chatId) return res.status(400).json({ error: 'Не хватает данных' });

    const db = readDB();
    db.pinnedChats = db.pinnedChats || {};
    db.pinnedChats[username] = db.pinnedChats[username] || [];

    if (pin) {
        if (!db.pinnedChats[username].includes(chatId)) {
            db.pinnedChats[username].push(chatId);
        }
    } else {
        db.pinnedChats[username] = db.pinnedChats[username].filter(function (c) { return c !== chatId; });
    }

    writeDB(db);
    res.json({ success: true });
});

messengerRouter.post('/mute', function (req, res) {
    const { username, chatId, mute } = req.body;
    if (!username || !chatId) return res.status(400).json({ error: 'Не хватает данных' });

    const db = readDB();
    db.mutedChats = db.mutedChats || {};
    db.mutedChats[username] = db.mutedChats[username] || [];

    if (mute) {
        if (!db.mutedChats[username].includes(chatId)) {
            db.mutedChats[username].push(chatId);
        }
    } else {
        db.mutedChats[username] = db.mutedChats[username].filter(function (c) { return c !== chatId; });
    }

    writeDB(db);
    res.json({ success: true });
});

messengerRouter.post('/groups', function (req, res) {
    const { name, members, owner } = req.body;
    if (!name || !Array.isArray(members) || !owner) {
        return res.status(400).json({ error: 'Нужны name, members[] и owner' });
    }

    const db = readDB();
    db.groups = db.groups || {};
    db.messages = db.messages || {};

    const chatId = 'group_' + Date.now();
    const allMembers = Array.from(new Set([owner].concat(members)));

    db.groups[chatId] = {
        name: String(name).trim() || 'Группа',
        members: allMembers,
        owner: owner,
        createdAt: new Date().toISOString()
    };
    db.messages[chatId] = [];

    writeDB(db);
    res.json({ success: true, chatId: chatId, group: db.groups[chatId] });
});

messengerRouter.patch('/groups/:chatId', function (req, res) {
    const chatId = req.params.chatId;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Пустое название' });

    const db = readDB();
    if (!db.groups || !db.groups[chatId]) {
        return res.status(404).json({ error: 'Группа не найдена' });
    }

    db.groups[chatId].name = name.trim();
    writeDB(db);
    res.json({ success: true, group: db.groups[chatId] });
});

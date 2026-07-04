
import { checkNotifications } from './notifications.js';
import { renderCatalog } from './catalog.js';
import { renderCollection } from './collection.js';
import { renderFavorites } from './favorites.js';
import { renderChatSelect, renderChatPage, stopChatAutoRefresh } from './chat.js';
import {
    renderMessengerChatList,
    startMessengerPolling,
    stopMessengerPolling
} from './messenger.js';
import { renderTradeOffers } from './trade.js';
import { initRecognize } from './recognize-client.js';

export function switchPage(pageId) {
    const currentActivePage = document.querySelector('.page.active');
    if (currentActivePage && currentActivePage.id === 'chat' && pageId !== 'chat') {
        stopChatAutoRefresh();
    }
    if (currentActivePage && currentActivePage.id === 'messenger' && pageId !== 'messenger') {
        stopMessengerPolling();
    }

    document.querySelectorAll('.page').forEach(function(page) { page.classList.remove('active'); });
    document.querySelectorAll('.menu-btn').forEach(function(btn) { btn.classList.remove('active'); });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(function(btn) {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes(pageId);
    });
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'chat-select') renderChatSelect();
    if (pageId === 'chat') renderChatPage();
    if (pageId === 'messenger') {
        renderMessengerChatList();
        startMessengerPolling();
    }
    if (pageId === 'trade') renderTradeOffers();
    if (pageId === 'recognize') initRecognize();
    
    checkNotifications();
}

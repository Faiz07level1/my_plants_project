import { checkNotifications } from './notifications.js';
import { renderCatalog } from './catalog.js';
import { renderCollection } from './collection.js';
import { renderFavorites } from './favorites.js';
import { renderTradeOffers } from './trade.js';
import { renderChats } from './chats.js';

export function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(function(page) { page.classList.remove('active'); });
    document.querySelectorAll('.menu-btn').forEach(function(btn) { btn.classList.remove('active'); });
    
    document.getElementById(pageId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(function(btn) {
        return btn.getAttribute('onclick').includes(pageId);
    });
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'catalog') renderCatalog();
    if (pageId === 'my-plants') renderCollection();
    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'trade-page') renderTradeOffers();
    if (pageId === 'chats-page') renderChats();
    
    checkNotifications();
}






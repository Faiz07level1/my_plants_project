import { loadPlantData } from './data.js';
import { switchPage } from './navigation.js';
import { toggleFavorite } from './favorites.js';
import { saveToCollection, renderCollection, updateTimers } from './collection.js';
import { renderCatalog, showCatalogCard } from './catalog.js';
import { checkNotifications } from './notifications.js';
import { requestNotificationPermission } from './utils.js';
import { initAuth, toggleAuthForms, handleLogin, handleSignup } from './auth.js';
import { openCreateOfferModal, closeCreateOfferModal, handleCreateOffer, handleTradePlantChange, cancelTradeOffer } from './trade.js';
import { handleSendMessage, startChatWith, executeTrade } from './chats.js';
import { getRecommendations } from './recommendations.js';

window.switchPage = switchPage;
window.toggleFavorite = toggleFavorite;
window.saveToCollection = saveToCollection;
window.showCatalogCard = showCatalogCard;
window.toggleAuthForms = toggleAuthForms;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.openCreateOfferModal = openCreateOfferModal;
window.closeCreateOfferModal = closeCreateOfferModal;
window.handleCreateOffer = handleCreateOffer;
window.handleSendMessage = handleSendMessage;
window.startChatWith = startChatWith;
window.handleTradePlantChange = handleTradePlantChange;
window.cancelTradeOffer = cancelTradeOffer;
window.executeTrade = executeTrade;
window.getRecommendations = getRecommendations;

async function startApplication() {
    await initAuth();
    await loadPlantData();
    renderCatalog();
    requestNotificationPermission();

    setInterval(function() {
        if (document.getElementById('my-plants').classList.contains('active')) {
            updateTimers();
        }
        checkNotifications();
    }, 1000);
}

startApplication();
























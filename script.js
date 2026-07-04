

import { loadPlantData } from './data.js';
import { switchPage } from './navigation.js';
import { toggleFavorite } from './favorites.js';
import { saveToCollection, renderCollection, updateTimers } from './collection.js';
import { renderCatalog, showCatalogCard, filterCatalog, setActiveFilter } from './catalog.js';
import { checkNotifications } from './notifications.js';
import { requestNotificationPermission } from './utils.js';
import { initAuth, toggleAuthForms, handleLogin, handleSignup, switchAccount } from './auth.js';
import { sendChatMessage, loadMessages, openPlantChat } from './chat.js';
import { initTheme, toggleTheme } from './theme.js';
import {
    renderMessengerChatList,
    sendMessengerMessage,
    openUserSearchModal,
    closeUserSearchModal,
    handleUserSearchInput,
    openCreateGroupModal,
    closeCreateGroupModal,
    handleGroupMemberSearch,
    submitCreateGroup,
    toggleChatMenu,
    handleBlockToggle,
    handlePinToggle,
    handleMuteToggle,
    handleDeleteChat,
    closeConfirmDeleteChatModal,
    confirmDeleteChat,
    handleRenameGroup
} from './messenger.js';
import {
    renderTradeOffers,
    setTradeTab,
    openTradeOfferModal,
    closeTradeOfferModal,
    submitTradeOffer
} from './trade.js';
import { resetRecognize } from './recognize-client.js';

window.switchPage = switchPage;

window.filterCatalog = filterCatalog;
window.setActiveFilter = setActiveFilter;
window.showCatalogCard = showCatalogCard;

window.toggleFavorite = toggleFavorite;
window.saveToCollection = saveToCollection;

window.toggleAuthForms = toggleAuthForms;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.switchAccount = switchAccount;

window.sendChatMessage = sendChatMessage;
window.loadMessages = loadMessages;
window.openPlantChat = openPlantChat;

window.toggleTheme = toggleTheme;

window.sendMessengerMessage = sendMessengerMessage;
window.openUserSearchModal = openUserSearchModal;
window.closeUserSearchModal = closeUserSearchModal;
window.handleUserSearchInput = handleUserSearchInput;
window.openCreateGroupModal = openCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.handleGroupMemberSearch = handleGroupMemberSearch;
window.submitCreateGroup = submitCreateGroup;
window.toggleChatMenu = toggleChatMenu;
window.handleBlockToggle = handleBlockToggle;
window.handlePinToggle = handlePinToggle;
window.handleMuteToggle = handleMuteToggle;
window.handleDeleteChat = handleDeleteChat;
window.closeConfirmDeleteChatModal = closeConfirmDeleteChatModal;
window.confirmDeleteChat = confirmDeleteChat;
window.handleRenameGroup = handleRenameGroup;

window.setTradeTab = setTradeTab;
window.openTradeOfferModal = openTradeOfferModal;
window.closeTradeOfferModal = closeTradeOfferModal;
window.submitTradeOffer = submitTradeOffer;

window.resetRecognize = resetRecognize;


async function startApplication() {
    initTheme();

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

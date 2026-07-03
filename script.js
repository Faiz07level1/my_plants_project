import { loadPlantData } from './data.js';
import { switchPage } from './navigation.js';
import { toggleFavorite } from './favorites.js';
import { saveToCollection, renderCollection, updateTimers } from './collection.js';
import { renderCatalog, showCatalogCard } from './catalog.js';
import { checkNotifications } from './notifications.js';
import { requestNotificationPermission } from './utils.js';
import { initAuth, toggleAuthForms, handleLogin, handleSignup } from './auth.js';

window.switchPage = switchPage;
window.toggleFavorite = toggleFavorite;
window.saveToCollection = saveToCollection;
window.showCatalogCard = showCatalogCard;
window.toggleAuthForms = toggleAuthForms;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;

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

















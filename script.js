import { switchPage } from './navigation.js';
import { toggleFavorite } from './favorites.js';
import { saveToCollection, renderCollection, updateTimers } from './collection.js';
import { renderCatalog } from './catalog.js';
import { checkNotifications } from './notifications.js';
import { requestNotificationPermission } from './utils.js';

window.switchPage = switchPage;
window.toggleFavorite = toggleFavorite;
window.saveToCollection = saveToCollection;

renderCatalog();
requestNotificationPermission();

setInterval(function() {
    if (document.getElementById('my-plants').classList.contains('active')) {
        updateTimers();
    }
    checkNotifications();
}, 1000);















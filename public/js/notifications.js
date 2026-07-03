import { userCollection } from './data.js';
import { getTimeLeft, sendSystemNotification } from './utils.js';

export function checkNotifications() {
    const panel = document.getElementById('alert-panel');
    const list = document.getElementById('alert-list');
    if (!panel || !list) return;
    list.innerHTML = '';
    
    let notifiedWater = JSON.parse(localStorage.getItem('notified_water')) || {};
    let notifiedRepot = JSON.parse(localStorage.getItem('notified_repot')) || {};
    
    let activeAlerts = 0;

    userCollection.forEach(function(plant) {
        const waterStatus = getTimeLeft(plant.lastWatered, plant.waterIntervalMinutes, "");
        const repotStatus = getTimeLeft(plant.lastRepotted, plant.repotIntervalMinutes, "");

        if (waterStatus.isOverdue) {
            const li = document.createElement('li');
            li.textContent = '💧 Полить ' + plant.name;
            list.appendChild(li);
            activeAlerts++;

            if (!notifiedWater[plant.instanceId]) {
                sendSystemNotification("Время полива! 💧", "Срочно полейте растение: " + plant.name);
                notifiedWater[plant.instanceId] = true;
            }
        }
        
        if (repotStatus.isOverdue) {
            const li = document.createElement('li');
            li.textContent = '🪴 Пересадить ' + plant.name;
            list.appendChild(li);
            activeAlerts++;

            if (!notifiedRepot[plant.instanceId]) {
                sendSystemNotification("Время пересадки! 🪴", "Пора пересадить растение: " + plant.name);
                notifiedRepot[plant.instanceId] = true;
            }
        }
    });

    localStorage.setItem('notified_water', JSON.stringify(notifiedWater));
    localStorage.setItem('notified_repot', JSON.stringify(notifiedRepot));
    panel.style.display = activeAlerts > 0 ? 'block' : 'none';
}






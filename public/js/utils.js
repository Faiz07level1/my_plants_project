export function getTimeLeft(lastActionISO, intervalMinutes, overdueText) {
    const lastAction = new Date(lastActionISO);
    const nextAction = new Date(lastAction.getTime() + (intervalMinutes * 60 * 1000));
    const diffTime = nextAction - new Date();

    if (diffTime <= 0) {
        return { isOverdue: true, text: overdueText };
    }

    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

    return {
        isOverdue: false,
        text: days + " дн. " + hours + " ч. " + minutes + " мин. " + seconds + " сек."
    };
}

export function showToast(message) {
    const toast = document.getElementById('notification-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 4000);
}

export function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
}

export function sendSystemNotification(title, text) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: text,
            icon: "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='%2310b981'/><text x='35' y='65' font-size='40'>🌱</text></svg>"
        });
    }
}













export function getDaysStatus(lastActionISO, intervalDays) {
    const lastAction = new Date(lastActionISO);
    const nextAction = new Date(lastAction.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
    const diffTime = nextAction - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getMonthsStatus(lastActionISO, intervalMonths) {
    const lastAction = new Date(lastActionISO);
    const nextAction = new Date(lastAction);
    nextAction.setMonth(nextAction.getMonth() + intervalMonths);
    const diffTime = nextAction - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function showToast(message) {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(function() { toast.style.display = 'none'; }, 5000);
}

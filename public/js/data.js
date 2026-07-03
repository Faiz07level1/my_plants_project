export let plantCatalog = [];
export let userCollection = [];
export let userFavorites = [];

export async function loadPlantData() {
    try {
        const response = await fetch('/api/database');
        if (!response.ok) throw new Error();
        const data = await response.json();
        plantCatalog = data.catalog || [];
        return plantCatalog;
    } catch (error) {
        return [];
    }
}

export async function syncUserDataFromServer() {
    const username = localStorage.getItem('current_user');
    if (!username) return;

    try {
        const response = await fetch(`/api/user/data?username=${encodeURIComponent(username)}`);
        if (response.ok) {
            const data = await response.json();
            userCollection = data.collection || [];
            userFavorites = data.favorites || [];
        }
    } catch (error) {
        console.error(error);
    }
}

export async function saveCollectionToServer() {
    const username = localStorage.getItem('current_user');
    if (!username) return;

    try {
        await fetch('/api/user/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, collection: userCollection })
        });
    } catch (error) {
        console.error(error);
    }
}

export async function saveFavoritesToServer() {
    const username = localStorage.getItem('current_user');
    if (!username) return;

    try {
        await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, favorites: userFavorites })
        });
    } catch (error) {
        console.error(error);
    }
}

export function setLocalCollection(newCol) {
    userCollection = newCol;
}

export function setLocalFavorites(newFav) {
    userFavorites = newFav;
}









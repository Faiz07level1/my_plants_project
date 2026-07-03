import { showToast } from './utils.js';

export async function getRecommendations() {
    const box = document.getElementById('recommendations-box');
    if (!box) return;

    const username = localStorage.getItem('current_user');
    if (!username) return;

    box.style.display = 'block';
    box.innerHTML = '<p style="font-size:0.85rem;color:#4b5563;font-style:italic;">Анализируем вашу коллекцию...</p>';

    try {
        const response = await fetch(`/api/recommendations?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error();
        const recommendedList = await response.json();

        if (recommendedList.length === 0) {
            box.innerHTML = '<p style="font-size:0.85rem;color:#065f46;font-weight:600;">✨ Вы собрали все доступные растения из нашего справочника!</p>';
            return;
        }

        const plant = recommendedList[0];
        box.innerHTML = `
            <div style="background: white; border: 1px solid #e5e7eb; padding: 14px; border-radius: 8px; margin-top: 10px; display: flex; gap: 14px; align-items: center;">
                <div style="width: 50px; height: 50px; background-size: cover; background-position: center; border-radius: 6px; background-image: url('${plant.img}'); flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <h4 style="font-size: 0.95rem; font-weight: 700; color: #1f2937; margin-bottom: 2px;">🌱 Рекомендуем: ${plant.name}</h4>
                    <p style="font-size: 0.8rem; color: #4b5563; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${plant.lighting}</p>
                </div>
                <button class="btn btn-secondary" onclick="window.showCatalogCard(${plant.id})" style="width: auto; padding: 6px 12px; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0;">Открыть уход</button>
            </div>
        `;
    } catch (e) {
        console.error(e);
        box.innerHTML = '<p style="font-size:0.85rem;color:#b91c1c;">Не удалось загрузить рекомендации.</p>';
    }
}
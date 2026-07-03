function renderRecommendations() {
    const container = document.getElementById('recommendations-list');
    container.innerHTML = '';
    
    const myPlantNames = myCollection.map(p => p.name);
    let recommended = plantCatalog.filter(plant => !myPlantNames.includes(plant.name));
    
    if (recommended.length === 0) {
        container.innerHTML = '<p>Вы собрали все доступные типы растений!</p>';
        return;
    }
    
    recommended.forEach(plant => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${plant.name} <span style="font-size:0.8rem; color:#e67e22;">(Рекомендуем)</span></h3>
            <p><span class="label">Сложность:</span> ${plant.difficulty}</p>
            <p><span class="label">Полив:</span> ${plant.watering}</p>
            <p><span class="label">Освещение:</span> ${plant.lighting}</p>
            <button class="btn btn-primary" onclick="openAddToCollectionForm(${plant.id})">Добавить</button>
        `;
        container.appendChild(card);
    });
}

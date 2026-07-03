document.getElementById('photo-recognize').addEventListener('change', async function(e) {
    if (!e.target.files.length) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(event) {
        document.getElementById('image-preview').src = event.target.result;
        document.getElementById('preview-box').style.display = 'block';
        
        showToast("Отправка фотографии на локальный ИИ-сервер...");

        try {
            const response = await fetch('http://localhost:3000/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: event.target.result })
            });

            if (!response.ok) throw new Error("Ошибка сервера");

            const result = await response.json();

            if (result.success) {
                showToast(`Сервер определил растение: ${result.plantName}`);
                setTimeout(() => {
                    document.getElementById('preview-box').style.display = 'none';
                    openAddToCollectionForm(result.plantId);
                }, 1500);
            } else {
                showToast("Не удалось распознать объект на фото.");
            }

        } catch (err) {
            console.error(err);
            showToast("Не удалось связаться с локальным бэкендом.");
        }
    };
    
    reader.readAsDataURL(file);
});



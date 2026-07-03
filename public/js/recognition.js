import { showToast } from './utils.js';
import { openAddToCollectionForm } from './collection.js';

export function initPhotoRecognition() {
    const input = document.getElementById('photo-recognize');
    if (!input) return;

    input.addEventListener('change', async function(e) {
        if (!e.target.files.length) return;
        
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            const previewImg = document.getElementById('image-preview');
            const previewBox = document.getElementById('preview-box');
            
            if (previewImg && previewBox) {
                previewImg.src = event.target.result;
                previewBox.style.display = 'block';
            }
            
            showToast("Отправка фотографии на локальный ИИ-сервер...");

            try {
                const response = await fetch('/api/recognize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: event.target.result })
                });

                if (!response.ok) throw new Error();

                const result = await response.json();

                if (result.success) {
                    showToast(`ИИ определил растение: ${result.plantName}`);
                    setTimeout(() => {
                        if (previewBox) previewBox.style.display = 'none';
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
}





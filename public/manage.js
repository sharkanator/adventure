document.addEventListener('DOMContentLoaded', function() {

    const images = document.querySelectorAll('.image-item');

    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'green';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.display = 'none';
    document.body.appendChild(notification);

    const showNotification = (message) => {
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    };

    images.forEach(image => {

        const revealButton = document.createElement('button');
        revealButton.innerHTML = '&#x1F441;'; // eye symbol
        revealButton.title = 'Reveal Image';

        const fogButton = document.createElement('button');
        fogButton.innerHTML = '&#x1F648;'; // closed eye symbol
        fogButton.title = 'Show with Fog of War';

        image.appendChild(revealButton);
        image.appendChild(fogButton);

        revealButton.addEventListener('click', function() {

            fetch(`/update-image?path=${image.dataset.imagePath}&reveal=true`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {

                        showNotification(`Image successfully changed to ${image.dataset.imagePath}`);
                    } else {
                        console.error('Failed to reveal image.');
                        showNotification('Failed to reveal image.');
                    }
                })
                .catch(error => console.error('Error:', error));
        });

        fogButton.addEventListener('click', function() {

            fetch(`/update-image?path=${image.dataset.imagePath}&reveal=false`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {

                        showNotification(`Image set with fog of war to ${image.dataset.imagePath}`);
                    } else {
                        console.error('Failed to set image with fog of war.');
                        showNotification('Failed to set image with fog of war.');
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    });
});

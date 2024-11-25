document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const container = document.getElementById('canvasContainer');
    const imageCanvas = document.getElementById('mapCanvas');
    const fogCanvas = document.createElement('canvas');
    container.appendChild(fogCanvas);
    const imageCtx = imageCanvas.getContext('2d');
    const fogCtx = fogCanvas.getContext('2d');
    const toggleButton = document.getElementById('toggleFog');

    fogCanvas.style.position = 'absolute';
    fogCanvas.style.top = '0';
    fogCanvas.style.left = '0';

    let drawing = false;
    let fogCleared = false;
    let canvasState = null;

    let currentImage = new Image(); // Proper initialization of currentImage

    function adjustCanvasSize() {
        let containerWidth = container.offsetWidth;
        let containerHeight = container.offsetHeight;
        let imageRatio = currentImage.width / currentImage.height;
        let containerRatio = containerWidth / containerHeight;

        if (containerRatio > imageRatio) {
            imageCanvas.width = fogCanvas.width = containerHeight * imageRatio;
            imageCanvas.height = fogCanvas.height = containerHeight;
        } else {
            imageCanvas.width = fogCanvas.width = containerWidth;
            imageCanvas.height = fogCanvas.height = containerWidth / imageRatio;
        }

        imageCanvas.style.left = fogCanvas.style.left = (containerWidth - imageCanvas.width) / 2 + 'px';
        imageCanvas.style.top = fogCanvas.style.top = (containerHeight - imageCanvas.height) / 2 + 'px';

        imageCtx.drawImage(currentImage, 0, 0, imageCanvas.width, imageCanvas.height);

    }

    function applyFogOfWar() {

        fogCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';  // Light fog
        fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
        saveCanvasState();
    }

    function saveCanvasState() {

        canvasState = fogCtx.getImageData(0, 0, fogCanvas.width, fogCanvas.height);
    }

    function restoreCanvasState() {
        if (canvasState) {

            fogCtx.putImageData(canvasState, 0, 0);
        }
    }

    function loadImage(src) {
        currentImage.onload = function() {
            adjustCanvasSize();
            restoreCanvasState();
        };

        currentImage.src = src;
    }

    socket.on('load image', (imagePath) => {

        loadImage(imagePath);
    });

    socket.on('toggle fog', function(isCleared) {

        fogCleared = isCleared;
        if (fogCleared) {
            fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);

        } else {
            applyFogOfWar();

        }
    });

    toggleButton.addEventListener('click', function() {
        fogCleared = !fogCleared;
        if (fogCleared) {
            fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);

        } else {
            applyFogOfWar();

        }
        socket.emit('toggle fog', fogCleared);
    });

    function draw(e) {
        const rect = fogCanvas.getBoundingClientRect();
        const scaleX = fogCanvas.width / rect.width;
        const scaleY = fogCanvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const rectWidth = 50;
        const rectHeight = 50;
        fogCtx.clearRect(x - rectWidth / 2, y - rectHeight / 2, rectWidth, rectHeight);
        saveCanvasState();
        socket.emit('draw', {
            x: (x - rectWidth / 2) / fogCanvas.width,
            y: (y - rectHeight / 2) / fogCanvas.height,
            width: rectWidth / fogCanvas.width,
            height: rectHeight / fogCanvas.height
        });
    }

    fogCanvas.addEventListener('mousedown', function(e) {
        draw(e);
        drawing = true;
    });

    fogCanvas.addEventListener('mousemove', function(e) {
        if (drawing) {
            draw(e);
        }
    });

    fogCanvas.addEventListener('mouseup', function() {
        drawing = false;
    });

    window.addEventListener('resize', () => {
        if (currentImage.src) {
            adjustCanvasSize();
        }
    });

    window.addEventListener('orientationchange', () => {
        if (currentImage.src) {
            adjustCanvasSize();
        }
    });
});

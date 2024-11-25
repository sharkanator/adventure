document.addEventListener('DOMContentLoaded', function() {

    function resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        const imageCanvas = document.getElementById('mapCanvas');
        const fogCanvas = container.querySelector('canvas:last-child');

        const aspectRatio = imageCanvas.width / imageCanvas.height;
        const windowAspectRatio = window.innerWidth / window.innerHeight;

        if (aspectRatio > windowAspectRatio) {
            imageCanvas.style.width = '100%';
            imageCanvas.style.height = 'auto';
            fogCanvas.style.width = '100%';
            fogCanvas.style.height = 'auto';
        } else {
            imageCanvas.style.width = 'auto';
            imageCanvas.style.height = '100%';
            fogCanvas.style.width = 'auto';
            fogCanvas.style.height = '100%';
        }

        container.style.width = window.innerWidth + 'px';
        container.style.height = window.innerHeight + 'px';
    }

    document.addEventListener('click', () => {
        resizeCanvas();
        if (document.fullscreenEnabled) {
            document.body.requestFullscreen();
        }
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('load', resizeCanvas);


    const socket = io();
    const container = document.getElementById('canvasContainer');
    const imageCanvas = document.getElementById('mapCanvas');
    const fogCanvas = document.createElement('canvas');
    container.appendChild(fogCanvas);
    const imageCtx = imageCanvas.getContext('2d');
    const fogCtx = fogCanvas.getContext('2d');

    fogCanvas.style.position = 'absolute';
    fogCanvas.style.top = '0';
    fogCanvas.style.left = '0';
    fogCanvas.width = imageCanvas.width = window.innerWidth;
    fogCanvas.height = imageCanvas.height = window.innerHeight;

    let currentImage = new Image();
    let canvasState = null; // This will store the image data
    let fogCleared = true;  // Keep track of the fog state

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
        if (!fogCleared) {
            applyFogOfWar();
        }
    }

    function applyFogOfWar() {
        fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
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

    function loadImage(src, applyFog = true) {
        currentImage.onload = function() {
            adjustCanvasSize();
            if (applyFog) {
                applyFogOfWar();
            } else {
                fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
            }
        };
        currentImage.src = src;
    }

    socket.on('load image', (imagePath, reveal) => {
        fogCleared = reveal; // Ensure fog is not cleared when loading a new image
        loadImage(imagePath, !reveal);
    });

    socket.on('draw', (data) => {
        const x = data.x * fogCanvas.width;
        const y = data.y * fogCanvas.height;
        const width = data.width * fogCanvas.width;
        const height = data.height * fogCanvas.height;
        fogCtx.clearRect(x, y, width, height);
        saveCanvasState();
    });

    socket.on('toggle fog', (fogClearedState) => {
        fogCleared = fogClearedState;
        if (fogCleared) {
            fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
        } else {
            applyFogOfWar();
        }
    });

    window.addEventListener('resize', () => {
        if (currentImage.src) { // Check if currentImage has been loaded before resizing
            adjustCanvasSize();
        }
    });

    window.addEventListener('orientationchange', () => {
        if (currentImage.src) { // Check if currentImage has been loaded before resizing
            adjustCanvasSize();
        }
    });
});

// Image configuration - using all 23 provided images
const imageFiles = [
    '05.jpg', '06.jpg', '07.jpg', '08.jpg',
    '09.jpg', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg',
    '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg', '22.jpg', '23.jpg'
];

let currentEnlargedPhoto = null;
let circleData = []; // Store circle positioning data

document.addEventListener('DOMContentLoaded', function() {
    loadBackgroundText();
    createPhotoCircles();
    startRandomMovement();
    initMusicPlayer();
    initThemeToggle();

    // Add mobile touch support
    if ('ontouchstart' in window) {
        document.addEventListener('touchstart', handleTouch, { passive: true });
    }
});

function initMusicPlayer() {
    const music = document.getElementById('bgMusic');
    const toggleBtn = document.getElementById('musicToggle');

    if (!music || !toggleBtn) return;

    toggleBtn.addEventListener('click', function() {
        if (music.paused) {
            music.play().then(() => {
                toggleBtn.classList.add('playing');
            }).catch(err => {
                console.log('Playback failed:', err);
            });
        } else {
            music.pause();
            toggleBtn.classList.remove('playing');
        }
    });

    // Update button state if music ends or is paused externally
    music.addEventListener('pause', () => toggleBtn.classList.remove('playing'));
    music.addEventListener('play', () => toggleBtn.classList.add('playing'));
}

function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    // Check for saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    toggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');

        // Save preference
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

async function loadBackgroundText() {
    try {
        const response = await fetch('letter.txt');
        const text = await response.text();
        typewriterEffect(text);
    } catch (e) {
        console.log('Could not load background text');
    }
}

function typewriterEffect(text) {
    const container = document.getElementById('backgroundText');
    container.innerHTML = '<span class="cursor"></span>';

    const charsPerMinute = 180 * 6;
    const msPerChar = 60000 / charsPerMinute;

    let index = 0;
    let userScrolled = false;
    let scrollTimeout = null;

    const textSpan = document.createElement('span');
    container.insertBefore(textSpan, container.firstChild);

    // Detect when user scrolls manually
    container.addEventListener('scroll', function() {
        // Check if user scrolled away from bottom
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
        if (!isAtBottom) {
            userScrolled = true;
            // Resume auto-scroll after 3 seconds of no scrolling
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                userScrolled = false;
            }, 3000);
        } else {
            userScrolled = false;
        }
    });

    function typeNextChar() {
        if (index < text.length) {
            textSpan.textContent += text[index];
            index++;

            // Only auto-scroll if user hasn't scrolled away
            if (!userScrolled) {
                container.scrollTop = container.scrollHeight;
            }

            // Vary timing slightly for more natural feel
            // Pause longer on punctuation
            let delay = msPerChar;
            const char = text[index - 1];
            if (char === '.' || char === '!' || char === '?') {
                delay = msPerChar * 6;
            } else if (char === ',') {
                delay = msPerChar * 3;
            } else if (char === '\n') {
                delay = msPerChar * 4;
            }

            setTimeout(typeNextChar, delay + (Math.random() * 20 - 10));
        } else {
            // Done typing - remove cursor after a moment
            setTimeout(() => {
                const cursor = container.querySelector('.cursor');
                if (cursor) cursor.remove();
            }, 2000);
        }
    }

    // Start typing after a short delay
    setTimeout(typeNextChar, 500);
}

// Calculate ring distribution using hexagonal circle packing
// Center: 1 image, Ring n: 6n images (hexagonal packing formula)
function calculateRingDistribution(totalImages) {
    const rings = [];
    let remaining = totalImages;
    let ringIndex = 0;

    // First, calculate how many rings we need
    // Center (ring 0) = 1, Ring 1 = 6, Ring 2 = 12, Ring 3 = 18, etc.
    while (remaining > 0) {
        const capacity = ringIndex === 0 ? 1 : 6 * ringIndex;
        const count = Math.min(capacity, remaining);

        rings.push({
            ringIndex: ringIndex,
            capacity: capacity,
            count: count
        });

        remaining -= count;
        ringIndex++;
    }

    const totalRings = rings.length;

    // Now assign radii - center is 0, outer rings spread out
    // Tighter spacing - max radius around 32% to keep photos grouped
    rings.forEach((ring, idx) => {
        if (idx === 0) {
            ring.radius = 0; // Center
        } else {
            // Tighter ring spacing for closer grouping
            ring.radius = (idx / (totalRings - 1 || 1)) * 32;
        }
        ring.totalRings = totalRings;
    });

    return rings;
}

function createPhotoCircles() {
    const container = document.getElementById('photoContainer');
    const totalImages = imageFiles.length;

    // Calculate ring distribution
    const rings = calculateRingDistribution(totalImages);

    // Calculate base circle size based on container and number of rings
    const containerSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    const baseCircleSize = Math.max(60, Math.min(100, containerSize / (rings.length * 1.8)));

    let globalIndex = 0;

    rings.forEach((ring, ringIdx) => {
        // Center is largest, outer rings get smaller
        const maxRingIdx = rings.length - 1;
        const sizeFactor = 1.0 - (0.25 * (ringIdx / (maxRingIdx || 1))); // 1.0 to 0.75
        const circleSize = Math.max(45, baseCircleSize * sizeFactor);

        for (let i = 0; i < ring.count; i++) {
            if (globalIndex >= totalImages) break;

            const filename = imageFiles[globalIndex];
            const circle = document.createElement('div');
            circle.className = 'photo-circle';
            circle.dataset.index = globalIndex;
            circle.dataset.ring = ringIdx;

            let baseX, baseY, angle;

            if (ring.radius === 0) {
                // Center image
                baseX = 50;
                baseY = 50;
                angle = 0;
            } else {
                // Calculate angle with offset for each ring to stagger images
                const angleOffset = ringIdx * (Math.PI / 6); // Offset each ring
                angle = angleOffset + (i / ring.count) * 2 * Math.PI;

                // Convert polar to cartesian (percentage of container)
                baseX = 50 + (ring.radius * Math.cos(angle));
                baseY = 50 + (ring.radius * Math.sin(angle));
            }

            // Store data for movement calculations
            circleData[globalIndex] = {
                baseX,
                baseY,
                angle,
                radius: ring.radius,
                ringIndex: ringIdx,
                currentOffsetX: 0,
                currentOffsetY: 0,
                targetOffsetX: 0,
                targetOffsetY: 0,
                isHovered: false,
                // Scale breathing effect
                scalePhase: Math.random() * Math.PI * 2, // Random starting phase
                scaleSpeed: 0.3 + Math.random() * 0.4 // Vary speed slightly
            };

            // Set CSS custom properties
            circle.style.setProperty('--base-x', `${baseX}%`);
            circle.style.setProperty('--base-y', `${baseY}%`);
            circle.style.setProperty('--circle-size', `${circleSize}px`);
            circle.style.transform = 'translate(-50%, -50%)';

            // Load the image
            const img = new Image();
            const imagePath = `images/${filename}`;

            img.onload = function() {
                circle.style.backgroundImage = `url(${imagePath})`;
            };

            img.onerror = function() {
                circle.style.backgroundColor = '#444';
            };

            img.src = imagePath;

            // Add event listeners
            circle.addEventListener('click', () => enlargePhoto(circle, globalIndex));
            circle.addEventListener('mouseenter', () => handleHoverStart(circle, globalIndex));
            circle.addEventListener('mouseleave', () => handleHoverEnd(circle, globalIndex));

            container.appendChild(circle);
            globalIndex++;
        }
    });
}

// Smooth random movement system
function startRandomMovement() {
    const circles = document.querySelectorAll('.photo-circle');

    // Set new random targets periodically
    setInterval(() => {
        circles.forEach((circle, index) => {
            if (currentEnlargedPhoto || circleData[index]?.isHovered) return;

            const data = circleData[index];
            if (!data) return;

            // Random offset within allowed range (smaller range since circles are closer)
            const maxOffset = 5 - (data.ringIndex * 1);
            data.targetOffsetX = (Math.random() - 0.5) * maxOffset * 2;
            data.targetOffsetY = (Math.random() - 0.5) * maxOffset * 2;
        });
    }, 3000);

    // Smooth animation loop
    let lastTime = performance.now();

    function animate(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;

        circles.forEach((circle, index) => {
            if (currentEnlargedPhoto || circleData[index]?.isHovered) return;

            const data = circleData[index];
            if (!data) return;

            // Lerp toward target position
            const ease = 0.02;
            data.currentOffsetX += (data.targetOffsetX - data.currentOffsetX) * ease;
            data.currentOffsetY += (data.targetOffsetY - data.currentOffsetY) * ease;

            // Update scale phase for breathing effect
            data.scalePhase += deltaTime * data.scaleSpeed;
            const scale = 1 + Math.sin(data.scalePhase) * 0.08; // Scale between 0.92 and 1.08

            // Apply transform with scale
            circle.style.transform = `translate(calc(-50% + ${data.currentOffsetX}px), calc(-50% + ${data.currentOffsetY}px)) scale(${scale})`;
        });

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

function handleHoverStart(circle, index) {
    if (currentEnlargedPhoto) return;

    const data = circleData[index];
    if (data) {
        data.isHovered = true;
    }

    // Remove inline transform so CSS :hover can take over
    circle.style.transform = '';

    // Push away nearby circles
    const allCircles = document.querySelectorAll('.photo-circle');
    const hoveredRect = circle.getBoundingClientRect();

    allCircles.forEach((otherCircle, otherIndex) => {
        if (otherIndex === index) return;

        const otherRect = otherCircle.getBoundingClientRect();
        const distance = Math.sqrt(
            Math.pow(otherRect.left - hoveredRect.left, 2) +
            Math.pow(otherRect.top - hoveredRect.top, 2)
        );

        if (distance < 100) {
            const angle = Math.atan2(
                otherRect.top - hoveredRect.top,
                otherRect.left - hoveredRect.left
            );

            const pushDistance = 25;
            const pushX = Math.cos(angle) * pushDistance;
            const pushY = Math.sin(angle) * pushDistance;

            otherCircle.classList.add('pushed-away');

            const otherData = circleData[otherIndex];
            if (otherData) {
                otherCircle.style.transform = `translate(calc(-50% + ${otherData.currentOffsetX + pushX}px), calc(-50% + ${otherData.currentOffsetY + pushY}px))`;
            }
        }
    });
}

function handleHoverEnd(circle, index) {
    if (currentEnlargedPhoto) return;

    const data = circleData[index];
    if (data) {
        data.isHovered = false;
    }

    // Reset pushed circles
    const pushedCircles = document.querySelectorAll('.photo-circle.pushed-away');
    pushedCircles.forEach((pushedCircle) => {
        pushedCircle.classList.remove('pushed-away');
        const pushedIndex = parseInt(pushedCircle.dataset.index);
        const pushedData = circleData[pushedIndex];
        if (pushedData) {
            pushedCircle.style.transform = `translate(calc(-50% + ${pushedData.currentOffsetX}px), calc(-50% + ${pushedData.currentOffsetY}px))`;
        }
    });
}

function enlargePhoto(circle, index) {
    const overlay = document.getElementById('overlay');
    const enlargedPhoto = document.getElementById('enlargedPhoto');
    const container = document.getElementById('photoContainer');

    const bgImage = circle.style.backgroundImage;

    enlargedPhoto.style.backgroundImage = bgImage;
    overlay.classList.add('active');
    container.classList.add('overlay-active');

    currentEnlargedPhoto = {
        circle: circle,
        originalBgImage: bgImage
    };

    overlay.addEventListener('click', closeEnlargedPhoto);
    document.addEventListener('keydown', handleEscapeKey);
}

function closeEnlargedPhoto() {
    const overlay = document.getElementById('overlay');
    const container = document.getElementById('photoContainer');

    overlay.classList.remove('active');
    container.classList.remove('overlay-active');

    currentEnlargedPhoto = null;

    // Reset ALL circles to their proper positions (fixes mobile issue)
    const allCircles = document.querySelectorAll('.photo-circle');
    allCircles.forEach((circle) => {
        circle.classList.remove('pushed-away');
        const index = parseInt(circle.dataset.index);
        const data = circleData[index];
        if (data) {
            data.isHovered = false;
            circle.style.transform = `translate(calc(-50% + ${data.currentOffsetX}px), calc(-50% + ${data.currentOffsetY}px))`;
        }
    });

    overlay.removeEventListener('click', closeEnlargedPhoto);
    document.removeEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(event) {
    if (event.key === 'Escape' && currentEnlargedPhoto) {
        closeEnlargedPhoto();
    }
}

function handleTouch(event) {
    const target = event.target;

    // If overlay is active and we tap anywhere, close it
    if (currentEnlargedPhoto) {
        if (!target.classList.contains('enlarged-photo')) {
            closeEnlargedPhoto();
        }
        return;
    }

    // Otherwise, if we tap a photo circle, enlarge it
    if (target.classList.contains('photo-circle')) {
        const index = parseInt(target.dataset.index);
        enlargePhoto(target, index);
    }
}

// Handle window resize
window.addEventListener('resize', function() {
    // Recalculate on significant resize
    const container = document.getElementById('photoContainer');
    container.innerHTML = '';
    circleData = [];
    createPhotoCircles();
});

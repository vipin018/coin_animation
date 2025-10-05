// script.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import GUI from 'lil-gui';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE6E6FA); // Lavender background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    canvas: document.getElementById('canvas')
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

// Detect mobile for responsiveness
let isMobile = window.innerWidth < 768;

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2;
controls.maxDistance = 20;
controls.enableZoom = isMobile; // Enable zoom on mobile for better interaction
if (isMobile) {
    controls.enableRotate = true; // Keep rotate enabled, but we'll handle swipe interference
    controls.enablePan = false; // Disable pan to reduce interference
}
controls.enabled = false; // Disabled by default
controls.target.set(0, 0, 0); // Ensure target is center

// Coin rotation animation setup (steady camera)
const targetRotationX = -Math.PI / 2;
let isAnimatingCoins = false;
let animationStartRotationX = 0;
let animationStartTime = 0;
const animationDuration = 2000; // ms

// Wheel event for triggering coin rotation animation (desktop)
renderer.domElement.addEventListener('wheel', (event) => {
    if (!isAnimatingCoins) {
        isAnimatingCoins = true;
        animationStartRotationX = coinGroup.rotation.x;
        animationStartTime = performance.now();
    }
    // Optional: event.preventDefault(); to prevent default scroll behavior
});

// Touch events for triggering coin rotation animation (mobile)
let touchStartX = 0;
let touchStartY = 0;
renderer.domElement.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) { // Single touch
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (event) => {
    if (!isMobile || event.touches.length !== 1 || isAnimatingCoins) return;
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const deltaX = Math.abs(touchX - touchStartX);
    const deltaY = Math.abs(touchY - touchStartY);
    if (deltaY > deltaX && deltaY > 50) { // Vertical swipe threshold, prioritize vertical over horizontal
        event.preventDefault(); // Prevent OrbitControls from handling this swipe
        if (!isAnimatingCoins) {
            isAnimatingCoins = true;
            animationStartRotationX = coinGroup.rotation.x;
            animationStartTime = performance.now();
        }
        touchStartY = touchY; // Reset Y for continuous swipe if needed
    }
}, { passive: false }); // Allow preventDefault

// Lighting for metallic sheen (lavender theme)
const ambientLight = new THREE.AmbientLight(0xDDA0DD, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xE6E6FA, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// HDRI environment
const rgbeLoader = new RGBELoader();
rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    // scene.background = texture; // Use as background
});

// Parameters for GUI
const params = {
    // Original
    numCoins: 8,
    radius: 4.5,
    coinRadius: 0.9,
    coinHeight: 0.05,
    rotationSpeed: 1.0,
    spinSpeed: 2.0,
    spinVariation: 0.2,
    ellipseScale: 1.4,
    // Material (MeshPhysicalMaterial)
    color: 0x9370DB, // Lavender theme coin color
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: 1.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
    transmission: 0.0,
    thickness: 0.5,
    ior: 1.5,
    opacity: 1.0,
    transparent: false,
    // Coin Detailing
    sizeVariation: 0.2,
    tiltVariation: 0.1,
    // Animation
    pulseAmplitude: 0.1,
    wobbleIntensity: 0.05,
    // Scene
    cameraOrbitSpeed: 0.0005,
    autoOrbit: false, // Disabled by default
    enableOrbitControls: false, // New toggle for enabling OrbitControls
    coinGroupY: 0, // New param for coinGroup y position
    // Colors
    bgColor: 0xE6E6FA, // Lavender background
};

// Group for coins
const coinGroup = new THREE.Group();
scene.add(coinGroup);

let coins = [];
let time = 0;
let previousCameraPosition = new THREE.Vector3();

function createCoins() {
    // Adjust radius on mobile for better visibility, but less aggressive
    if (isMobile) {
        params.radius = Math.min(params.radius, 4.0); // Slightly larger than before
    }

    // Clear existing coins
    coins.forEach(coin => coinGroup.remove(coin));
    coins = [];

    const geometry = new THREE.CylinderGeometry(params.coinRadius, params.coinRadius, params.coinHeight, 64); // More segments for bevel-like
    const material = new THREE.MeshPhysicalMaterial({
        color: params.color,
        metalness: params.metalness,
        roughness: params.roughness,
        envMapIntensity: params.envMapIntensity,
        clearcoat: params.clearcoat,
        clearcoatRoughness: params.clearcoatRoughness,
        reflectivity: params.reflectivity,
        transmission: params.transmission,
        thickness: params.thickness,
        ior: params.ior,
        opacity: params.opacity,
        transparent: params.transparent || params.transmission > 0 || params.opacity < 1
    });

    for (let i = 0; i < params.numCoins; i++) {
        const stackGroup = new THREE.Group();
        const angle = (i / params.numCoins) * Math.PI * 2;
        stackGroup.position.x = Math.cos(angle) * params.radius;
        stackGroup.position.z = Math.sin(angle) * params.radius;
        stackGroup.position.y = 0;

        // Main coin
        const coin = new THREE.Mesh(geometry, material.clone());
        coin.castShadow = true;
        coin.receiveShadow = true;
        coin.rotation.y = angle + Math.PI / 2;
        coin.userData.spinSpeed = params.spinSpeed * (1 + (Math.random() - 0.5) * params.spinVariation);
        coin.userData.baseRoughness = params.roughness;

        // Size and tilt variation
        const sizeVar = 0.9 + Math.random() * params.sizeVariation;
        coin.scale.set(params.ellipseScale * sizeVar, 1 * sizeVar, 1 * sizeVar);
        coin.rotation.z = (Math.random() - 0.5) * params.tiltVariation;

        stackGroup.add(coin);

        coinGroup.add(stackGroup);
        coins.push(stackGroup); // Treat stack as "coin" for animation
    }
}

// Initialize coins
createCoins();

// GUI setup with folders
const gui = new GUI();
const coinFolder = gui.addFolder('Coin Settings');
coinFolder.add(params, 'numCoins', 8, 12, 1).onChange(createCoins);
coinFolder.add(params, 'radius', 4, 8).onChange(createCoins);
coinFolder.add(params, 'coinRadius', 0.4, 1.0).onChange(createCoins);
coinFolder.add(params, 'coinHeight', 0.01, 0.05).onChange(createCoins);
coinFolder.add(params, 'ellipseScale', 1.0, 2.0).onChange(createCoins);
coinFolder.add(params, 'sizeVariation', 0, 0.5).onChange(createCoins);
coinFolder.add(params, 'tiltVariation', 0, 0.3).onChange(createCoins);
coinFolder.open();

const animationFolder = gui.addFolder('Animation');
animationFolder.add(params, 'rotationSpeed', 0, 3);
animationFolder.add(params, 'spinSpeed', 0, 5).onChange(createCoins);
animationFolder.add(params, 'spinVariation', 0, 0.5).onChange(createCoins);
animationFolder.add(params, 'pulseAmplitude', 0, 0.5);
animationFolder.add(params, 'wobbleIntensity', 0, 0.2);
animationFolder.open();

const materialFolder = gui.addFolder('Material');
materialFolder.addColor(params, 'color').onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.color.setHex(params.color); }));
});
materialFolder.add(params, 'metalness', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.metalness = params.metalness; }));
});
materialFolder.add(params, 'roughness', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.roughness = params.roughness; }));
    // Update baseRoughness for dynamic
    coins.forEach(c => { if (c.children[0] && c.children[0].userData) c.children[0].userData.baseRoughness = params.roughness; });
});

materialFolder.add(params, 'envMapIntensity', 0, 2).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.envMapIntensity = params.envMapIntensity; }));
});
materialFolder.add(params, 'clearcoat', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.clearcoat = params.clearcoat; }));
});
materialFolder.add(params, 'clearcoatRoughness', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.clearcoatRoughness = params.clearcoatRoughness; }));
});
materialFolder.add(params, 'reflectivity', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.reflectivity = params.reflectivity; }));
});
materialFolder.add(params, 'transmission', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { 
        if (child.material) { 
            child.material.transmission = params.transmission; 
            child.material.transparent = params.transparent || params.transmission > 0 || params.opacity < 1;
        } 
    }));
});
materialFolder.add(params, 'thickness', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.thickness = params.thickness; }));
});
materialFolder.add(params, 'ior', 1.0, 2.5).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { if (child.material) child.material.ior = params.ior; }));
});
materialFolder.add(params, 'opacity', 0, 1).onChange(() => {
    coins.forEach(c => c.children.forEach(child => { 
        if (child.material) { 
            child.material.opacity = params.opacity; 
            child.material.transparent = params.transparent || params.transmission > 0 || params.opacity < 1;
        } 
    }));
});
materialFolder.add(params, 'transparent').onChange(() => {
    coins.forEach(c => c.children.forEach(child => { 
        if (child.material) child.material.transparent = params.transparent; 
    }));
});
materialFolder.open();

const sceneFolder = gui.addFolder('Scene');
sceneFolder.add(params, 'cameraOrbitSpeed', 0, 0.002);
sceneFolder.add(params, 'coinGroupY', -5, 5).onChange(() => {
    coinGroup.position.y = params.coinGroupY;
    camera.lookAt(0, params.coinGroupY, 0);
    controls.target.set(0, params.coinGroupY, 0);
    controls.update();
});
sceneFolder.add(params, 'enableOrbitControls').onChange((value) => {
    controls.enabled = value;
});
sceneFolder.add(params, 'autoOrbit').onChange((value) => {
    controls.autoRotate = value;
});
sceneFolder.addColor(params, 'bgColor').onChange(() => {
    scene.background.setHex(params.bgColor);
});
sceneFolder.open();

// Close GUI on mobile for better UX
if (isMobile) {
    gui.close();
}

// Enable auto-rotate on OrbitControls if autoOrbit is true (but only if controls enabled)
controls.autoRotate = params.autoOrbit && params.enableOrbitControls;
controls.autoRotateSpeed = params.cameraOrbitSpeed * 1000; // Adjust for controls

// Adjust initial camera position on mobile (even farther to zoom out more, with slight elevation for better centering)
if (isMobile) {
    camera.position.set(0, 1.5, 12);
    params.coinGroupY = 1.5; // Raise coinGroup on mobile to center
} else {
    camera.position.set(0, 0, 8);
    params.coinGroupY = 0;
}
coinGroup.position.y = params.coinGroupY;
camera.lookAt(0, params.coinGroupY, 0);
controls.target.set(0, params.coinGroupY, 0);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Coin rotation animation logic (steady camera)
    if (isAnimatingCoins) {
        const elapsed = performance.now() - animationStartTime;
        let progress = Math.min(elapsed / animationDuration, 1);
        // Ease in-out quadratic
        const easedProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        coinGroup.rotation.x = THREE.MathUtils.lerp(animationStartRotationX, targetRotationX, easedProgress);
        if (progress >= 1) {
            isAnimatingCoins = false;
        }
    }

    // Pulsing group rotation (independent of camera)
    coinGroup.rotation.y = Math.sin(time * params.rotationSpeed * 0.1) * params.pulseAmplitude + time * params.rotationSpeed * 0.001;

    // Spin and wobble each coin/stack
    coins.forEach((stack, i) => {
        const mainCoin = stack.children[0]; // Assume first is main
        mainCoin.rotation.x += mainCoin.userData.spinSpeed * 0.01;
        mainCoin.rotation.z += Math.sin(mainCoin.rotation.x * 0.5) * params.wobbleIntensity;

        // Dynamic roughness
        mainCoin.material.roughness = mainCoin.userData.baseRoughness + Math.sin(time + i) * 0.05;
    });

    // Update controls (handles auto-rotate if enabled)
    controls.update();

    // Log camera position changes (throttled to avoid spam) - but camera is steady, so maybe remove or keep for orbit
    const currentPosition = camera.position.clone();
    if (currentPosition.distanceTo(previousCameraPosition) > 0.01) { // Threshold for change detection
        console.log('Camera position changed to:', currentPosition);
        previousCameraPosition.copy(currentPosition);
    }

    // Render with renderer
    renderer.render(scene, camera);
}

animate();

// Handle resize
window.addEventListener('resize', () => {
    const newIsMobile = window.innerWidth < 768;
    if (newIsMobile !== isMobile) {
        isMobile = newIsMobile;
        // Re-init responsive settings on orientation change
        controls.enableZoom = isMobile;
        if (isMobile) {
            controls.enablePan = false;
            params.enableOrbitControls = false;
            controls.enabled = false;
            params.autoOrbit = false;
            controls.autoRotate = false;
            camera.position.set(0, 1.5, 12);
            params.coinGroupY = 1.5;
            coinGroup.position.y = params.coinGroupY;
            gui.close();
            createCoins(); // Recreate with adjusted radius
        } else {
            controls.enablePan = true;
            params.enableOrbitControls = false;
            controls.enabled = false;
            camera.position.set(0, 0, 8);
            params.coinGroupY = 0;
            coinGroup.position.y = params.coinGroupY;
            gui.open();
        }
        camera.lookAt(0, params.coinGroupY, 0);
        controls.target.set(0, params.coinGroupY, 0);
        controls.update();
    }

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.update();
});
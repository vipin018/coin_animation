// script.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Scene setup
const scene = new THREE.Scene();
scene.background = null; // Let CSS background show through

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 2, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.getElementById("canvas"),
  alpha: true, // Enable transparency
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
  new RoomEnvironment(),
  0.04,
).texture;

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

// Coin rotation animation setup (continuous and interactive)
let spinBoost = 0;
const baseRotationSpeed = 0.005;
const boostDecay = 0.95;
const maxBoost = 0.2;

// Wheel event for adding spin boost (desktop)
renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    spinBoost = Math.min(spinBoost + Math.abs(event.deltaY) * 0.0001, maxBoost);
  },
  { passive: true },
);

// Touch events for adding spin boost (mobile)
let touchStartX = 0;
let touchStartY = 0;
renderer.domElement.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length === 1) {
      // Single touch
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }
  },
  { passive: true },
);

renderer.domElement.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length !== 1) return;
    const touchY = event.touches[0].clientY;
    const deltaY = Math.abs(touchY - touchStartY);

    if (deltaY > 10) {
      spinBoost = Math.min(spinBoost + deltaY * 0.0005, maxBoost);
      touchStartY = touchY;
    }
  },
  { passive: true },
);

// Lighting for metallic sheen (matched to reference)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// HDRI environment
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
  function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    // scene.background = texture; // Use as background
  },
);

// Parameters for GUI
const params = {
  currentTheme: "coral",
  // ...
  numCoins: 15,
  radius: 4,
  coinRadius: 0.65,
  coinHeight: 0.125,
  rotationSpeed: 5.0,
  spinSpeed: 1.9,
  spinVariation: 0.2,
  ellipseScale: 1.2,
  // Material (MeshPhysicalMaterial)
  color: 0xff8a75,
  metalness: 0.3,
  roughness: 0.4,
  envMapIntensity: 1.5,
  clearcoat: 0.2,
  clearcoatRoughness: 0.2,
  reflectivity: 0.5,
  transmission: 0.0,
  thickness: 0.5,
  ior: 1.45,
  opacity: 1.0,
  transparent: false,
  // Coin Detailing
  sizeVariation: 0.1,
  tiltVariation: 0.05,
  // Animation
  pulseAmplitude: 0.1,
  wobbleIntensity: 0.05,
  // Scene
  cameraOrbitSpeed: 0.0005,
  autoOrbit: false,
  enableOrbitControls: true,
  coinGroupY: 0,
  // Colors
  bgColor: 0xffa07a,
};

// Set initial body theme
document.body.classList.add("theme-coral");

// Aesthetic Palettes
const coralPalette = [
  0xffb7a2, 0xffa07a, 0xff8a75, 0xff7660, 0xee6b5e, 0xff9e80, 0xffccbc,
  0xff8a65,
];

const monochromePalette = [
  0xeeeeee, 0xdddddd, 0xcccccc, 0xbbbbbb, 0xaaaaaa, 0x999999, 0x888888,
  0x777777,
];

const themes = {
  coral: { palette: coralPalette, metalness: 0.3, roughness: 0.4 },
  monochrome: { palette: monochromePalette, metalness: 0.8, roughness: 0.2 },
};

// Theme Toggle Button Logic
const themeBtn = document.getElementById("theme-toggle");
themeBtn.addEventListener("click", () => {
  params.currentTheme =
    params.currentTheme === "coral" ? "monochrome" : "coral";
  document.body.classList.toggle("theme-coral");
  document.body.classList.toggle("theme-monochrome");
  updateCoinThemes();
});

function updateCoinThemes() {
  const activeTheme = themes[params.currentTheme];
  coins.forEach((stack, i) => {
    const mesh = stack.children[0];
    mesh.material.color.setHex(
      activeTheme.palette[i % activeTheme.palette.length],
    );
    mesh.material.color.convertSRGBToLinear();
    mesh.material.metalness = activeTheme.metalness;
    mesh.material.roughness = activeTheme.roughness;
  });
}

// Group for coins
const coinGroup = new THREE.Group();
scene.add(coinGroup);

let coins = [];
let time = 0;
let introElapsed = 0;
const introDuration = 3.0;
let previousCameraPosition = new THREE.Vector3();

function createCoins() {
  // Adjust radius on mobile for better visibility
  if (isMobile) {
    params.radius = Math.min(params.radius, 4.0);
  }

  // Clear existing coins
  coins.forEach((coin) => coinGroup.remove(coin));
  coins = [];
  introElapsed = 0;

  const geometry = new THREE.CylinderGeometry(
    params.coinRadius,
    params.coinRadius,
    params.coinHeight,
    64,
  );
  const activeTheme = themes[params.currentTheme];

  for (let i = 0; i < params.numCoins; i++) {
    const stackGroup = new THREE.Group();
    const angle = (i / params.numCoins) * Math.PI * 2;

    stackGroup.position.set(0, -1, 0);
    stackGroup.scale.setScalar(0);

    // Store a unique vertical offset to prevent clipping in the loop
    stackGroup.userData.baseYOffset = i % 2 === 0 ? 0.15 : -0.15;

    const material = new THREE.MeshPhysicalMaterial({
      color: activeTheme.palette[i % activeTheme.palette.length],
      metalness: activeTheme.metalness,
      roughness: activeTheme.roughness,
      envMapIntensity: params.envMapIntensity,
      clearcoat: params.clearcoat,
      clearcoatRoughness: params.clearcoatRoughness,
      reflectivity: params.reflectivity,
      transmission: params.transmission,
      thickness: params.thickness,
      ior: params.ior,
      opacity: params.opacity,
      transparent: false,
    });
    material.color.convertSRGBToLinear();

    // Main coin
    const coin = new THREE.Mesh(geometry, material);
    coin.castShadow = true;
    coin.receiveShadow = true;

    // Face the coins towards the center
    coin.rotation.y = angle + Math.PI / 2;
    // Turn the coins 90 degrees (laying flat)
    coin.rotation.z = Math.PI / 2;

    coin.userData.spinSpeed =
      params.spinSpeed * (1 + (Math.random() - 0.5) * params.spinVariation);

    const sizeVar = 0.9 + Math.random() * params.sizeVariation;
    coin.scale.set(params.ellipseScale * sizeVar, 1 * sizeVar, 1 * sizeVar);

    stackGroup.add(coin);
    coinGroup.add(stackGroup);
    coins.push(stackGroup);
  }
}

// Initialize coins
createCoins();

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

  // Manage intro progress with a longer, more dramatic duration
  const introProgress = Math.min(introElapsed / introDuration, 1);
  if (introElapsed < introDuration) {
    introElapsed += 0.008; // Slightly slower for more drama
  }

  time += 0.005;

  // 1. CINEMATIC CAMERA SWAY (Refinement)
  // Subtle, slow camera movement to make the scene feel handheld and premium
  camera.position.x += Math.sin(time * 0.5) * 0.002;
  camera.position.y += Math.cos(time * 0.4) * 0.002;
  camera.lookAt(0, params.coinGroupY, 0);

  // Apply continuous, ultra-smooth base rotation
  const currentSpinSpeed =
    (baseRotationSpeed + spinBoost) * params.rotationSpeed;
  coinGroup.rotation.y += currentSpinSpeed * 0.3; // Slower, more majestic

  // Decay the spin boost smoothly
  spinBoost *= 0.985;
  if (spinBoost < 0.0001) spinBoost = 0;

  // Cinematic breathing with more complex group tilt
  coinGroup.position.y = params.coinGroupY + Math.sin(time * 1.2) * 0.08;
  // Rotate 90 degrees (PI/2) plus a subtle hover tilt
  coinGroup.rotation.x =
    Math.PI / 2 + Math.sin(time * 0.6) * 0.03 + spinBoost * 0.05;
  coinGroup.rotation.z = Math.cos(time * 0.4) * 0.02;

  // Individual coin Choreography (Phase 1: Bloom, Phase 2: Fluid Circular Ripple)
  coins.forEach((stack, i) => {
    // 1. STAGGERED BLOOM (Intro)
    const coinDelay = (i / params.numCoins) * 0.8;
    const rawProgress = Math.max(
      0,
      Math.min((introProgress - coinDelay) / 0.4, 1),
    );
    const smoothOut = 1 - Math.pow(1 - rawProgress, 4);

    // 2. RADIAL BREATHING
    const breathing = Math.sin(time * 1.2) * 0.1;
    const dynamicRadius = params.radius + breathing;

    const angle = (i / params.numCoins) * Math.PI * 2;
    const targetX = Math.cos(angle) * dynamicRadius;
    const targetZ = Math.sin(angle) * dynamicRadius;

    // 3. FLUID RIPPLE (Non-overlapping)
    const waveSpeed = 2.0;
    const waveValue = Math.sin(time * waveSpeed + i * 0.6) * 0.25;

    // Use the baseYOffset (alternating heights) to guarantee no clipping
    const targetY =
      (waveValue + (stack.userData.baseYOffset || 0)) *
      (rawProgress > 0.9 ? 1 : rawProgress);

    // Position Interpolation
    stack.position.x = THREE.MathUtils.lerp(0, targetX, smoothOut);
    stack.position.z = THREE.MathUtils.lerp(0, targetZ, smoothOut);
    stack.position.y = THREE.MathUtils.lerp(-1.5 + i * 0.1, targetY, smoothOut);

    // 4. VELOCITY STRETCHING
    const vVel = Math.cos(time * waveSpeed + i * 0.6);
    const intensity = 0.25 + spinBoost * 0.5;
    const stretch = 1 + Math.abs(vVel) * 0.12 * intensity;
    const baseScale = THREE.MathUtils.lerp(
      0,
      1,
      Math.min(rawProgress * 1.5, 1),
    );
    stack.scale.set(baseScale, baseScale * stretch, baseScale);

    const mainCoin = stack.children[0];

    // 5. LEADING-EDGE TILTING
    const tiltIntensity = 0.12 + spinBoost * 0.2;
    stack.rotation.x = vVel * tiltIntensity * smoothOut;
    stack.rotation.z = -vVel * tiltIntensity * 0.5 * smoothOut;

    // Reset the extra rotation from the infinity path
    stack.rotation.y = 0;

    // Smooth individual spin
    const individualSpin = (0.004 + spinBoost * 0.15) * rawProgress;
    mainCoin.rotation.x += individualSpin;
  });

  // Update controls
  controls.update();

  // Log camera position changes (throttled to avoid spam) - but camera is steady, so maybe remove or keep for orbit
  const currentPosition = camera.position.clone();
  if (currentPosition.distanceTo(previousCameraPosition) > 0.01) {
    // Threshold for change detection
    console.log("Camera position changed to:", currentPosition);
    previousCameraPosition.copy(currentPosition);
  }

  // Render with renderer
  renderer.render(scene, camera);
}

animate();

// Handle resize
window.addEventListener("resize", () => {
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

      createCoins(); // Recreate with adjusted radius
    } else {
      controls.enablePan = true;
      params.enableOrbitControls = false;
      controls.enabled = false;
      camera.position.set(0, 0, 8);
      params.coinGroupY = 0;
      coinGroup.position.y = params.coinGroupY;
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

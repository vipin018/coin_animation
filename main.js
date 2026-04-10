import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

class ThemeManager {
  constructor(experience) {
    this.experience = experience;
    this.current = "coral";
    this.themes = {
      coral: {
        palette: [
          0xffb7a2, 0xffa07a, 0xff8a75, 0xff7660, 0xee6b5e, 0xff9e80, 0xffccbc,
          0xff8a65,
        ],
        metalness: 0.3,
        roughness: 0.4,
      },
      monochrome: {
        palette: [
          0xeeeeee, 0xdddddd, 0xcccccc, 0xbbbbbb, 0xaaaaaa, 0x999999, 0x888888,
          0x777777,
        ],
        metalness: 0.8,
        roughness: 0.2,
      },
    };

    this.btn = document.getElementById("theme-toggle");
    this.btn.addEventListener("click", () => this.toggle());
    document.body.classList.add("theme-coral");
  }

  toggle() {
    this.current = this.current === "coral" ? "monochrome" : "coral";
    document.body.classList.toggle("theme-coral");
    document.body.classList.toggle("theme-monochrome");
    this.apply();
  }

  apply() {
    const theme = this.themes[this.current];
    this.experience.coins.forEach((stack, i) => {
      const mesh = stack.children[0];
      mesh.material.color
        .setHex(theme.palette[i % theme.palette.length])
        .convertSRGBToLinear();
      mesh.material.metalness = theme.metalness;
      mesh.material.roughness = theme.roughness;
    });
  }
}

class InputHandler {
  constructor() {
    this.spinBoost = 0;
    this.maxBoost = 0.2;
    this.touchStartY = 0;

    window.addEventListener(
      "wheel",
      (e) => {
        this.spinBoost = Math.min(
          this.spinBoost + Math.abs(e.deltaY) * 0.0001,
          this.maxBoost,
        );
      },
      { passive: true },
    );

    window.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) this.touchStartY = e.touches[0].clientY;
      },
      { passive: true },
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length !== 1) return;
        const deltaY = Math.abs(e.touches[0].clientY - this.touchStartY);
        if (deltaY > 10) {
          this.spinBoost = Math.min(
            this.spinBoost + deltaY * 0.0005,
            this.maxBoost,
          );
          this.touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true },
    );
  }

  update() {
    this.spinBoost *= 0.985;
    if (this.spinBoost < 0.0001) this.spinBoost = 0;
  }
}

class CoinExperience {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.coins = [];
    this.config = {
      numCoins: 15,
      radius: 4,
      coinRadius: 0.65,
      coinHeight: 0.125,
      rotationSpeed: 5.0,
    };
    this.init();
  }

  init() {
    const geometry = new THREE.CylinderGeometry(
      this.config.coinRadius,
      this.config.coinRadius,
      this.config.coinHeight,
      64,
    );

    for (let i = 0; i < this.config.numCoins; i++) {
      const stack = new THREE.Group();
      stack.userData.baseYOffset = i % 2 === 0 ? 0.15 : -0.15;

      const material = new THREE.MeshPhysicalMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMapIntensity: 1.5,
        clearcoat: 0.2,
        transparent: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Initial orientation
      mesh.rotation.y = (i / this.config.numCoins) * Math.PI * 2 + Math.PI / 2;
      mesh.rotation.z = Math.PI / 2;

      stack.add(mesh);
      this.group.add(stack);
      this.coins.push(stack);
    }
  }

  update(time, introProgress, spinBoost, baseY) {
    this.group.position.y = baseY + Math.sin(time * 1.2) * 0.08;
    this.group.rotation.y +=
      (0.005 + spinBoost) * this.config.rotationSpeed * 0.3;
    this.group.rotation.x =
      Math.PI / 2 + Math.sin(time * 0.6) * 0.03 + spinBoost * 0.05;

    this.coins.forEach((stack, i) => {
      const coinDelay = (i / this.config.numCoins) * 0.8;
      const rawProgress = Math.max(
        0,
        Math.min((introProgress - coinDelay) / 0.4, 1),
      );
      const smoothOut = 1 - Math.pow(1 - rawProgress, 4);

      const angle = (i / this.config.numCoins) * Math.PI * 2;
      const breathing = Math.sin(time * 1.2) * 0.1;
      const dynRadius = this.config.radius + breathing;

      const vVel = Math.cos(time * 2.0 + i * 0.6);
      const targetY =
        (vVel * 0.25 + stack.userData.baseYOffset) *
        (rawProgress > 0.9 ? 1 : rawProgress);

      stack.position.x = THREE.MathUtils.lerp(
        0,
        Math.cos(angle) * dynRadius,
        smoothOut,
      );
      stack.position.z = THREE.MathUtils.lerp(
        0,
        Math.sin(angle) * dynRadius,
        smoothOut,
      );
      stack.position.y = THREE.MathUtils.lerp(
        -1.5 + i * 0.1,
        targetY,
        smoothOut,
      );

      const stretch = 1 + Math.abs(vVel) * 0.12 * (0.25 + spinBoost * 0.5);
      const baseScale = THREE.MathUtils.lerp(
        0,
        1,
        Math.min(rawProgress * 1.5, 1),
      );
      stack.scale.set(baseScale, baseScale * stretch, baseScale);

      stack.rotation.x = vVel * (0.12 + spinBoost * 0.2) * smoothOut;
      stack.children[0].rotation.x += (0.004 + spinBoost * 0.15) * rawProgress;
    });
  }
}

class App {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.inputs = new InputHandler();
    this.experience = new CoinExperience(this.scene);
    this.themes = new ThemeManager(this.experience);

    this.time = 0;
    this.introElapsed = 0;
    this.isMobile = window.innerWidth < 768;

    this.initRenderer();
    this.initLights();
    this.initEnvironment();
    this.setupControls();
    this.handleResize();

    window.addEventListener("resize", () => this.handleResize());
    this.themes.apply();
    this.animate();
  }

  initRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);
  }

  initEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;

    new RGBELoader().load(
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = tex;
      },
    );
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enabled = false;
  }

  handleResize() {
    this.isMobile = window.innerWidth < 768;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const camZ = this.isMobile ? 12 : 8;
    const groupY = this.isMobile ? 1.5 : 0;

    this.camera.position.set(0, this.isMobile ? 1.5 : 0, camZ);
    this.experience.group.position.y = groupY;
    this.controls.target.set(0, groupY, 0);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.time += 0.005;
    this.introElapsed = Math.min(this.introElapsed + 0.008, 3.0);
    const introProgress = this.introElapsed / 3.0;

    this.inputs.update();

    // Camera Sway
    this.camera.position.x += Math.sin(this.time * 0.5) * 0.002;
    this.camera.position.y += Math.cos(this.time * 0.4) * 0.002;
    this.camera.lookAt(0, this.isMobile ? 1.5 : 0, 0);

    this.experience.update(
      this.time,
      introProgress,
      this.inputs.spinBoost,
      this.isMobile ? 1.5 : 0,
    );
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();

import * as THREE from "three";
import * as CANNON from "cannon-es";

import InputHandler from "./InputHandler.js";
import Ground from "./Ground.js";
import Player from "./Player.js";
import Platform from "./Platform.js";
import DifficultyManager from "./DifficultyManager.js";
import {
  PointerLockControls,
  EffectComposer,
  UnrealBloomPass,
  RenderPass,
  ShaderPass,
  FilmPass,
  GlitchPass,
} from "three/examples/jsm/Addons.js";

export default class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      20000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    this.controls = new PointerLockControls(this.camera, document.body);
    this.light = { ambient: new THREE.AmbientLight(0xffffff, 0.7) };

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.playingSounds = true;
    this.backgroundMusic = new THREE.Audio(this.listener);
    this.createBackgroundMusic();

    this.composer = new EffectComposer(this.renderer);

    this.initialized = false;
    this.gameOver = false;
    this.paused = false;
    this.showControls = false;

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -11, 0) });

    this.difficultyManager = new DifficultyManager();

    this.platforms = [];
    this.platformSpawnDistance = 10;
    this.maxPlatforms = 12;
    this.lastPlatformZ = -5;
    this.currentHeight = 0;

    this.input = new InputHandler();
    this.ground = new Ground({
      scene: this.scene,
      world: this.world,
      loadingManager: this.loadingManager,
    });
    this.player = new Player({
      scene: this.scene,
      world: this.world,
      camera: this.camera,
      game: this,
      input: this.input,
    });

    this.glitchEffect = null;

    this.timeStep = 1 / 60;

    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPauseTime = 0;
    this.lastFrameTime = null;
    this.gameTime = 0;
    this.showingFinalTime = false;

    this.score = 0;

    this.elements = {
      death: document.getElementById("death-screen"),
      restart: document.getElementById("restart"),
      hud: document.getElementById("hud"),
      pause: document.getElementById("pause"),
      controls: document.getElementById("controls"),
    };

    this.ground.loadPromise.then(() => this.init());
  }
  createBackgroundMusic() {
    new THREE.AudioLoader(this.loadingManager).load(
      "/Sounds/background.mp3",
      (buffer) => {
        this.backgroundMusic.setBuffer(buffer);
        this.backgroundMusic.setVolume(0.5);
        this.backgroundMusic.setLoop(true);
      }
    );
  }
  pauseAllSounds() {
    Object.values(this.player.sounds).forEach((soundData) =>
      soundData.sound.pause()
    );
    this.backgroundMusic.pause();
  }
  playAllSounds() {
    Object.values(this.player.sounds).forEach((soundData) =>
      soundData.sound.play()
    );
    this.backgroundMusic.play();
  }
  init() {
    this.createLoadingManager();
    this.createBackground();
    this.setupPostProcessing();
    this.adjustEffects(1.5);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.scene.add(this.light.ambient);

    this.renderer.setAnimationLoop(() => this.update());

    this.spawnInitialPlatforms();
  }
  addListeners() {
    window.addEventListener("resize", this.resize.bind(this));

    window.addEventListener("click", () => {
      this.initialized && !this.paused && this.controls.lock();

      if (!this.backgroundMusic.isPlaying && !this.paused && !this.gameOver)
        this.backgroundMusic.play();
    });

    window.addEventListener("keydown", ({ code }) => {
      if (code === "KeyC") this.showControls = true;

      if (!this.backgroundMusic.isPlaying && !this.paused && !this.gameOver)
        this.backgroundMusic.play();
    });

    window.addEventListener("keyup", ({ code }) => {
      if (code === "KeyC") this.showControls = false;

      if (code === "KeyP" && !this.gameOver) this.paused = !this.paused;
      else return;

      if (this.paused) {
        this.controls.unlock();

        this.pauseStartTime = performance.now();
        this.elements.pause.classList.add("active");

        this.elements.hud.style.opacity = 0;

        document.getElementById("pause-level").textContent =
          this.difficultyManager.difficultyLevel;
        document.getElementById("pause-score").textContent = this.score;
        document.getElementById("pause-time").textContent =
          this.getFormattedGameTime();
      } else {
        if (!this.controls.isLocked) this.controls.lock();

        if (this.pauseStartTime) {
          this.totalPauseTime += performance.now() - this.pauseStartTime;
          this.lastFrameTime = performance.now();
        }

        this.elements.pause.classList.remove("active");
        this.elements.hud.style.opacity = 1;
      }
    });

    this.elements.restart.addEventListener("click", () =>
      window.location.reload()
    );
  }
  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
  createLoadingManager() {
    this.loadingManager = new THREE.LoadingManager();
    const loadingScreen = document.getElementById("loading-screen");
    const loadingBar = document.getElementById("loading-bar");
    const loadingPercentage = document.getElementById("loading-percentage");
    const crosshair = document.getElementById("crosshair");

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = (itemsLoaded / itemsTotal) * 100;
      const percentage = Math.round(progress);
      loadingBar.style.width = `${percentage}%`;
      loadingPercentage.textContent = `${percentage}%`;
    };

    this.loadingManager.onLoad = () => {
      setTimeout(() => {
        this.initialized = true;
        loadingScreen.style.opacity = 0;
        crosshair.style.opacity = 0.5;
        setTimeout(() => {
          loadingScreen.style.display = "none";
          this.elements.hud.style.display = "flex";

          this.startTime = Date.now();
          this.addListeners();

          document.querySelector(".controls-temporary").style.display = "block";
        }, 1000);
      }, 1000);
    };
  }
  createBackground() {
    const geometry = new THREE.BoxGeometry(10000, 10000, 10000);
    const textureLoader = new THREE.TextureLoader(this.loadingManager);
    const texture = textureLoader.load("/Background/background.jpg");
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    this.skybox = new THREE.Mesh(geometry, material);
    this.scene.add(this.skybox);
  }
  setupPostProcessing() {
    const CustomRetroEffect = {
      uniforms: {
        tDiffuse: { value: null },
        offset: { value: 0.005 },
        vignetteIntensity: { value: 0.4 },
        time: { value: 0 },
        scanlineIntensity: { value: 0.03 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float vignetteIntensity;
        uniform float time;
        uniform float scanlineIntensity;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          
          vec4 cr = texture2D(tDiffuse, uv + vec2(offset, 0.0));
          vec4 cga = texture2D(tDiffuse, uv);
          vec4 cb = texture2D(tDiffuse, uv - vec2(offset, 0.0));
          
          vec4 color = vec4(cr.r, cga.g, cb.b, cga.a);

          float scanline = sin(uv.y * 800.0 + time) * scanlineIntensity;
          color.rgb += scanline;

          float vignette = 1.0 - smoothstep(0.5, 1.0, length(uv - 0.5) * 1.8 * vignetteIntensity);
          color.rgb *= mix(2.0, vignette, 1.0);
          
          gl_FragColor = color;
        }
      `,
    };

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      100
    );
    bloomPass.threshold = 0.002;
    bloomPass.strength = 2.0;
    bloomPass.radius = 0;
    this.composer.addPass(bloomPass);

    const retroPass = new ShaderPass(CustomRetroEffect);
    retroPass.uniforms.offset.value = 0.003;
    retroPass.uniforms.vignetteIntensity.value = 0.8;
    this.composer.addPass(retroPass);

    const filmPass = new FilmPass(0.35, 0.025, 648, false);
    this.composer.addPass(filmPass);

    this.glitchEffect = new GlitchPass();
    this.glitchEffect.goWild = true;
    this.glitchEffect.enabled = false;
    this.composer.addPass(this.glitchEffect);

    this.effectsStartTime = Date.now();
  }
  adjustEffects(intensity = 1.0) {
    const passes = this.composer.passes;
    passes.forEach((pass) => {
      if (pass instanceof UnrealBloomPass) pass.strength = 1.0 * intensity;
      else if (pass instanceof ShaderPass && pass.material.uniforms.offset) {
        pass.material.uniforms.offset.value = 0.003 * intensity;
      }
    });
  }
  spawnInitialPlatforms() {
    this.spawnPlatform(0, 0, -30);

    for (let i = 1; i < this.maxPlatforms; i++) this.spawnPlatform();
  }
  spawnPlatform(forcedX = null, forcedY = null, forcedZ = null) {
    const difficulty = this.difficultyManager.updateDifficulty(
      this.player.physics.position.z
    );

    const x =
      forcedX !== null
        ? forcedX
        : (Math.random() * 2 - 1) * difficulty.lateralVariation;

    if (forcedY !== null) this.currentHeight = forcedY;
    else {
      const heightVariation =
        (Math.random() * 2 - 1) * difficulty.heightVariation;
      this.currentHeight += heightVariation;
      this.currentHeight = Math.max(-2, Math.min(3, this.currentHeight));
    }

    const z =
      forcedZ !== null
        ? forcedZ
        : this.lastPlatformZ - difficulty.platformDistance;

    this.lastPlatformZ = z;

    const rotation = {
      x: (Math.random() * 2 - 1) * difficulty.rotationRange,
      y: (Math.random() * 2 - 1) * difficulty.rotationRange,
      z: (Math.random() * 2 - 1) * difficulty.rotationRange,
    };

    const platform = new Platform({
      scene: this.scene,
      world: this.world,
      position: new CANNON.Vec3(x, this.currentHeight, z),
      dimensions: {
        width: difficulty.platformSize.width,
        height: 0.5,
        depth: difficulty.platformSize.depth,
      },
      shape: difficulty.shape,
      rotation: rotation,
    });

    this.platforms.push(platform);

    if (this.platforms.length > this.maxPlatforms) {
      const platformToRemove = this.platforms[0];
      platformToRemove.startDespawnAnimation();

      setTimeout(() => {
        this.platforms.shift();
      }, platformToRemove.animationDuration);
    }
  }
  render() {
    this.composer.render(this.scene, this.camera);
  }
  updateUI() {
    this.score =
      Math.floor(
        this.player.physics.position.z *
          (this.difficultyManager.difficultyLevel + 0.5) *
          -1
      ) - 13;

    if (this.score <= 0) this.score = 0;

    document.getElementById("hud-score").innerText = this.score;

    document.getElementById("hud-level").innerText =
      this.difficultyManager.difficultyLevel;

    document.getElementById("hud-time").innerText = this.getFormattedGameTime();

    this.elements.controls.style.opacity = this.showControls ? 0.8 : 0;
    this.player.crosshair.style.opacity = this.showControls ? 0 : 0.5;
  }
  update() {
    if (this.paused) {
      this.pauseAllSounds();
      this.playingSounds = false;
    } else if (!this.playingSounds) {
      this.playAllSounds();
      this.playingSounds = true;
    }

    if (!this.initialized || this.paused) return;

    if (!this.gameOver) {
      const currentTime = performance.now();
      if (this.lastFrameTime === null) this.lastFrameTime = currentTime;

      const deltaTime = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      this.gameTime += deltaTime * 1000;

      this.controls.update();
      this.world.step(this.timeStep);

      this.ground.update(this.timeStep);
      this.player.update();

      const playerZ = this.player.physics.position.z;
      const lastPlatformDistance = Math.abs(playerZ - this.lastPlatformZ);

      if (
        lastPlatformDistance <
        this.platformSpawnDistance * this.maxPlatforms * 0.425
      )
        this.spawnPlatform();

      this.platforms.forEach((platform) => {
        platform.update();
      });

      this.skybox.position.copy(this.camera.position);

      this.updateUI();
    } else this.startDeathSequence();

    if (this.composer.passes.length > 0) {
      const chromaticPass = this.composer.passes.find(
        (pass) => pass instanceof ShaderPass && pass.material.uniforms.time
      );
      if (chromaticPass)
        chromaticPass.uniforms.time.value =
          (Date.now() - this.effectsStartTime) * 0.001;
    }

    this.render();
  }
  startDeathSequence() {
    this.controls.unlock();
    this.controls.disconnect();

    this.player.crosshair.style.opacity = 0;

    this.glitchEffect.enabled = true;

    this.elements.hud.style.display = "none";

    if (!this.showingFinalTime)
      document.getElementById("death-time").textContent =
        this.getFormattedGameTime();
    this.showingFinalTime = true;

    document.getElementById("death-level").textContent =
      this.difficultyManager.difficultyLevel;

    let finalDistance = Math.floor(this.player.physics.position.z * -1) - 25;
    if (finalDistance < 0) finalDistance = 0;
    document.getElementById("death-distance").textContent = finalDistance;

    document.getElementById("death-score").textContent = this.score;

    setTimeout(() => {
      this.showStars();
    }, 1250);

    this.elements.death.style.display = "block";

    this.pauseAllSounds();
  }
  getFormattedGameTime() {
    const timeElapsed = Math.floor(this.gameTime / 1000);
    const hours = Math.floor(timeElapsed / 3600);
    const minutes = Math.floor((timeElapsed % 3600) / 60);
    const seconds = timeElapsed % 60;
    return `${hours > 0 ? hours.toString().padStart(2, "0") + ":" : ""}${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  showStars() {
    const stars = document.querySelectorAll(".star-death");
    const totalStars = stars.length;
    const earnedStars = Math.min(
      totalStars,
      Math.floor(this.difficultyManager.difficultyLevel * 0.5)
    );

    for (let i = 0; i < earnedStars; i++) {
      const star = stars[i];

      setTimeout(() => {
        star.classList.add("active");
      }, i * 350);
    }
  }
}
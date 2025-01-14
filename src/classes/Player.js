import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Player {
  constructor({
    scene = new THREE.Scene(),
    world = new CANNON.World(),
    camera = new THREE.Object3D(),
    game = null,
    input = null,
    platforms = [],
    position = new CANNON.Vec3(0, 5, 20),
  }) {
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.game = game;
    this.input = input;
    this.platforms = platforms;
    this.position = position;

    this.audioLoader = new THREE.AudioLoader(this.game.loadingManager);
    this.sounds = this.createSounds();
    this.loadSounds();

    this.landSoundPlayed = false;

    this.moveSpeed = 5;
    this.moveDirection = new THREE.Vector3();
    this.isMoving = false;

    this.deathDistance = -35;

    this.sprintMultiplier = 1.6;
    this.isSprinting = false;

    this.jumpForce = 7;
    this.canJump = false;
    this.isJumping = false;

    this.headHeight = 1.7;
    this.cameraOffset = new THREE.Vector3(0, this.headHeight, 0);
    this.targetCameraPosition = new THREE.Vector3();

    this.bobCycle = 0;
    this.currentBobAmount = 0;
    this.targetBobAmount = 0;
    this.bobConfig = {
      idleSpeed: 1,
      walkSpeed: 7,
      sprintSpeed: 9,
      idleAmount: 0.05,
      walkAmount: 0.1,
      sprintAmount: 0.125,
      transitionSpeed: 0.03,
    };

    this.physics = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.5, 0.25)),
      position: this.position,
      material: new CANNON.Material({ friction: 0, restitution: 0 }),
    });

    this.physics.fixedRotation = true;
    this.physics.updateMassProperties();

    this.raycastLength = 1.5;
    this.raycasts = {
      center: {
        start: new CANNON.Vec3(),
        end: new CANNON.Vec3(),
        result: new CANNON.RaycastResult(),
      },
      frontLeft: {
        start: new CANNON.Vec3(),
        end: new CANNON.Vec3(),
        result: new CANNON.RaycastResult(),
      },
      frontRight: {
        start: new CANNON.Vec3(),
        end: new CANNON.Vec3(),
        result: new CANNON.RaycastResult(),
      },
      backLeft: {
        start: new CANNON.Vec3(),
        end: new CANNON.Vec3(),
        result: new CANNON.RaycastResult(),
      },
      backRight: {
        start: new CANNON.Vec3(),
        end: new CANNON.Vec3(),
        result: new CANNON.RaycastResult(),
      },
    };

    this.crosshair = document.getElementById("crosshair");

    this.init();
  }
  createSounds() {
    return {
      footsteps: {
        path: "/Sounds/footsteps.mp3",
        sound: new THREE.Audio(this.game.listener),
        volume: 1,
        shouldLoop: true,
        loaded: false,
      },
      jump: {
        path: "/Sounds/jump.flac",
        sound: new THREE.Audio(this.game.listener),
        volume: 1,
        shouldLoop: false,
        loaded: false,
      },
      land: {
        path: "/Sounds/land.wav",
        sound: new THREE.Audio(this.game.listener),
        volume: 1,
        shouldLoop: false,
        loaded: false,
      },
      effort: {
        path: "/Sounds/effort.ogg",
        sound: new THREE.Audio(this.game.listener),
        volume: 1,
        shouldLoop: false,
        loaded: false,
        playing: false,
      },
    };
  }
  loadSounds() {
    Object.values(this.sounds).forEach((soundData) => {
      this.audioLoader.load(soundData.path, (buffer) => {
        soundData.sound.setBuffer(buffer);
        soundData.sound.setVolume(soundData.volume);
        soundData.sound.loop = soundData.shouldLoop;

        soundData.loaded = true;
      });
    });
  }
  playSound(name) {
    const soundData = this.sounds[name];
    if (soundData && soundData.loaded && !soundData.sound.isPlaying)
      soundData.sound.play();
  }
  setSoundVolume(name, value) {
    this.sounds[name].sound.setVolume(value);
  }
  setSoundSpeed(name, value) {
    this.sounds[name].sound.setPlaybackRate(value);
  }
  init() {
    this.world.addBody(this.physics);
    this.physics.position.copy(this.position);
    this.updateCameraPosition();

    this.initCrosshair();
  }
  checkGrounded() {
    const offset = 0.2;
    const pos = this.physics.position;

    this.raycasts.center.start.copy(pos);
    this.raycasts.center.end.copy(pos);
    this.raycasts.center.end.y -= this.raycastLength;

    this.raycasts.frontLeft.start.set(pos.x - offset, pos.y, pos.z - offset);
    this.raycasts.frontLeft.end.copy(this.raycasts.frontLeft.start);
    this.raycasts.frontLeft.end.y -= this.raycastLength;

    this.raycasts.frontRight.start.set(pos.x + offset, pos.y, pos.z - offset);
    this.raycasts.frontRight.end.copy(this.raycasts.frontRight.start);
    this.raycasts.frontRight.end.y -= this.raycastLength;

    this.raycasts.backLeft.start.set(pos.x - offset, pos.y, pos.z + offset);
    this.raycasts.backLeft.end.copy(this.raycasts.backLeft.start);
    this.raycasts.backLeft.end.y -= this.raycastLength;

    this.raycasts.backRight.start.set(pos.x + offset, pos.y, pos.z + offset);
    this.raycasts.backRight.end.copy(this.raycasts.backRight.start);
    this.raycasts.backRight.end.y -= this.raycastLength;

    Object.values(this.raycasts).forEach((raycast) => {
      raycast.result.reset();

      this.world.raycastClosest(
        raycast.start,
        raycast.end,
        {
          collisionFilterMask: -1,
          skipBackfaces: true,
        },
        raycast.result
      );
    });

    return Object.values(this.raycasts).some(
      (raycast) => raycast.result.hasHit
    );
  }
  handleInput() {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    this.moveDirection.set(0, 0, 0);
    this.isMoving = false;
    this.isSprinting = false;

    const onGround = this.checkGrounded();

    if (onGround) {
      this.canJump = true;
      this.isJumping = false;

      if (!this.landSoundPlayed) {
        this.playSound("land");
        this.landSoundPlayed = true;
      }
    } else {
      this.canJump = false;
      this.landSoundPlayed = false;
    }

    if (this.input.keys.includes("KeyW")) {
      this.moveDirection.add(cameraDirection);
      this.isMoving = true;
    } else if (this.input.keys.includes("KeyS")) {
      this.moveDirection.sub(cameraDirection);
      this.isMoving = true;
    }

    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

    if (this.input.keys.includes("KeyD")) {
      this.moveDirection.add(rightVector);
      this.isMoving = true;
    } else if (this.input.keys.includes("KeyA")) {
      this.moveDirection.sub(rightVector);
      this.isMoving = true;
    }

    if (this.moveDirection.length() > 0) this.moveDirection.normalize();

    let currentSpeed = this.moveSpeed;
    if (this.input.keys.includes("ShiftLeft")) {
      currentSpeed *= this.sprintMultiplier;
      this.isSprinting = true;
    }

    const velocity = this.physics.velocity;
    velocity.x = this.moveDirection.x * currentSpeed;
    velocity.z = this.moveDirection.z * currentSpeed;

    if (this.input.keys.includes("Space") && this.canJump) {
      velocity.y = this.jumpForce;
      this.canJump = false;
      this.isJumping = true;
      this.playSound("jump");
      setTimeout(() => this.playSound("effort"), 200);
    }

    if (onGround && this.isMoving) {
      if (this.isSprinting) {
        this.setSoundSpeed("footsteps", 1.25);
        this.setSoundVolume("footsteps", 0.75);
      } else {
        this.setSoundSpeed("footsteps", 0.8);
        this.setSoundVolume("footsteps", 0.5);
      }
      this.playSound("footsteps");
    } else this.sounds.footsteps.sound.pause();

    this.physics.velocity.copy(velocity);
    this.position.copy(this.physics.position);
  }
  updateHeadBob(deltaTime) {
    let targetSpeed;
    let targetAmount;

    if (this.isSprinting && this.isMoving) {
      targetSpeed = this.bobConfig.sprintSpeed;
      targetAmount = this.bobConfig.sprintAmount;
    } else if (this.isMoving) {
      targetSpeed = this.bobConfig.walkSpeed;
      targetAmount = this.bobConfig.walkAmount;
    } else {
      targetSpeed = this.bobConfig.idleSpeed;
      targetAmount = this.bobConfig.idleAmount;
    }

    if (this.canJump) {
      this.bobCycle += deltaTime * targetSpeed;
      this.targetBobAmount = targetAmount;
    } else this.targetBobAmount = 0;

    this.currentBobAmount = THREE.MathUtils.lerp(
      this.currentBobAmount,
      this.targetBobAmount,
      this.bobConfig.transitionSpeed
    );

    const bobOffsetY = Math.sin(this.bobCycle) * this.currentBobAmount;

    if (!this.isMoving && Math.abs(this.currentBobAmount) < 0.001) {
      this.bobCycle = 0;
      return 0;
    }

    return bobOffsetY;
  }
  updateCameraPosition() {
    const bobOffset = this.updateHeadBob(1 / 60);

    this.targetCameraPosition.copy(this.physics.position);
    this.targetCameraPosition.add(this.cameraOffset);
    this.camera.position.lerp(this.targetCameraPosition, 0.5);

    this.camera.position.y += bobOffset;
  }
  initCrosshair() {
    this.crosshair = document.getElementById("crosshair");

    ["tl", "tr", "bl", "br"].forEach((pos) => {
      const corner = document.createElement("div");
      corner.className = `corner corner-${pos}`;
      this.crosshair.appendChild(corner);
    });

    for (let i = 1; i <= 2; i++) {
      const ring = document.createElement("div");
      ring.className = `crosshair-ring ring-${i}`;
      this.crosshair.appendChild(ring);
    }

    this.particlesContainer = document.createElement("div");
    this.particlesContainer.className = "particles-container";
    this.crosshair.appendChild(this.particlesContainer);

    this.pulseTime = 0;
    this.lastShake = 0;
    this.cornerRotations = [0, 0, 0, 0];
    this.ringRotations = [0, 0];
  }
  updateCrosshair(deltaTime) {
    let baseSize = 24;
    let classes = [];

    this.pulseTime += deltaTime;

    this.cornerRotations = this.cornerRotations.map((rotation, index) => {
      const baseSpeed = this.isSprinting ? 3 : 1.5;
      const individualSpeed = baseSpeed * (1 + index * 0.2);
      const wobble = Math.sin(this.pulseTime * 2) * 15;
      return rotation + (individualSpeed + wobble * 0.1) * deltaTime;
    });

    this.ringRotations = this.ringRotations.map((rotation, index) => {
      const direction = index % 2 ? 1 : -1;
      const speed = this.isSprinting ? 2 : 1;
      return rotation + direction * speed * deltaTime;
    });

    if (this.isJumping) {
      baseSize *= 1.8;
      classes.push("jumping");
      this.addCrosshairShake(2);
    }

    if (this.isMoving) {
      classes.push("moving");
      if (this.isSprinting) {
        baseSize *= 1.4;
        classes.push("sprinting");
      }
    }

    const pulseFactor = Math.sin(this.pulseTime * 2) * 0.1 + 1;
    const currentSize = parseInt(this.crosshair.style.width) || baseSize;
    const smoothSize = THREE.MathUtils.lerp(
      currentSize,
      baseSize * pulseFactor,
      0.15
    );

    this.crosshair.style.width = `${smoothSize}px`;
    this.crosshair.style.height = `${smoothSize}px`;

    const corners = this.crosshair.getElementsByClassName("corner");
    Array.from(corners).forEach((corner, index) => {
      corner.style.transform = `rotate(${this.cornerRotations[index]}rad)`;
    });

    const rings = this.crosshair.getElementsByClassName("crosshair-ring");
    Array.from(rings).forEach((ring, index) => {
      ring.style.transform = `translate(-50%, -50%) rotate(${this.ringRotations[index]}rad)`;
    });

    this.crosshair.className = classes.join(" ");

    const targetOpacity = this.isMoving || this.isJumping ? 0.9 : 0.7;
    const currentOpacity = parseFloat(this.crosshair.style.opacity) || 0.7;
    this.crosshair.style.opacity = THREE.MathUtils.lerp(
      currentOpacity,
      targetOpacity,
      0.15
    );

    if (this.lastShake > 0) {
      const shake = Math.random() * this.lastShake;
      this.crosshair.style.transform = `translate(-50%, -50%) translate(${shake}px, ${shake}px)`;
      this.lastShake *= 0.9;
    } else this.crosshair.style.transform = "translate(-50%, -50%)";
  }
  addCrosshairShake(intensity) {
    this.lastShake = intensity;
  }
  checkGameOver() {
    if (this.position.y < this.deathDistance) this.game.gameOver = true;
  }
  update(deltaTime = 1 / 60) {
    this.handleInput();
    this.updateHeadBob(deltaTime);
    this.updateCameraPosition();
    this.updateCrosshair(deltaTime);
    this.checkGameOver();
  }
}
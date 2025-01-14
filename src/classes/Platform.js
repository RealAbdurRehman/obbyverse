import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Platform {
  constructor({
    scene = new THREE.Scene(),
    world = new CANNON.World(),
    position = new CANNON.Vec3(0, 1, -30),
    dimensions = { width: 2.5, height: 0.5, depth: 2.5 },
    shape = "cube",
    rotation = { x: 0, y: 0, z: 0 },
  }) {
    this.scene = scene;
    this.world = world;
    this.position = position;
    this.dimensions = dimensions;
    this.shape = shape;
    this.rotation = rotation;

    this.model = null;
    this.physics = this.createPhysics();

    this.animationMixer = null;
    this.spawnAction = null;
    this.despawnAction = null;
    this.isSpawning = false;
    this.isDespawning = false;
    this.animationDuration = 300;

    this.createModel();
    this.setupAnimations();
    this.init();
  }
  init() {
    this.world.addBody(this.physics);

    this.update();
    this.scene.add(this.model);
    this.startSpawnAnimation();
  }
  setupAnimations() {
    this.animationMixer = new THREE.AnimationMixer(this.model);

    const spawnTrack = new THREE.VectorKeyframeTrack(
      ".scale",
      [0, 0.3],
      [0, 0, 0, 1, 1, 1],
      THREE.InterpolateSmooth
    );

    const despawnTrack = new THREE.VectorKeyframeTrack(
      ".scale",
      [0, 0.3],
      [1, 1, 1, 0, 0, 0],
      THREE.InterpolateSmooth
    );

    const spawnClip = new THREE.AnimationClip("spawn", 0.3, [spawnTrack]);
    const despawnClip = new THREE.AnimationClip("despawn", 0.3, [despawnTrack]);

    this.spawnAction = this.animationMixer.clipAction(spawnClip);
    this.despawnAction = this.animationMixer.clipAction(despawnClip);

    this.spawnAction.clampWhenFinished = true;
    this.despawnAction.clampWhenFinished = true;
    this.spawnAction.loop = THREE.LoopOnce;
    this.despawnAction.loop = THREE.LoopOnce;

    this.model.scale.set(0, 0, 0);
  }
  startSpawnAnimation() {
    this.isSpawning = true;
    this.spawnAction.reset();
    this.spawnAction.play();

    this.physics.collisionResponse = 0;
    setTimeout(() => {
      this.physics.collisionResponse = 1;
      this.isSpawning = false;
    }, this.animationDuration);
  }
  startDespawnAnimation() {
    if (this.isDespawning) return;

    this.isDespawning = true;
    this.despawnAction.reset();
    this.despawnAction.play();

    this.physics.collisionResponse = 0;

    setTimeout(() => {
      this.scene.remove(this.model);
      this.world.removeBody(this.physics);
      this.model.geometry.dispose();
      this.model.material.dispose();
    }, this.animationDuration);
  }
  createModel() {
    let geometry, physicsShape;
    const material = new THREE.MeshStandardMaterial({
      color: this.getShapeColor(),
      roughness: 0.7,
      metalness: 0.3,
    });

    switch (this.shape) {
      case "sphere":
        const radius =
          Math.min(this.dimensions.width, this.dimensions.depth) / 2;
        geometry = new THREE.SphereGeometry(radius, 32, 32);
        physicsShape = new CANNON.Sphere(radius);
        break;
      case "cylinder":
        const cylinderRadius =
          Math.min(this.dimensions.width, this.dimensions.depth) / 2;
        geometry = new THREE.CylinderGeometry(
          cylinderRadius,
          cylinderRadius,
          this.dimensions.height,
          32
        );
        physicsShape = new CANNON.Cylinder(
          cylinderRadius,
          cylinderRadius,
          this.dimensions.height,
          32
        );
        break;
      case "pyramid":
        const pyramidBaseWidth = Math.max(
          this.dimensions.width,
          this.dimensions.depth
        );
        geometry = new THREE.ConeGeometry(
          pyramidBaseWidth / 2,
          this.dimensions.height * 2,
          4
        );
        physicsShape = new CANNON.Box(
          new CANNON.Vec3(
            pyramidBaseWidth / 2,
            this.dimensions.height,
            pyramidBaseWidth / 2
          )
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(
          this.dimensions.width,
          this.dimensions.height,
          this.dimensions.depth
        );
        physicsShape = new CANNON.Box(
          new CANNON.Vec3(
            this.dimensions.width * 0.5,
            this.dimensions.height * 0.5,
            this.dimensions.depth * 0.5
          )
        );
    }

    this.model = new THREE.Mesh(geometry, material);

    this.model.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    this.physics.quaternion.setFromEuler(
      this.rotation.x,
      this.rotation.y,
      this.rotation.z
    );
  }
  createPhysics() {
    const body = new CANNON.Body({
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.dimensions.width * 0.5,
          this.dimensions.height * 0.5,
          this.dimensions.depth * 0.5
        )
      ),
      type: CANNON.Body.STATIC,
      position: this.position,
      material: new CANNON.Material({ friction: 0, restitution: 0 }),
    });

    body.collisionResponse = 1;
    body.collisionFilterGroup = 1;
    body.collisionFilterMask = -1;

    return body;
  }
  getShapeColor() {
    const getVal = () => Math.floor(Math.random() * 181 + 75);
    const color = `rgb(${getVal()}, ${getVal()}, ${getVal()})`;
    return color;
  }
  update(deltaTime = 1 / 60) {
    if (this.animationMixer) this.animationMixer.update(deltaTime);

    this.model.position.copy(this.physics.position);
    this.model.quaternion.copy(this.physics.quaternion);
  }
}
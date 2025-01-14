import * as THREE from "three";
import * as CANNON from "cannon-es";

import { Globe, Tree, Cargobox, Arch } from "./Props.js";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default class Ground {
  constructor({
    scene = new THREE.Scene(),
    world = new CANNON.World(),
    loadingManager = new THREE.LoadingManager(),
    propSettings = {
      tree: {
        count: 20,
        radiusFromCenter: 10,
        minDistanceBetweenProps: 10,
      },
      cargobox: {
        count: 10,
        radiusFromCenter: 6,
        minDistanceBetweenProps: 10,
        minDistanceFromOtherTypes: 6,
      },
    },
  }) {
    this.scene = scene;
    this.world = world;
    this.loadingManager = loadingManager;
    this.propSettings = propSettings;

    this.loader = new GLTFLoader(this.loadingManager);

    this.dimensions = { radius: 25, height: 1.325 };
    this.model = null;
    this.physics = this.createPhysics();

    this.surface = this.dimensions.height * 0.5;

    this.props = {
      tree: [],
      cargobox: [],
      globe: [],
      arch: [],
    };

    this.loadPromise = new Promise((resolve) => {
      this.loader.load("/Ground/ground.glb", (gltf) => {
        this.model = gltf.scene;
        this.model.scale.set(9.9, 9.9, 9.9);

        this.world.addBody(this.physics);

        Promise.all([
          this.createArch(),
          this.createGlobe(),
          ...this.createPropsByType("tree"),
          ...this.createPropsByType("cargobox"),
        ]).then(() => {
          this.scene.add(this.model);
          resolve();
        });
      });
    });
  }
  init() {
    this.world.addBody(this.physics);
    this.createProps();

    this.update();
    this.scene.add(this.model);
  }
  createProps() {
    this.createGlobe();
    this.createPropsByType("tree");
    this.createPropsByType("cargobox");
  }
  createPropsByType(type, count = this.propSettings[type].count) {
    const PropClass = {
      tree: Tree,
      cargobox: Cargobox,
    }[type];

    const dimensions = {
      tree: { width: 0.4, height: 5, depth: 0.4 },
      cargobox: { width: 19, height: 38, depth: 19 },
    }[type];

    const propPromises = [];

    for (let i = 0; i < count; i++) {
      const position = this.getValidPropPosition(type);
      if (position) {
        const propPromise = new Promise((resolve) => {
          const prop = new PropClass({
            scene: this.scene,
            world: this.world,
            loadingManager: this.loadingManager,
            position: position,
            dimensions: dimensions,
            onLoad: resolve,
          });
          this.props[type].push(prop);
        });
        propPromises.push(propPromise);
      }
    }

    return propPromises;
  }
  getValidPropPosition(type) {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      const minRadius = this.propSettings[type].radiusFromCenter;
      const maxRadius = this.dimensions.radius - 3;
      const radius = Math.random() * (maxRadius - minRadius) + minRadius;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const position = new CANNON.Vec3(x, this.surface, z);

      if (this.isValidPropPosition(type, position)) return position;

      attempts++;
    }

    return null;
  }
  isValidPropPosition(type, position) {
    const settings = this.propSettings[type];
    const distanceFromCenter = Math.sqrt(
      position.x * position.x + position.z * position.z
    );

    if (distanceFromCenter < settings.radiusFromCenter) return false;

    const archMinDistance = 5.5;
    const archPosition = new CANNON.Vec3(0, this.surface, -this.dimensions.radius + 3);
    const dxArch = position.x - archPosition.x;
    const dzArch = position.z - archPosition.z;
    const distanceFromArch = Math.sqrt(dxArch * dxArch + dzArch * dzArch);
    
    if (distanceFromArch < archMinDistance) return false;

    for (const prop of this.props[type]) {
      const dx = prop.position.x - position.x;
      const dz = prop.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < settings.minDistanceBetweenProps) return false;
    }

    if (settings.minDistanceFromOtherTypes) {
      for (const [otherType, props] of Object.entries(this.props)) {
        if (otherType !== type && otherType !== "globe") {
          for (const prop of props) {
            const dx = prop.position.x - position.x;
            const dz = prop.position.z - position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < settings.minDistanceFromOtherTypes) return false;
          }
        }
      }
    }

    return true;
  }
  createArch() {
    return new Promise((resolve) => {
      const archPosition = new CANNON.Vec3(0, this.surface, -this.dimensions.radius + 3);
      const arch = new Arch({
        scene: this.scene,
        world: this.world,
        loadingManager: this.loadingManager,
        position: archPosition,
        dimensions: { width: 0.45, height: 6, depth: 0.6 },
        topDimensions: { width: 1.5, height: 0.6, depth: 0.6 },
        onLoad: resolve,
      });
      this.props.arch.push(arch);
    });
  }
  createGlobe() {
    return new Promise((resolve) => {
      const globePosition = new CANNON.Vec3(0, this.surface, 0);
      const globe = new Globe({
        scene: this.scene,
        world: this.world,
        loadingManager: this.loadingManager,
        position: globePosition,
        dimensions: { width: 1, height: 5, depth: 1 },
        onLoad: resolve,
      });
      this.props.globe.push(globe);
    });
  }
  createPhysics() {
    return new CANNON.Body({
      shape: new CANNON.Cylinder(
        this.dimensions.radius,
        this.dimensions.radius,
        this.dimensions.height,
        32
      ),
      type: CANNON.Body.STATIC,
      material: new CANNON.Material({ friction: 0, restitution: 0 }),
    });
  }
  update(delta) {
    if (!this.model) return;
    this.model.position.copy(this.physics.position);
    this.model.quaternion.copy(this.physics.quaternion);

    Object.values(this.props)
      .flat()
      .forEach((prop) => prop.update(delta));
  }
}
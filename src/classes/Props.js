import * as THREE from "three";
import * as CANNON from "cannon-es";

import { GLTFLoader } from "three/examples/jsm/Addons.js";

class Prop {
  constructor({
    scene = new THREE.Scene(),
    world = new CANNON.World(),
    loadingManager = new THREE.LoadingManager(),
    position = new CANNON.Vec3(),
    dimensions = { width: 1, height: 1, depth: 1 },
    onLoad = null,
  }) {
    this.scene = scene;
    this.world = world;
    this.loadingManager = loadingManager;
    this.position = position;
    this.dimensions = dimensions;
    this.onLoad = onLoad;

    this.loader = new GLTFLoader(this.loadingManager);

    this.mixer = null;
    this.model = null;
    this.physics = null;
  }
  init() {
    this.world.addBody(this.physics);
    this.model.quaternion.copy(this.physics.quaternion);
    this.scene.add(this.model);
    if (this.onLoad) this.onLoad();
  }
  createModel({
    url,
    rotation = 0,
    hasAnimation = false,
    animationIndex = null,
  }) {
    this.createPhysics(rotation);
    this.loader.load(url, (gltf) => {
      this.model = gltf.scene;

      let finalPosition = this.position
        .clone()
        .vadd(
          this.offset.vmul(new CANNON.Vec3(this.scale, this.scale, this.scale))
        );

      this.model.position.set(
        finalPosition.x,
        finalPosition.y,
        finalPosition.z
      );

      this.model.scale.set(this.scale, this.scale, this.scale);

      if (hasAnimation) this.setupAnimations(gltf.animations, animationIndex);

      this.init();
    });
  }
  createPhysics(rotation) {
    this.physics = new CANNON.Body({
      shape: new CANNON.Box(
        new CANNON.Vec3(
          this.dimensions.width * this.scale * 0.5,
          this.dimensions.height * this.scale * 0.5,
          this.dimensions.depth * this.scale * 0.5
        )
      ),
      type: CANNON.Body.STATIC,
      material: new CANNON.Material({ friction: 0, restitution: 0 }),
      position: this.position,
    });

    this.physics.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      rotation
    );
  }
  setupAnimations(animations, index = 0) {
    this.mixer = new THREE.AnimationMixer(this.model);
    const animationToPlay = animations[index];
    const animation = this.mixer.clipAction(animationToPlay);
    animation.setLoop(THREE.LoopRepeat);
    animation.play();
  }
  update(delta) {
    if (this.mixer) this.mixer.update(delta);
  }
}

export class Globe extends Prop {
  constructor(props = {}) {
    super(props);
    this.scale = 7;
    this.offset = new CANNON.Vec3(-0.25, 0, -7);
    this.createModel({
      url: "/Props/Globe/globe.glb",
      hasAnimation: true,
      animationIndex: 0,
    });
  }
}

export class Tree extends Prop {
  constructor(props = {}) {
    super(props);
    this.scale = Math.random() * 2 + 4;
    this.offset = new CANNON.Vec3(0, -0.125, 0);
    this.createModel({
      url: "/Props/Tree/tree.glb",
      rotation: Math.random() * Math.PI * 2,
    });
  }
}

export class Cargobox extends Prop {
  constructor(props = {}) {
    super(props);
    this.scale = Math.random() * 0.0375 + 0.075;
    this.offset = new CANNON.Vec3();
    this.createModel({
      url: "/Props/Cargobox/cargobox.glb",
      rotation: Math.random() * Math.PI * 2,
    });
  }
}

export class Arch extends Prop {
  constructor(props = {}) {
    super(props);
    this.topDimensions = props.topDimensions;

    this.scale = 2.5;
    this.offset = new CANNON.Vec3();
    this.createModel({
      url: "/Props/Arch/arch.glb",
    });
  }
  init() {
    this.addPhysics();
    this.scene.add(this.model);
    if (this.onLoad) this.onLoad();
  }
  addPhysics() {
    this.physics.forEach((body) => {
      this.world.addBody(body);
    });
  }
  createModel({ url }) {
    this.createPhysics();
    this.loader.load(url, (gltf) => {
      this.model = gltf.scene;

      let finalPosition = this.position
        .clone()
        .vadd(
          this.offset.vmul(new CANNON.Vec3(this.scale, this.scale, this.scale))
        );

      this.model.position.set(
        finalPosition.x,
        finalPosition.y,
        finalPosition.z
      );

      this.model.scale.set(this.scale, this.scale, this.scale);

      this.init();
    });
  }
  createPhysics() {
    const offsets = {
      left: new CANNON.Vec3(-2.55, 0, 0),
      right: new CANNON.Vec3(2.55, 0, 0),
      top: new CANNON.Vec3(0, 5, 0),
    };

    this.physics = [
      new CANNON.Body({
        shape: new CANNON.Box(
          new CANNON.Vec3(
            this.dimensions.width * this.scale * 0.5,
            this.dimensions.height * this.scale * 0.5,
            this.dimensions.depth * this.scale * 0.5
          )
        ),
        type: CANNON.Body.STATIC,
        material: new CANNON.Material({ friction: 0, restitution: 0 }),
        position: new CANNON.Vec3(
          this.position.x + offsets.left.x,
          this.position.y + offsets.left.y,
          this.position.z + offsets.left.z
        ),
      }),
      new CANNON.Body({
        shape: new CANNON.Box(
          new CANNON.Vec3(
            this.dimensions.width * this.scale * 0.5,
            this.dimensions.height * this.scale * 0.5,
            this.dimensions.depth * this.scale * 0.5
          )
        ),
        type: CANNON.Body.STATIC,
        material: new CANNON.Material({ friction: 0, restitution: 0 }),
        position: new CANNON.Vec3(
          this.position.x + offsets.right.x,
          this.position.y + offsets.right.y,
          this.position.z + offsets.right.z
        ),
      }),
      new CANNON.Body({
        shape: new CANNON.Box(
          new CANNON.Vec3(
            this.topDimensions.width * this.scale * 0.5,
            this.topDimensions.height * this.scale * 0.5,
            this.topDimensions.depth * this.scale * 0.5
          )
        ),
        type: CANNON.Body.STATIC,
        material: new CANNON.Material({ friction: 0, restitution: 0 }),
        position: new CANNON.Vec3(
          this.position.x + offsets.top.x,
          this.position.y + offsets.top.y,
          this.position.z + offsets.top.z
        ),
      }),
    ];
  }
}
import * as THREE from "three";

/**
 * Boxy Run Scene Logic
 * Ported from Boxy Run (Three.js) with TempleSprint aesthetics.
 */

const Colors = {
  stone: 0x0d0a05,
  amber: 0xd97706,
  ember: 0xc2410c,
  jungle: 0x166534,
  parchment: 0xfef3c7,
  white: 0xffffff,
};

const deg2Rad = Math.PI / 180;

function sinusoid(frequency: number, minimum: number, maximum: number, phase: number, time: number) {
  const amplitude = 0.5 * (maximum - minimum);
  const angularFrequency = 2 * Math.PI * frequency;
  const phaseRadians = (phase * Math.PI) / 180;
  const offset = amplitude * Math.sin(angularFrequency * time + phaseRadians);
  const average = (minimum + maximum) / 2;
  return average + offset;
}

function createBox(dx: number, dy: number, dz: number, color: number, x: number, y: number, z: number, notFlatShading: boolean = false) {
  const geom = new THREE.BoxGeometry(dx, dy, dz);
  const mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: !notFlatShading,
  });
  const box = new THREE.Mesh(geom, mat);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.set(x, y, z);
  return box;
}

function createCylinder(radiusTop: number, radiusBottom: number, height: number, radialSegments: number, color: number, x: number, y: number, z: number) {
  const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  const mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: true,
  });
  const cylinder = new THREE.Mesh(geom, mat);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  cylinder.position.set(x, y, z);
  return cylinder;
}

class Tree {
  public mesh: THREE.Group;
  private scale: number;

  constructor(x: number, y: number, z: number, s: number) {
    this.mesh = new THREE.Group();
    this.scale = s;

    const top = createCylinder(1, 300, 300, 4, Colors.jungle, 0, 1000, 0);
    const mid = createCylinder(1, 400, 400, 4, Colors.jungle, 0, 800, 0);
    const bottom = createCylinder(1, 500, 500, 4, Colors.jungle, 0, 500, 0);
    const trunk = createCylinder(100, 100, 250, 32, 0x241809, 0, 125, 0);

    this.mesh.add(top);
    this.mesh.add(mid);
    this.mesh.add(bottom);
    this.mesh.add(trunk);
    this.mesh.position.set(x, y, z);
    this.mesh.scale.set(s, s, s);
  }

  collides(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    const treeMinX = this.mesh.position.x - this.scale * 250;
    const treeMaxX = this.mesh.position.x + this.scale * 250;
    const treeMinY = this.mesh.position.y;
    const treeMaxY = this.mesh.position.y + this.scale * 1150;
    const treeMinZ = this.mesh.position.z - this.scale * 250;
    const treeMaxZ = this.mesh.position.z + this.scale * 250;
    return treeMinX <= maxX && treeMaxX >= minX && treeMinY <= maxY && treeMaxY >= minY && treeMinZ <= maxZ && treeMaxZ >= minZ;
  }
}

class Character {
  public element: THREE.Group;
  public currentLane = 0;
  public isJumping = false;
  public isSwitchingLeft = false;
  public isSwitchingRight = false;

  private head: THREE.Group;
  private torso: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLowerArm: THREE.Group;
  private rightLowerArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftLowerLeg: THREE.Group;
  private rightLowerLeg: THREE.Group;

  private jumpStartTime = 0;
  private runningStartTime = Date.now() / 1000;
  private pauseStartTime = 0;
  private stepFreq = 2.5;
  private jumpDuration = 0.6;
  private jumpHeight = 1800;
  private queuedActions: string[] = [];

  constructor() {
    this.element = new THREE.Group();
    this.element.position.set(0, 0, -4000);

    // Build parts
    const skinColor = 0xf2c4a8;
    const hairColor = Colors.stone;
    const shirtColor = Colors.amber;
    const shortsColor = 0x4a3820;

    const face = createBox(100, 100, 60, skinColor, 0, 0, 0);
    const hair = createBox(105, 20, 65, hairColor, 0, 50, 0);
    this.head = new THREE.Group();
    this.head.position.set(0, 260, -25);
    this.head.add(face);
    this.head.add(hair);

    this.torso = createBox(150, 190, 40, shirtColor, 0, 100, 0);

    this.leftLowerArm = this.createLimb(20, 120, 30, skinColor, 0, -170, 0);
    this.leftArm = this.createLimb(30, 140, 40, skinColor, -100, 190, -10);
    this.leftArm.add(this.leftLowerArm);

    this.rightLowerArm = this.createLimb(20, 120, 30, skinColor, 0, -170, 0);
    this.rightArm = this.createLimb(30, 140, 40, skinColor, 100, 190, -10);
    this.rightArm.add(this.rightLowerArm);

    this.leftLowerLeg = this.createLimb(40, 200, 40, skinColor, 0, -200, 0);
    this.leftLeg = this.createLimb(50, 170, 50, shortsColor, -50, -10, 30);
    this.leftLeg.add(this.leftLowerLeg);

    this.rightLowerLeg = this.createLimb(40, 200, 40, skinColor, 0, -200, 0);
    this.rightLeg = this.createLimb(50, 170, 50, shortsColor, 50, -10, 30);
    this.rightLeg.add(this.rightLowerLeg);

    this.element.add(this.head);
    this.element.add(this.torso);
    this.element.add(this.leftArm);
    this.element.add(this.rightArm);
    this.element.add(this.leftLeg);
    this.element.add(this.rightLeg);
  }

  private createLimb(dx: number, dy: number, dz: number, color: number, x: number, y: number, z: number) {
    const limb = new THREE.Group();
    limb.position.set(x, y, z);
    const offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
    const limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
    limb.add(limbBox);
    return limb;
  }

  update() {
    const currentTime = Date.now() / 1000;

    if (!this.isJumping && !this.isSwitchingLeft && !this.isSwitchingRight && this.queuedActions.length > 0) {
      switch (this.queuedActions.shift()) {
        case "up":
          this.isJumping = true;
          this.jumpStartTime = Date.now() / 1000;
          break;
        case "left":
          if (this.currentLane !== -1) this.isSwitchingLeft = true;
          break;
        case "right":
          if (this.currentLane !== 1) this.isSwitchingRight = true;
          break;
      }
    }

    if (this.isJumping) {
      const jumpClock = currentTime - this.jumpStartTime;
      this.element.position.y = this.jumpHeight * Math.sin((1 / this.jumpDuration) * Math.PI * jumpClock) + sinusoid(2 * this.stepFreq, 0, 20, 0, this.jumpStartTime - this.runningStartTime);
      if (jumpClock > this.jumpDuration) {
        this.isJumping = false;
        this.runningStartTime += this.jumpDuration;
      }
    } else {
      const runningClock = currentTime - this.runningStartTime;
      this.element.position.y = sinusoid(2 * this.stepFreq, 0, 20, 0, runningClock);
      this.head.rotation.x = sinusoid(2 * this.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
      this.torso.rotation.x = sinusoid(2 * this.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
      this.leftArm.rotation.x = sinusoid(this.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
      this.rightArm.rotation.x = sinusoid(this.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
      this.leftLowerArm.rotation.x = sinusoid(this.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
      this.rightLowerArm.rotation.x = sinusoid(this.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
      this.leftLeg.rotation.x = sinusoid(this.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
      this.rightLeg.rotation.x = sinusoid(this.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
      this.leftLowerLeg.rotation.x = sinusoid(this.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
      this.rightLowerLeg.rotation.x = sinusoid(this.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

      if (this.isSwitchingLeft) {
        this.element.position.x -= 200;
        const offset = this.currentLane * 800 - this.element.position.x;
        if (offset > 800) {
          this.currentLane -= 1;
          this.element.position.x = this.currentLane * 800;
          this.isSwitchingLeft = false;
        }
      }
      if (this.isSwitchingRight) {
        this.element.position.x += 200;
        const offset = this.element.position.x - this.currentLane * 800;
        if (offset > 800) {
          this.currentLane += 1;
          this.element.position.x = this.currentLane * 800;
          this.isSwitchingRight = false;
        }
      }
    }
  }

  jump() {
    this.queuedActions.push("up");
  }
  left() {
    this.queuedActions.push("left");
  }
  right() {
    this.queuedActions.push("right");
  }

  onPause() {
    this.pauseStartTime = Date.now() / 1000;
  }
  onUnpause() {
    const currentTime = Date.now() / 1000;
    const pauseDuration = currentTime - this.pauseStartTime;
    this.runningStartTime += pauseDuration;
    if (this.isJumping) {
      this.jumpStartTime += pauseDuration;
    }
  }
}

export class BoxyRunScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private character: Character;
  private trees: Tree[] = [];
  private score = 0;
  private isAlive = true;
  private paused = false;
  private difficulty = 0;
  private treePresenceProb = 0.2;
  private maxTreeSize = 0.5;
  private fogDistance = 40000;

  private onScoreUpdate: (s: number) => void;
  private onGameOver: (s: number) => void;

  constructor(container: HTMLDivElement, callbacks: { onScoreUpdate: (s: number) => void; onGameOver: (s: number) => void }) {
    this.onScoreUpdate = callbacks.onScoreUpdate;
    this.onGameOver = callbacks.onGameOver;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor(0x0d0a05, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x84542d, 1, this.fogDistance);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 120000);
    this.camera.position.set(0, 1500, -2000);
    this.camera.lookAt(new THREE.Vector3(0, 600, -5000));

    const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    this.scene.add(light);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(1000, 2000, 0);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.character = new Character();
    this.scene.add(this.character.element);

    const ground = createBox(3000, 20, 120000, 0x1a1208, 0, -400, -60000);
    this.scene.add(ground);

    for (let i = 10; i < 40; i++) {
      this.createRowOfTrees(i * -3000);
    }

    this.startLoop();
  }

  private createRowOfTrees(position: number) {
    let treesInRow = 0;
    for (let lane = -1; lane <= 1; lane++) {
      // Prevent a "wall" of 3 trees (make sure at least one lane is open)
      if (treesInRow >= 2) break;

      if (Math.random() < this.treePresenceProb) {
        const scale = 0.5 + (this.maxTreeSize - 0.5) * Math.random();
        const tree = new Tree(lane * 800, -400, position, scale);
        this.trees.push(tree);
        this.scene.add(tree.mesh);
        treesInRow++;
      }
    }
  }

  private startLoop() {
    const loop = () => {
      if (!this.isAlive || this.paused) {
        requestAnimationFrame(loop);
        return;
      }

      this.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  private update() {
    if (this.trees.length > 0 && this.trees[this.trees.length - 1].mesh.position.z % 3000 === 0) {
      this.difficulty += 1;
      const levelLength = 30;
      if (this.difficulty % levelLength === 0) {
        const level = this.difficulty / levelLength;
        if (level === 1) this.treePresenceProb = 0.35;
        else if (level === 2) this.maxTreeSize = 0.85;
        else if (level === 3) this.treePresenceProb = 0.5;
        else if (level === 4) this.maxTreeSize = 1.1;
      }
      this.createRowOfTrees(-120000);
      if (this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.far = this.fogDistance;
      }
    }

    this.trees.forEach((tree) => {
      tree.mesh.position.z += 100;
    });

    for (let i = this.trees.length - 1; i >= 0; i--) {
      if (this.trees[i].mesh.position.z >= 0) {
        this.scene.remove(this.trees[i].mesh);
        this.trees.splice(i, 1);
      }
    }

    this.character.update();

    if (this.collisionsDetected()) {
      this.isAlive = false;
      this.onGameOver(this.score);
    }

    this.score += 10;
    this.onScoreUpdate(this.score);
  }

  private collisionsDetected() {
    const charPos = this.character.element.position;
    const charMinX = charPos.x - 115;
    const charMaxX = charPos.x + 115;
    const charMinY = charPos.y - 310;
    const charMaxY = charPos.y + 320;
    const charMinZ = charPos.z - 40;
    const charMaxZ = charPos.z + 40;

    for (const tree of this.trees) {
      if (tree.collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ)) {
        return true;
      }
    }
    return false;
  }

  public handleInput(action: string) {
    if (!this.isAlive || this.paused) return;
    if (action === "up") this.character.jump();
    if (action === "left") this.character.left();
    if (action === "right") this.character.right();
  }

  public resize(width: number, height: number) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public destroy() {
    this.paused = true;
    this.renderer.dispose();
  }
}

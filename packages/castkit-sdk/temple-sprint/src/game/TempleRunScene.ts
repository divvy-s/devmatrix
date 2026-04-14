import * as Phaser from "phaser";

// ── Canvas dimensions ────────────────────────────────────────────
const VIEW_W = 800;
const VIEW_H = 620;

// ── 3-D perspective constants ────────────────────────────────────
const FOV = 860;
const VIEWPORT_X = VIEW_W / 2;       // 400
const VIEWPORT_Y = 158;               // horizon line
const CAMERA_HEIGHT = 270;
const PLAYER_Z = 150;
const MAX_DRAW_Z = 4200;

// ── Lane geometry ────────────────────────────────────────────────
const LANE_WIDTH = 138;
const ROAD_HALF_WIDTH = 272;

let roadCurve = 0;
let cameraOffsetX = 0;

function projectPoint(x: number, y: number, z: number) {
  const scale = Math.max(0.01, FOV / (FOV + Math.max(1, z)));
  const curveOffset = roadCurve * z * z * 0.000017;
  return {
    x: VIEWPORT_X + cameraOffsetX + (x + curveOffset) * scale,
    y: VIEWPORT_Y + (y + CAMERA_HEIGHT) * scale,
    scale,
  };
}

/** Strip the extra `scale` field so Phaser.Graphics.fillPoints gets Vector2Like[] */
function toVec(p: { x: number; y: number; scale: number }) {
  return { x: p.x, y: p.y };
}

type ObstacleType = "coin" | "blockLow" | "blockTall" | "gap" | "pillar" | "torchPost";

type WorldObject = {
  x: number;
  y: number;
  z: number;
  lane?: number;
  type: ObstacleType;
  sprite: Phaser.GameObjects.Container;
  active: boolean;
  pulseOffset?: number;
};

export class TempleRunScene extends Phaser.Scene {
  private distance = 0;
  private speed = 920;
  private score = 0;
  private coinsCollected = 0;
  private isAlive = true;

  private laneTarget = 0;
  private playerX = 0;
  private playerY = 0;
  private playerVelY = 0;
  private prevPlayerX = 0;

  private isJumping = false;
  private isSliding = false;

  private targetCurve = 0;
  private lastCurveDistance = 0;

  private skyGraphics!: Phaser.GameObjects.Graphics;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private roadGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;

  private playerContainer!: Phaser.GameObjects.Container;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerBody!: Phaser.GameObjects.Container;
  private playerHead!: Phaser.GameObjects.Ellipse;
  private playerLegL!: Phaser.GameObjects.Ellipse;
  private playerLegR!: Phaser.GameObjects.Ellipse;
  private playerArmL!: Phaser.GameObjects.Ellipse;
  private playerArmR!: Phaser.GameObjects.Ellipse;

  private worldObjects: WorldObject[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private swipeStartX = 0;
  private swipeStartY = 0;

  // In-scene HUD text (hidden — React HUDOverlay handles display)
  private onScoreUpdate!: (s: number) => void;
  private onGameOver!: (s: number) => void;

  constructor() {
    super({ key: "TempleRunScene" });
  }

  init(data: { onScoreUpdate: (s: number) => void; onGameOver: (s: number) => void }) {
    this.onScoreUpdate = data.onScoreUpdate;
    this.onGameOver = data.onGameOver;
  }

  create() {
    this.resetState();

    // Stone-dark background
    this.cameras.main.setBackgroundColor("#100C06");

    this.skyGraphics = this.add.graphics().setDepth(-120000);
    this.worldGraphics = this.add.graphics().setDepth(-100000);
    this.roadGraphics = this.add.graphics().setDepth(-90000);
    this.fxGraphics = this.add.graphics().setDepth(900000);

    this.drawVignetteOverlay();
    this.buildPlayer();
    this.setupInput();

    // Pre-spawn scenery
    for (let i = 0; i < 24; i++) {
      this.spawnScenery(PLAYER_Z + 480 + i * 200);
    }

    // Spawn wave timer
    this.time.addEvent({
      delay: 490,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
    });
  }

  private resetState() {
    this.distance = 0;
    this.speed = 920;
    this.score = 0;
    this.coinsCollected = 0;
    this.isAlive = true;
    this.laneTarget = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVelY = 0;
    this.prevPlayerX = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.targetCurve = 0;
    this.lastCurveDistance = 0;
    roadCurve = 0;
    cameraOffsetX = 0;

    for (const obj of this.worldObjects) obj.sprite.destroy();
    this.worldObjects = [];
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.swipeStartX = p.x;
      this.swipeStartY = p.y;
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const dx = p.x - this.swipeStartX;
      const dy = p.y - this.swipeStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 28) this.handleDirectionInput(1);
        if (dx < -28) this.handleDirectionInput(-1);
      } else {
        if (dy < -32) this.jump();
        if (dy > 32) this.slide();
      }
    });
  }

  private handleDirectionInput(dir: number) {
    if (!this.isAlive) return;
    this.laneTarget = Phaser.Math.Clamp(this.laneTarget + dir, -1, 1);
  }

  private jump() {
    if (!this.isAlive || this.isJumping || this.isSliding) return;
    this.isJumping = true;
    this.playerVelY = 640;
    this.tweens.add({
      targets: this.playerContainer,
      scaleY: this.playerContainer.scaleY * 1.08,
      duration: 110,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  private slide() {
    if (!this.isAlive || this.isJumping || this.isSliding) return;
    this.isSliding = true;
    this.time.delayedCall(600, () => { this.isSliding = false; });
  }

  private spawnWave() {
    if (!this.isAlive) return;
    const spawnZ = MAX_DRAW_Z;
    this.spawnScenery(spawnZ + Phaser.Math.Between(-80, 100));

    const obstacleLane = Phaser.Math.Between(-1, 1);
    const roll = Math.random();
    let obstacleType: ObstacleType = "blockTall";
    if (roll < 0.34) obstacleType = "blockLow";
    else if (roll < 0.57) obstacleType = "gap";

    this.createWorldObject(obstacleType, obstacleLane * LANE_WIDTH, spawnZ, obstacleLane);

    let coinLane = Phaser.Math.Between(-1, 1);
    if (coinLane === obstacleLane && (obstacleType === "blockTall" || obstacleType === "gap")) {
      coinLane = coinLane === 0 ? 1 : 0;
    }

    const coinHeight = obstacleType === "blockLow" ? 120 : 0;
    for (let i = 0; i < 5; i++) {
      this.createWorldObject("coin", coinLane * LANE_WIDTH, spawnZ + i * 140, coinLane, coinHeight);
    }
  }

  private spawnScenery(z: number) {
    const sideOffset = ROAD_HALF_WIDTH + 90;
    if (Math.random() > 0.25) {
      this.createWorldObject("pillar", -(sideOffset + Math.random() * 50), z + Phaser.Math.Between(-40, 40));
    }
    if (Math.random() > 0.25) {
      this.createWorldObject("pillar", sideOffset + Math.random() * 50, z + Phaser.Math.Between(-40, 40));
    }
    // Occasional torch post
    if (Math.random() > 0.55) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.createWorldObject("torchPost", side * (ROAD_HALF_WIDTH - 20), z + Phaser.Math.Between(-60, 60));
    }
  }

  private createWorldObject(type: ObstacleType, x: number, z: number, lane?: number, y = 0) {
    const sprite = this.add.container(0, 0).setDepth(-z);

    if (type === "coin") {
      // Amber jewel coin
      const glow = this.add.circle(0, -32, 22, 0xd97706, 0.22);
      const outer = this.add.ellipse(0, -32, 36, 40, 0x92400e);
      const inner = this.add.ellipse(0, -32, 26, 30, 0xd97706);
      const center = this.add.ellipse(0, -32, 10, 12, 0xfef3c7);
      const gleam = this.add.circle(-5, -38, 4, 0xffffff, 0.9);
      sprite.add([glow, outer, inner, center, gleam]);

      this.tweens.add({
        targets: sprite,
        y: -14,
        duration: 380,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    if (type === "pillar") {
      // Stone temple column
      const base = this.add.rectangle(0, -20, 96, 40, 0x2a1f0e);
      const shaft = this.add.rectangle(0, -220, 80, 400, 0x3d2e14);
      shaft.setStrokeStyle(2, 0x1a1208);
      const capital = this.add.rectangle(0, -415, 100, 22, 0x4a3820);
      // Stone groove lines
      const groove1 = this.add.rectangle(0, -160, 76, 6, 0x241809, 0.7);
      const groove2 = this.add.rectangle(0, -260, 76, 6, 0x241809, 0.7);
      // Creeping vine
      const vine = this.add.triangle(-10, -80, 0, 0, 32, 44, -26, 48, 0x166534, 0.85);
      const vine2 = this.add.triangle(8, -180, 0, 0, 28, 38, -20, 42, 0x166534, 0.65);
      sprite.add([base, shaft, capital, groove1, groove2, vine, vine2]);
    }

    if (type === "torchPost") {
      // Torch pillar with flame
      const post = this.add.rectangle(0, -100, 14, 200, 0x3d2e14);
      const cup = this.add.rectangle(0, -195, 28, 12, 0x4a3820);
      // Flame layers
      const flameO = this.add.ellipse(0, -218, 22, 30, 0xc2410c, 0.85);
      const flameM = this.add.ellipse(0, -224, 14, 20, 0xd97706, 0.9);
      const flameI = this.add.ellipse(0, -228, 8, 12, 0xfef3c7, 0.95);
      // Glow
      const glowC = this.add.circle(0, -218, 28, 0xd97706, 0.15);
      sprite.add([post, cup, glowC, flameO, flameM, flameI]);

      // Flicker tween
      this.tweens.add({
        targets: [flameO, flameM, flameI, glowC],
        scaleX: 0.85,
        scaleY: 1.1,
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    if (type === "blockLow") {
      // Low log / stone beam obstacle
      const shadow = this.add.ellipse(0, -65, LANE_WIDTH * 0.92, 26, 0x000000, 0.3);
      const leftPost = this.add.rectangle(-LANE_WIDTH * 0.38, -76, 22, 148, 0x3d2e14);
      leftPost.setStrokeStyle(2, 0x241809);
      const rightPost = this.add.rectangle(LANE_WIDTH * 0.38, -76, 22, 148, 0x3d2e14);
      rightPost.setStrokeStyle(2, 0x241809);
      const beam = this.add.rectangle(0, -146, LANE_WIDTH * 0.96, 28, 0x92400e);
      beam.setStrokeStyle(3, 0xd97706, 0.7);
      // Amber warning stripe
      const stripe = this.add.rectangle(0, -146, LANE_WIDTH * 0.9, 8, 0xd97706, 0.4);
      sprite.add([shadow, leftPost, rightPost, beam, stripe]);
    }

    if (type === "blockTall") {
      // Temple wall block
      const shadow = this.add.ellipse(0, -32, LANE_WIDTH * 0.86, 32, 0x000000, 0.28);
      const wall = this.add.rectangle(0, -68, LANE_WIDTH * 0.92, 136, 0x4a3820);
      wall.setStrokeStyle(3, 0x241809);
      // Stone line details
      const line1 = this.add.rectangle(0, -104, LANE_WIDTH * 0.88, 7, 0x2a1f0e, 0.8);
      const line2 = this.add.rectangle(0, -68, LANE_WIDTH * 0.88, 7, 0x2a1f0e, 0.8);
      const line3 = this.add.rectangle(0, -32, LANE_WIDTH * 0.88, 7, 0x2a1f0e, 0.6);
      // Mossy top
      const moss = this.add.rectangle(0, -132, LANE_WIDTH * 0.88, 8, 0x166534, 0.45);
      sprite.add([shadow, wall, line1, line2, line3, moss]);
    }

    if (type === "gap") {
      // Chasm / pit
      const hole = this.add.rectangle(0, 22, LANE_WIDTH * 0.96, 240, 0x050302);
      // Amber-edged ledge
      const edge = this.add.rectangle(0, -95, LANE_WIDTH * 0.96, 14, 0xc2410c);
      edge.setStrokeStyle(2, 0xfef3c7, 0.7);
      // Warning chevrons
      const w1 = this.add.triangle(-LANE_WIDTH * 0.28, -95, 0, 0, 24, 0, 12, 14, 0x100c06);
      const w2 = this.add.triangle(LANE_WIDTH * 0.28, -95, 0, 0, 24, 0, 12, 14, 0x100c06);
      // Abyss glow
      const abyss = this.add.rectangle(0, 22, LANE_WIDTH * 0.9, 200, 0xc2410c, 0.05);
      sprite.add([hole, abyss, edge, w1, w2]);
    }

    this.worldObjects.push({ x, y, z, lane, type, sprite, active: true, pulseOffset: Math.random() * Math.PI * 2 });
  }

  private buildPlayer() {
    // Player Y position scaled for new VIEW_H (408/580 * 620 ≈ 436)
    this.playerContainer = this.add.container(VIEWPORT_X, 436).setDepth(120000);

    this.playerShadow = this.add.ellipse(0, 60, 78, 22, 0x000000, 0.5);

    // Temple runner: amber tunic + adventurer look
    this.playerLegL = this.add.ellipse(-13, 30, 18, 44, 0x8B4513);
    this.playerLegR = this.add.ellipse(13, 30, 18, 44, 0x8B4513);

    this.playerBody = this.add.container(0, 0);
    const torso = this.add.rectangle(0, -6, 48, 58, 0xD97706);   // amber tunic
    torso.setStrokeStyle(2, 0x92400e);
    const chestBand = this.add.rectangle(0, -14, 44, 14, 0xb45309, 0.7);
    const beltBuckle = this.add.rectangle(0, 18, 14, 10, 0xfef3c7, 0.8);
    this.playerBody.add([torso, chestBand, beltBuckle]);

    this.playerArmL = this.add.ellipse(-31, -8, 14, 42, 0xf2c4a8);
    this.playerArmR = this.add.ellipse(31, -8, 14, 42, 0xf2c4a8);

    this.playerHead = this.add.ellipse(0, -52, 34, 38, 0xf2c4a8);
    this.playerHead.setStrokeStyle(2, 0x1a2430);

    // Adventure hat / bandana
    const hat = this.add.rectangle(0, -66, 38, 10, 0x92400e);
    const brim = this.add.rectangle(0, -60, 50, 7, 0x78350f);
    const eyeL = this.add.circle(-7, -52, 2, 0x1a1208);
    const eyeR = this.add.circle(7, -52, 2, 0x1a1208);
    // Tiny amber earring
    const earring = this.add.circle(17, -46, 3, 0xd97706, 0.9);

    this.playerContainer.add([
      this.playerShadow,
      this.playerLegL, this.playerLegR,
      this.playerArmL, this.playerArmR,
      this.playerBody,
      this.playerHead, hat, brim,
      eyeL, eyeR, earring,
    ]);
  }

  private drawVignetteOverlay() {
    this.fxGraphics.clear();
    // Darkened top + bottom bars
    this.fxGraphics.fillStyle(0x000000, 0.18);
    this.fxGraphics.fillRect(0, 0, VIEW_W, 30);
    this.fxGraphics.fillRect(0, VIEW_H - 30, VIEW_W, 30);
    // Side vignette
    this.fxGraphics.fillStyle(0x000000, 0.14);
    this.fxGraphics.fillRect(0, 0, 28, VIEW_H);
    this.fxGraphics.fillRect(VIEW_W - 28, 0, 28, VIEW_H);
    // Amber horizon shimmer line
    this.fxGraphics.fillStyle(0xd97706, 0.06);
    this.fxGraphics.fillRect(0, 0, VIEW_W, 2);
  }

  private drawEnvironment() {
    this.skyGraphics.clear();
    this.worldGraphics.clear();
    this.roadGraphics.clear();

    // ── Sky: deep dusk amber → dark stone ────────────────────────
    // Top of sky
    this.skyGraphics.fillGradientStyle(0x0d0a05, 0x0d0a05, 0x2d1a06, 0x2d1a06, 1);
    this.skyGraphics.fillRect(0, 0, VIEW_W, VIEWPORT_Y + 8);

    // Amber horizon glow band
    this.skyGraphics.fillGradientStyle(0x7c2d12, 0x7c2d12, 0xc2410c, 0xc2410c, 0.55);
    this.skyGraphics.fillRect(0, VIEWPORT_Y - 20, VIEW_W, 28);

    // Amber "sun" orb (low on horizon)
    this.skyGraphics.fillStyle(0xfef3c7, 0.18);
    this.skyGraphics.fillCircle(VIEW_W * 0.48, VIEWPORT_Y - 10, 44);
    this.skyGraphics.fillStyle(0xd97706, 0.3);
    this.skyGraphics.fillCircle(VIEW_W * 0.48, VIEWPORT_Y - 10, 28);
    this.skyGraphics.fillStyle(0xfef3c7, 0.55);
    this.skyGraphics.fillCircle(VIEW_W * 0.48, VIEWPORT_Y - 10, 12);

    // Distant jungle silhouette mountains
    const mountainShift = roadCurve * 65;
    // Far mountains (dark)
    this.worldGraphics.fillStyle(0x1a1000, 0.95);
    this.worldGraphics.fillTriangle(-60 + mountainShift, VIEWPORT_Y + 10, 160 + mountainShift, 38, 380 + mountainShift, VIEWPORT_Y + 10);
    this.worldGraphics.fillTriangle(220 + mountainShift, VIEWPORT_Y + 10, 450 + mountainShift, 50, 700 + mountainShift, VIEWPORT_Y + 10);
    this.worldGraphics.fillTriangle(500 + mountainShift, VIEWPORT_Y + 10, 690 + mountainShift, 34, 880 + mountainShift, VIEWPORT_Y + 10);
    // Near tree-line silhouette
    this.worldGraphics.fillStyle(0x0d0a05, 0.98);
    for (let tx = -40; tx < VIEW_W + 60; tx += 38) {
      const th = 22 + Math.sin(tx * 0.08 + roadCurve * 2) * 10;
      this.worldGraphics.fillTriangle(
        tx + mountainShift * 0.4, VIEWPORT_Y + 12,
        tx + 19 + mountainShift * 0.4, VIEWPORT_Y + 12 - th,
        tx + 38 + mountainShift * 0.4, VIEWPORT_Y + 12
      );
    }

    // Ground plane (stone floor)
    this.worldGraphics.fillStyle(0x100c06, 1);
    this.worldGraphics.fillRect(0, VIEWPORT_Y + 6, VIEW_W, VIEW_H - VIEWPORT_Y + 4);

    // Horizon glow line
    this.worldGraphics.fillStyle(0xd97706, 0.08);
    this.worldGraphics.fillRect(0, VIEWPORT_Y - 2, VIEW_W, 16);

    // ── Road ─────────────────────────────────────────────────────
    const nearZ = 10;
    const farZ = MAX_DRAW_Z;

    const nearLeft = projectPoint(-ROAD_HALF_WIDTH, 0, nearZ);
    const nearRight = projectPoint(ROAD_HALF_WIDTH, 0, nearZ);
    const farLeft = projectPoint(-ROAD_HALF_WIDTH, 0, farZ);
    const farRight = projectPoint(ROAD_HALF_WIDTH, 0, farZ);

    // Main road surface – warm stone
    this.roadGraphics.fillStyle(0x2a1f0e, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.roadGraphics.fillPoints([toVec(farLeft), toVec(farRight), toVec(nearRight), toVec(nearLeft)] as any, true, true);

    // Inner road (slightly different stone tone — grooved path)
    const innerLeftNear = projectPoint(-ROAD_HALF_WIDTH * 0.88, 0, nearZ);
    const innerRightNear = projectPoint(ROAD_HALF_WIDTH * 0.88, 0, nearZ);
    const innerLeftFar = projectPoint(-ROAD_HALF_WIDTH * 0.88, 0, farZ);
    const innerRightFar = projectPoint(ROAD_HALF_WIDTH * 0.88, 0, farZ);
    this.roadGraphics.fillStyle(0x1e1509, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.roadGraphics.fillPoints([toVec(innerLeftFar), toVec(innerRightFar), toVec(innerRightNear), toVec(innerLeftNear)] as any, true, true);

    // Side drop-offs (dark chasms flanking the road)
    const shoulderDrop = 120;
    const leftDropNear = projectPoint(-ROAD_HALF_WIDTH, shoulderDrop, nearZ);
    const leftDropFar = projectPoint(-ROAD_HALF_WIDTH, shoulderDrop, farZ);
    const rightDropNear = projectPoint(ROAD_HALF_WIDTH, shoulderDrop, nearZ);
    const rightDropFar = projectPoint(ROAD_HALF_WIDTH, shoulderDrop, farZ);
    this.roadGraphics.fillStyle(0x080503, 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.roadGraphics.fillPoints([toVec(farLeft), toVec(nearLeft), toVec(leftDropNear), toVec(leftDropFar)] as any, true, true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.roadGraphics.fillPoints([toVec(farRight), toVec(nearRight), toVec(rightDropNear), toVec(rightDropFar)] as any, true, true);

    // ── Road tile / slab banding ──────────────────────────────────
    const tileStep = 180;
    const tileOffset = this.distance % tileStep;
    for (let z = farZ; z > 80; z -= tileStep) {
      const z1 = z - tileOffset;
      const z2 = z1 + tileStep * 0.52;
      if (z1 <= 22 || z2 >= farZ) continue;

      const p1 = projectPoint(-ROAD_HALF_WIDTH * 0.88, 0, z1);
      const p2 = projectPoint(ROAD_HALF_WIDTH * 0.88, 0, z1);
      const p3 = projectPoint(ROAD_HALF_WIDTH * 0.88, 0, z2);
      const p4 = projectPoint(-ROAD_HALF_WIDTH * 0.88, 0, z2);
      this.roadGraphics.fillStyle(0x2a1f0e, 0.7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.roadGraphics.fillPoints([toVec(p1), toVec(p2), toVec(p3), toVec(p4)] as any, true, true);
    }

    // ── Lane divider lines (amber) ────────────────────────────────
    for (const laneX of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) {
      const l1 = projectPoint(laneX, 0, nearZ);
      const l2 = projectPoint(laneX, 0, farZ);
      this.roadGraphics.lineStyle(2, 0xd97706, 0.28);
      this.roadGraphics.strokeLineShape(new Phaser.Geom.Line(l1.x, l1.y, l2.x, l2.y));
    }

    // Road edge lines (brighter amber)
    for (const laneX of [-ROAD_HALF_WIDTH * 0.88, ROAD_HALF_WIDTH * 0.88]) {
      const e1 = projectPoint(laneX, 0, nearZ);
      const e2 = projectPoint(laneX, 0, farZ);
      this.roadGraphics.lineStyle(3, 0xd97706, 0.55);
      this.roadGraphics.strokeLineShape(new Phaser.Geom.Line(e1.x, e1.y, e2.x, e2.y));
    }

    // ── Center dashes ─────────────────────────────────────────────
    const dashStep = 130;
    const dashOffset = this.distance % dashStep;
    for (let z = farZ; z > 100; z -= dashStep) {
      const z1 = z - dashOffset;
      const z2 = z1 + dashStep * 0.36;
      if (z1 <= 30 || z2 >= farZ) continue;
      const d1 = projectPoint(0, 0, z1);
      const d2 = projectPoint(0, 0, z2);
      this.roadGraphics.lineStyle(3, 0xfef3c7, 0.65);
      this.roadGraphics.strokeLineShape(new Phaser.Geom.Line(d1.x, d1.y, d2.x, d2.y));
    }
  }

  update(time: number, delta: number) {
    if (!this.isAlive) return;

    const dt = Math.min(delta / 1000, 0.05);

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.A)) this.handleDirectionInput(-1);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.D)) this.handleDirectionInput(1);
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.W)) this.jump();
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.S)) this.slide();

    // Curve updates
    if (this.distance - this.lastCurveDistance > 960) {
      this.lastCurveDistance = this.distance;
      this.targetCurve = Phaser.Math.FloatBetween(-0.92, 0.92);
      if (Math.random() > 0.54) this.targetCurve = 0;
    }
    roadCurve += (this.targetCurve - roadCurve) * (1.8 * dt);

    // Player X lerp
    const desiredX = this.laneTarget * LANE_WIDTH;
    this.playerX = Phaser.Math.Linear(this.playerX, desiredX, 1 - Math.exp(-16 * dt));

    // Camera offset
    const laneCameraOffset = -this.playerX * 0.16;
    const curveCameraOffset = -roadCurve * 118;
    cameraOffsetX = Phaser.Math.Linear(cameraOffsetX, laneCameraOffset + curveCameraOffset, 1 - Math.exp(-7.5 * dt));

    // Speed ramp
    this.speed = Math.min(2100, this.speed + 15 * dt);
    this.distance += this.speed * dt;

    // Jump physics
    if (this.isJumping) {
      this.playerY += this.playerVelY * dt;
      this.playerVelY -= 2000 * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVelY = 0;
        this.isJumping = false;
      }
    }

    this.drawEnvironment();
    this.animatePlayer(time, dt);

    const projectedPlayer = projectPoint(this.playerX, -this.playerY, PLAYER_Z);
    const bob = Math.sin(time * 0.013) * 1.8;
    this.playerContainer.setPosition(projectedPlayer.x, projectedPlayer.y + bob);
    this.playerContainer.setScale(projectedPlayer.scale * 3.0);

    const laneVelocity = this.playerX - this.prevPlayerX;
    this.prevPlayerX = this.playerX;
    const targetRot = Phaser.Math.Clamp((-laneVelocity * 0.018) + roadCurve * 0.03, -0.22, 0.22);
    this.playerContainer.rotation = Phaser.Math.Linear(this.playerContainer.rotation, targetRot, 1 - Math.exp(-11 * dt));

    this.playerShadow.y = 60 + this.playerY * projectedPlayer.scale * 2.4;
    this.playerShadow.alpha = this.isJumping ? 0.3 : 0.5;

    this.updateWorldObjects(time, dt);

    this.score = Math.max(this.score, Math.floor(this.distance * 0.06) + this.coinsCollected * 26);
    this.onScoreUpdate(this.score);
  }

  private updateWorldObjects(time: number, dt: number) {
    for (let i = this.worldObjects.length - 1; i >= 0; i--) {
      const obj = this.worldObjects[i];
      if (!obj.active) continue;

      obj.z -= this.speed * dt;

      if (obj.z < -140) {
        obj.active = false;
        obj.sprite.destroy();
        this.worldObjects.splice(i, 1);
        continue;
      }

      const projected = projectPoint(obj.x, obj.y, obj.z);
      obj.sprite.setPosition(projected.x, projected.y);
      obj.sprite.setScale(projected.scale * 3.0);
      obj.sprite.setDepth(-obj.z);
      obj.sprite.alpha = Phaser.Math.Clamp(projected.scale * 2.8, 0, 1);

      if (obj.type === "coin") {
        const pulse = Math.sin(time * 0.011 + (obj.pulseOffset ?? 0)) * 0.07;
        obj.sprite.scaleX *= 1 + pulse;
        obj.sprite.scaleY *= 1 + pulse;
        obj.sprite.rotation = Math.sin(time * 0.004 + (obj.pulseOffset ?? 0)) * 0.1;
      }

      if (obj.type === "torchPost") {
        // Torch glow flicker reflected on ground
        obj.sprite.alpha *= (0.88 + Math.sin(time * 0.018 + (obj.pulseOffset ?? 0)) * 0.12);
      }

      const inCollisionDepth = obj.z > PLAYER_Z - 78 && obj.z < PLAYER_Z + 78;
      if (!inCollisionDepth) continue;

      const laneDistance = Math.abs(this.playerX - obj.x);
      const inLane = laneDistance < LANE_WIDTH * 0.42;
      if (!inLane) continue;

      if (obj.type === "coin") {
        this.coinsCollected += 1;
        this.tweens.add({
          targets: obj.sprite,
          y: obj.sprite.y - 160,
          scaleX: obj.sprite.scaleX * 2.4,
          scaleY: obj.sprite.scaleY * 2.4,
          alpha: 0,
          duration: 180,
          onComplete: () => obj.sprite.destroy(),
        });
        obj.active = false;
        continue;
      }

      if (obj.type === "pillar" || obj.type === "torchPost") continue;

      if (obj.type === "gap" && !this.isJumping) { this.triggerDeath(); return; }
      if (obj.type === "blockTall" && (!this.isJumping || this.playerY < 90)) { this.triggerDeath(); return; }
      if (obj.type === "blockLow" && !this.isSliding) { this.triggerDeath(); return; }
    }
  }

  private animatePlayer(time: number, dt: number) {
    if (!this.isAlive) return;

    if (this.isSliding) {
      this.playerBody.scaleY = 0.52;
      this.playerHead.y = -26;
      this.playerLegL.y = 35;
      this.playerLegR.y = 35;
      this.playerLegL.rotation = -1.2;
      this.playerLegR.rotation = -1.2;
      this.playerArmL.rotation = Math.PI / 2;
      this.playerArmR.rotation = -Math.PI / 2;
      return;
    }

    this.playerBody.scaleY += (1 - this.playerBody.scaleY) * (14 * dt);
    this.playerHead.y += (-52 - this.playerHead.y) * (14 * dt);
    this.playerLegL.rotation += (0 - this.playerLegL.rotation) * (14 * dt);
    this.playerLegR.rotation += (0 - this.playerLegR.rotation) * (14 * dt);

    if (this.isJumping) {
      this.playerLegL.y = 14;
      this.playerLegR.y = 22;
      this.playerArmL.rotation = -0.72;
      this.playerArmR.rotation = 0.72;
      this.playerArmL.y = -26;
      this.playerArmR.y = -18;
      return;
    }

    const freq = 0.022 + this.speed / 44000;
    const t = time * freq;
    this.playerLegL.y = 30 + Math.sin(t) * 14;
    this.playerLegR.y = 30 + Math.sin(t + Math.PI) * 14;
    this.playerArmL.y = -8 + Math.sin(t + Math.PI) * 10;
    this.playerArmR.y = -8 + Math.sin(t) * 10;
    this.playerArmL.rotation = Math.sin(t + Math.PI) * 0.5;
    this.playerArmR.rotation = Math.sin(t) * 0.5;
  }

  private triggerDeath() {
    if (!this.isAlive) return;
    this.isAlive = false;

    this.cameras.main.shake(240, 0.02);

    // Amber flash instead of red
    const flash = this.add.rectangle(VIEWPORT_X, VIEW_H / 2, VIEW_W, VIEW_H, 0xd97706, 0.35).setDepth(999999);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Player spin-out
    this.tweens.add({
      targets: this.playerContainer,
      y: this.playerContainer.y - 230,
      scaleX: 0.25,
      scaleY: 0.25,
      angle: 400,
      duration: 640,
      ease: "Cubic.easeIn",
      onComplete: () => this.onGameOver(this.score),
    });
  }

  restartGame() {
    this.scene.restart();
  }
}

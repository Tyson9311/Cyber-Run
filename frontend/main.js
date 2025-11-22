// Game context from Telegram WebApp
const { playerId, playerName, avatarUrl, groupId } = window.gameContext || {
  playerId: "guest",
  playerName: "Player",
  avatarUrl: null,
  groupId: "default"
};

// DOM controls
document.getElementById("startBtn").addEventListener("click", () => startGame());
document.getElementById("leaderboardBtn").addEventListener("click", () => showLeaderboard());

let gameInstance;

// Phaser config
const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  parent: "game",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

// Game state vars
let player, cursors;
let score = 0, scoreText, comboText;
let particles, obstaclesGroup, coresGroup, powerupsGroup;
let speedBoostActive = false, shieldActive = false;
let spawnEvent, isGameOver = false;

// Combo/stats
let comboCount = 0;
let comboTimer;
let maxCombo = 0;
let powerupsCollected = 0;
let bossActive = false;
let bossSurvived = 0;

// HUD extras
let boostIcon, shieldIcon, usernameText, avatarImage;

// Health bar
let health = 100;
let healthBar;

function startGame() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("leaderboard").style.display = "none";
  document.getElementById("game").style.display = "block";
  if (!gameInstance) gameInstance = new Phaser.Game(config);
}

export function showLeaderboard() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("game").style.display = "none";
  document.getElementById("leaderboard").style.display = "block";
  // leaderboard.js will render on load
}

function preload() {
  this.load.image("bg", "./assets/bg.png");
  this.load.image("runner", "./assets/runner.png");
  this.load.image("core", "./assets/core.png");
  this.load.image("obstacle", "./assets/obstacle.png");
  this.load.image("spark", "./assets/spark.png");
  this.load.image("boost", "./assets/boost.png");
  this.load.image("shield", "./assets/shield.png");
}

function create() {
  this.add.image(200, 300, "bg");

  player = this.physics.add.sprite(200, 520, "runner").setCollideWorldBounds(true);
  cursors = this.input.keyboard.createCursorKeys();

  // Neon Score Text
  scoreText = this.add.text(10, 10, "Score: 0", {
    fontSize: "22px",
    fill: "#0ff",
    stroke: "#f0f",
    strokeThickness: 2
  }).setShadow(2, 2, "#00f", 10, true, true);

  // Combo Text
  comboText = this.add.text(10, 40, "", {
    fontSize: "18px",
    fill: "#ff0",
    stroke: "#0ff",
    strokeThickness: 2
  }).setShadow(2, 2, "#f0f", 10, true, true);

  // Username HUD
  usernameText = this.add.text(10, 100, `👤 ${playerName}`, {
    fontSize: "16px",
    fill: "#9af3ff"
  });

  // Avatar HUD (load from URL -> HTMLImage -> texture)
  if (avatarUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.textures.addImage("avatarTex", img);
      avatarImage = this.add.image(370, 100, "avatarTex").setScale(0.25);
    };
    img.src = avatarUrl;
  }

  // Footer branding inside canvas (HTML footer exists too)
  this.add.text(280, 580, "Made by Darian", {
    fontSize: "14px",
    fill: "#0ff"
  }).setShadow(1, 1, "#f0f", 5, true, true);

  // Power-up icons
  boostIcon = this.add.image(350, 30, "boost").setScale(0.5).setVisible(false);
  shieldIcon = this.add.image(380, 30, "shield").setScale(0.5).setVisible(false);

  particles = this.add.particles("spark");

  obstaclesGroup = this.physics.add.group();
  coresGroup = this.physics.add.group();
  powerupsGroup = this.physics.add.group();

  // Collisions/overlaps
  this.physics.add.collider(player, obstaclesGroup, hitObstacle, null, this);
  this.physics.add.overlap(player, coresGroup, collectCore, null, this);
  this.physics.add.overlap(player, powerupsGroup, collectPowerup, null, this);

  // Spawn loop
  spawnEvent = this.time.addEvent({
    delay: 2000,
    callback: () => spawnObjects(this),
    loop: true
  });

  // Health bar
  healthBar = this.add.graphics();
  updateHealthBar(this);
}

function update() {
  if (isGameOver) return;

  // Player horizontal control
  const speed = speedBoostActive ? 300 : 160;
  if (cursors.left.isDown) player.setVelocityX(-speed);
  else if (cursors.right.isDown) player.setVelocityX(speed);
  else player.setVelocityX(0);

  // Cleanup off-screen
  obstaclesGroup.children.iterate(obj => { if (obj.y > 650) obj.destroy(); });
  coresGroup.children.iterate(obj => { if (obj.y > 650) obj.destroy(); });
  powerupsGroup.children.iterate(obj => { if (obj.y > 650) obj.destroy(); });

  // Dynamic difficulty
  adjustDifficulty(this);

  // Boss trigger (every 500 score milestone)
  if (!bossActive && score > 0 && score % 500 === 0) {
    startBossEvent(this);
  }
}

// Spawner
function spawnObjects(scene) {
  const x = Phaser.Math.Between(50, 350);
  const type = Phaser.Math.Between(1, 5);
  const fallSpeed = 100 + Math.floor(score / 50) * 20;

  if (type <= 2) {
    const obstacle = obstaclesGroup.create(x, -50, "obstacle");
    obstacle.setVelocityY(fallSpeed);
  } else if (type <= 4) {
    const core = coresGroup.create(x, -50, "core");
    core.setVelocityY(fallSpeed + 20);
  } else {
    const powerType = Phaser.Math.Between(0, 1) ? "boost" : "shield";
    const powerup = powerupsGroup.create(x, -50, powerType);
    powerup.setVelocityY(fallSpeed + 20);
  }
}

// Dynamic difficulty (spawn delay scales)
function adjustDifficulty(scene) {
  const newDelay = Math.max(500, 2000 - Math.floor(score / 100) * 200);
  if (spawnEvent.delay !== newDelay) {
    spawnEvent.remove(false);
    spawnEvent = scene.time.addEvent({
      delay: newDelay,
      callback: () => spawnObjects(scene),
      loop: true
    });
  }
}

// Combo + core collection
function collectCore(playerObj, core) {
  core.disableBody(true, true);

  comboCount++;
  maxCombo = Math.max(maxCombo, comboCount);

  if (comboTimer) clearTimeout(comboTimer);
  comboTimer = setTimeout(() => {
    comboCount = 0;
    comboText.setText("");
  }, 3000);

  const multiplier = 1 + (comboCount * 0.2);
  const gained = Math.floor(10 * multiplier);
  score += gained;

  scoreText.setText("Score: " + score);
  comboText.setText("Combo x" + multiplier.toFixed(1));

  particles.createEmitter({
    x: core.x,
    y: core.y,
    speed: { min: -200, max: 200 },
    angle: { min: 0, max: 360 },
    lifespan: 500,
    quantity: 20,
    scale: { start: 0.5, end: 0 },
    tint: [0x00ffff, 0xff00ff, 0x00ff00],
    blendMode: "ADD"
  });

  submitScore(score).catch(() => {});
}

// Obstacle hit / health bar
function hitObstacle(playerObj, obstacle) {
  if (shieldActive) {
    shieldActive = false;
    player.clearTint();
    obstacle.disableBody(true, true);
    shieldIcon.setVisible(false);
  } else {
    health -= 20;
    updateHealthBar(this.scene);
    obstacle.disableBody(true, true);

    if (health <= 0) {
      player.setTint(0xff0000);
      player.setVelocity(0);
      isGameOver = true;
      showGameOver(this.scene);
    }
  }
}

function updateHealthBar(scene) {
  healthBar.clear();

  let color = 0x00ff00; // green
  if (health <= 60) color = 0xffff00; // yellow
  if (health <= 30) color = 0xff0000; // red

  healthBar.fillStyle(color, 1);
  healthBar.fillRect(10, 70, Math.max(0, health) * 2, 15); // width proportional to health
  healthBar.lineStyle(2, 0x0ff, 1);
  healthBar.strokeRect(10, 70, 200, 15);
}

// Powerups
function collectPowerup(playerObj, powerup) {
  powerupsCollected++;
  if (powerup.texture.key === "boost") {
    speedBoostActive = true;
    boostIcon.setVisible(true);
    setTimeout(() => { speedBoostActive = false; boostIcon.setVisible(false); }, 5000);
  } else if (powerup.texture.key === "shield") {
    shieldActive = true;
    shieldIcon.setVisible(true);
    player.setTint(0x00ff00);
    setTimeout(() => { shieldActive = false; shieldIcon.setVisible(false); player.clearTint(); }, 8000);
  }
  powerup.disableBody(true, true);
}

// Boss events
function startBossEvent(scene) {
  bossActive = true;

  const bossType = Phaser.Math.Between(1, 3);
  if (bossType === 1) meteorShower(scene);
  else if (bossType === 2) laserWall(scene);
  else droneAttack(scene);

  scene.time.delayedCall(15000, () => {
    bossActive = false;
    bossSurvived++;
    score += 100;
    scoreText.setText("Score: " + score);

    particles.createEmitter({
      x: player.x,
      y: player.y,
      speed: { min: -300, max: 300 },
      angle: { min: 0, max: 360 },
      lifespan: 800,
      quantity: 50,
      scale: { start: 1, end: 0 },
      tint: [0x00ffff, 0xff00ff, 0xffff00],
      blendMode: "ADD"
    });
  });
}

function meteorShower(scene) {
  const event = scene.time.addEvent({
    delay: 400,
    callback: () => {
      const x = Phaser.Math.Between(50, 350);
      const meteor = obstaclesGroup.create(x, -50, "obstacle");
      meteor.setVelocityY(250);
      meteor.setScale(1.5);
    },
    repeat: 20
  });
}

function laserWall(scene) {
  for (let i = 0; i < 3; i++) {
    const laser = obstaclesGroup.create(200, -120 * i, "obstacle");
    laser.setVelocityY(180);
    laser.setScale(2, 0.25); // horizontal wall
  }
}

function droneAttack(scene) {
  const event = scene.time.addEvent({
    delay: 500,
    callback: () => {
      const x = Phaser.Math.Between(50, 350);
      const drone = obstaclesGroup.create(x, -50, "obstacle");
      drone.setVelocityY(200);
      drone.setVelocityX(Phaser.Math.Between(-120, 120)); // zig-zag
      drone.setScale(1.2);
    },
    repeat: 15
  });
}

// Game Over screen with stats chart
function showGameOver(scene) {
  scene.add.rectangle(200, 300, 360, 420, 0x000000, 0.8);
  scene.add.text(120, 130, "GAME OVER", {
    fontSize: "28px",
    fill: "#ff0",
    stroke: "#f0f",
    strokeThickness: 3
  });

  // Stats chart
  const chartY = 180;
  scene.add.text(100, chartY + 0,   `Final Score: ${score}`,           { fontSize: "20px", fill: "#0ff" });
  scene.add.text(100, chartY + 30,  `Max Combo: ${maxCombo}`,          { fontSize: "20px", fill: "#0ff" });
  scene.add.text(100, chartY + 60,  `Power-ups: ${powerupsCollected}`, { fontSize: "20px", fill: "#0ff" });
  scene.add.text(100, chartY + 90,  `Boss Survived: ${bossSurvived}`,  { fontSize: "20px", fill: "#0ff" });

  // Buttons
  const restartBtn = scene.add.text(120, chartY + 140, "[ Restart ]", { fontSize: "22px", fill: "#0f0" })
    .setInteractive()
    .on("pointerdown", () => location.reload());

  const leaderboardBtn = scene.add.text(120, chartY + 180, "[ Leaderboard ]", { fontSize: "22px", fill: "#0ff" })
    .setInteractive()
    .on("pointerdown", () => {
      // Save final score for group before showing leaderboard (idempotent)
      submitScore(score).finally(() => {
        document.getElementById("game").style.display = "none";
        document.getElementById("leaderboard").style.display = "block";
      });
    });
}

// API calls
async function submitScore(finalScore) {
  return fetch("/api/submitScore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, playerId, score: finalScore })
  });
}
class Pacman extends Phaser.Scene {
  constructor() {
    super();
    this.Pacman = null;
  }

  init(data) {
    this.difficulty = data.difficulty || "normal";
    this.gameOver = false;
    this.score = 0;
    this.dotsEaten = 0;
    this.isPaused = false;
  }

  initModeTimers() {
    this.setModeTimer(this.scatterModeDuration);
  }

  reiniciarEstadoJogo() {
    this.direction = "null";
    this.previousDirection = "left";
    this.blockSize = 16;
    this.board = [];
    this.speed = 120;

    const speedLevels = {
      easy: 80,
      normal: 120,
      hard: 160,
    };
    this.ghostSpeed = speedLevels[this.difficulty] || 120;

    this.intersections = [];
    this.nextIntersection = null;
    this.oldNextIntersection = null;

    this.PINKY_SCATTER_TARGET = { x: 432, y: 80 };
    this.BLINKY_SCATTER_TARGET = { x: 32, y: 80 };
    this.INKY_SCATTER_TARGET = { x: 432, y: 528 };
    this.CLYDE_SCATTER_TARGET = { x: 32, y: 528 };

    this.scatterModeDuration = 3000;
    this.chaseModeDuration = 20000;
    this.scaredModeDuration = 9000;
    this.entryDelay = 7000;
    this.respawnDelay = 5000;
    this.modeTimer = null;
    this.currentMode = "chase";

    this.lives = 3;
    this.isPacmanAlive = true;
    this.hasRespawned = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("pacmanHighScore")) || 0;
  }

  setModeTimer(duration) {
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
    }
    this.modeTimer = setTimeout(() => {
      this.switchMode();
    }, duration);
  }

  switchMode() {
    if (this.currentMode === "scared") {
      this.currentMode = this.previouseMode || "scatter";
      this.setModeTimer(this[this.currentMode + "ModeDuration"]);
      this.ghostSpeed = this.speed * 0.7;
      this.ghosts.forEach((ghost) => {
        clearInterval(ghost.blinkInterval);
        ghost.setTexture(ghost.originalTexture);
        let target =
          this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, target);
        ghost.hasBeenEaten = true;
      });
    } else {
      if (this.currentMode === "scatter") {
        this.currentMode = "chase";
        this.setModeTimer(this.chaseModeDuration);
      } else {
        this.currentMode = "scatter";
        this.setModeTimer(this.scatterModeDuration);
      }
      this.ghosts.forEach((ghost) => {
        let target =
          this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, target);
      });
      this.previouseMode = this.currentMode;
    }
  }

  getChaseTarget(ghost) {
    if (ghost.texture.key === "redGhost") {
      return { x: this.pacman.x, y: this.pacman.y };
    }
    if (ghost.texture.key === "pinkGhost") {
      const offset = this.blockSize * 4;
      switch (this.direction) {
        case "right":
          return { x: this.pacman.x + offset, y: this.pacman.y };
        case "left":
          return { x: this.pacman.x - offset, y: this.pacman.y };
        case "up":
          return { x: this.pacman.x, y: this.pacman.y - offset };
        case "down":
          return { x: this.pacman.x, y: this.pacman.y + offset };
        default:
          return { x: this.pacman.x, y: this.pacman.y };
      }
    }
    if (ghost.texture.key === "orangeGhost") {
      const distance = Math.hypot(
        ghost.x - this.pacman.x,
        ghost.y - this.pacman.y
      );
      return distance > this.blockSize * 8
        ? { x: this.pacman.x, y: this.pacman.y }
        : this.CLYDE_SCATTER_TARGET;
    }
    if (ghost.texture.key === "blueGhost") {
      const blinky = this.redGhost;

      let pacmanAhead = { x: this.pacman.x, y: this.pacman.y };
      const aheadOffset = this.blockSize * 2;
      switch (this.direction) {
        case "right":
          pacmanAhead = { x: this.pacman.x + aheadOffset, y: this.pacman.y };
          break;
        case "left":
          pacmanAhead = { x: this.pacman.x - aheadOffset, y: this.pacman.y };
          break;
        case "up":
          pacmanAhead = { x: this.pacman.x, y: this.pacman.y - aheadOffset };
          break;
        case "down":
          pacmanAhead = { x: this.pacman.x, y: this.pacman.y + aheadOffset };
          break;
      }
      const vectorX = pacmanAhead.x - blinky.x;
      const vectorY = pacmanAhead.y - blinky.y;

      return { x: blinky.x + 2 * vectorX, y: blinky.y + 2 * vectorY };
    }
  }

  getScaredTarget(ghost) {
    let randomIndex = Math.floor(Math.random() * this.intersections.length);
    let randomIntersection = this.intersections[randomIndex];
    return { x: randomIntersection.x, y: randomIntersection.y };
  }

  getScatterTarget(ghost) {
    if (ghost.texture.key === "redGhost") return this.BLINKY_SCATTER_TARGET;
    if (ghost.texture.key === "pinkGhost") return this.PINKY_SCATTER_TARGET;
    if (ghost.texture.key === "orangeGhost") return this.CLYDE_SCATTER_TARGET;
    if (ghost.texture.key === "blueGhost") return this.INKY_SCATTER_TARGET;
  }

  updateGhostPath(ghost, chaseTarget) {
    let chaseStartPoint = { x: ghost.x, y: ghost.y };

    if (this.isInghostHouse(ghost.x, ghost.y)) {
      chaseStartPoint = { x: 232, y: 240 };
    }

    ghost.path = this.aStarAlgorithm(chaseStartPoint, chaseTarget);
    if (ghost.path.length > 0) ghost.nextIntersection = ghost.path.shift();
  }

  preload() {
    this.load.image("pacman tileset", "pacman_tiles/tileset.png");
    this.load.tilemapTiledJSON("map", "pacman-map.json");
    this.load.spritesheet("pacman", "pacman_characters/pacman/pacman0.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman1", "pacman_characters/pacman/pacman1.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman2", "pacman_characters/pacman/pacman2.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman3", "pacman_characters/pacman/pacman3.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("pacman4", "pacman_characters/pacman/pacman4.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet(
      "pacmanDeath1",
      "pac man & life counter & death/pac man death/spr_pacdeath_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "pacmanDeath2",
      "pac man & life counter & death/pac man death/spr_pacdeath_1.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "pacmanDeath3",
      "pac man & life counter & death/pac man death/spr_pacdeath_2.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );

    this.load.image("dot", "pacman_items/dot.png");
    this.load.image("powerPill", "pacman_items/spr_power_pill_0.png");

    this.load.spritesheet(
      "pinkGhost",
      "ghost/pink ghost/spr_ghost_pink_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "orangeGhost",
      "ghost/orange ghost/spr_ghost_orange_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet(
      "blueGhost",
      "ghost/blue ghost/spr_ghost_blue_0.png",
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    );
    this.load.spritesheet("redGhost", "ghost/red ghost/spr_ghost_red_0.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image("scaredGhost", "ghost/ghost afraid/spr_afraid_0.png");
    this.load.image("scaredGhostWhite", "ghost/ghost afraid/spr_afraid_1.png");

    this.load.image(
      "lifeCounter1",
      "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png"
    );
    this.load.image(
      "lifeCounter2",
      "pac man & life counter & death/pac man life counter/spr_lifecounter_0.png"
    );
  }
  create() {
    this.reiniciarEstadoJogo();
    this.gameOver = false;
    this.map = this.make.tilemap({ key: "map" });
    const tileset = this.map.addTilesetImage("pacman tileset");
    this.layer = this.map.createLayer("Tile Layer 1", [tileset]);
    this.layer.setCollisionByExclusion(-1, true);

    // Criar Pac-Man
    this.pacman = this.physics.add.sprite(230, 432, "pacman");
    this.anims.create({
      key: "pacmanAnim",
      frames: [
        { key: "pacman" },
        { key: "pacman1" },
        { key: "pacman2" },
        { key: "pacman3" },
        { key: "pacman4" },
      ],
      frameRate: 10,
      repeat: -1,
    });
    this.pacman.play("pacmanAnim");

    this.anims.create({
      key: "pacmanDeath",
      frames: [
        { key: "pacmanDeath1" },
        { key: "pacmanDeath2" },
        { key: "pacmanDeath3" },
      ],
      frameRate: 10,
      repeat: 0,
    });

    // Física
    this.physics.add.collider(this.pacman, this.layer);

    // Pontos e power pills
    this.dots = this.physics.add.group();
    this.powerPills = this.physics.add.group();
    this.populateBoardAndTrackEmptyTiles(this.layer);

    this.physics.add.overlap(this.pacman, this.dots, this.eatDot, null, this);
    this.physics.add.overlap(
      this.pacman,
      this.powerPills,
      this.eatPowerPill,
      null,
      this
    );

    // Input
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }
    this.cursors = this.input.keyboard.createCursorKeys();

    // Reiniciar estado do jogo
    this.score = 0;
    this.gameOver = false;
    this.isPacmanAlive = true;
    this.direction = "null";
    this.previousDirection = "left";

    // Dificuldade (usada na velocidade dos fantasmas)
    const speedLevels = {
      easy: 50,
      normal: 160,
      hard: 250,
    };
    this.ghostSpeed = speedLevels[this.difficulty] || 120;

    // Interseções e fantasmas
    this.detectIntersections();
    this.initializeGhosts(this.layer);

    const startPoint = { x: 232, y: 240 };
    this.pinkGhost.path = this.aStarAlgorithm(
      startPoint,
      this.PINKY_SCATTER_TARGET
    );
    this.pinkGhost.nextIntersection = this.pinkGhost.path.shift();

    this.blueGhost.path = this.aStarAlgorithm(
      startPoint,
      this.INKY_SCATTER_TARGET
    );
    this.blueGhost.nextIntersection = this.blueGhost.path.shift();

    this.orangeGhost.path = this.aStarAlgorithm(
      startPoint,
      this.CLYDE_SCATTER_TARGET
    );
    this.orangeGhost.nextIntersection = this.orangeGhost.path.shift();

    this.redGhost.path = this.aStarAlgorithm(
      startPoint,
      this.BLINKY_SCATTER_TARGET
    );
    this.redGhost.nextIntersection = this.redGhost.path.shift();

    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];

    this.ghosts.forEach((ghost) => {
      this.physics.add.overlap(
        this.pacman,
        ghost,
        this.handlePacmanGhostCollision,
        null,
        this
      );
    });

    // Vidas e score
    this.lifeCounter1 = this.add.image(32, 32, "lifeCounter1");
    this.lifeCounter2 = this.add.image(56, 32, "lifeCounter2");

    const cam = this.cameras.main;

    this.scoreText = this.add
      .text(cam.width / 2, 16, "Score: 0", {
        font: "16px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.highScoreText = this.add
      .text(cam.width - 16, 16, "High-Score: " + this.highScore, {
        font: "16px Arial",
        fill: "#ffff00",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.input.keyboard.removeAllListeners(); // Limpa listeners antigos
    this.cursors = this.input.keyboard.createCursorKeys(); // Recria inputs

    this.input.keyboard.on("keydown-P", () => {
      if (!this.isPaused) {
        this.isPaused = true;
        this.physics.pause();

        // Guardar velocidades
        this.pacmanVelocity = {
          x: this.pacman.body.velocity.x,
          y: this.pacman.body.velocity.y,
        };

        this.ghosts.forEach((ghost) => {
          ghost.storedDirection = ghost.direction;
          ghost.storedVelocity = {
            x: ghost.body.velocity.x,
            y: ghost.body.velocity.y,
          };
        });

        // Mostrar modal
        document.getElementById("pause-modal").classList.remove("hidden");
      }
    });
  }

  resumeGameFromPause() {
    // Primeiro: despausar a física
    this.physics.resume();

    // Segundo: indicar que já não está pausado
    this.isPaused = false;

    // Restaurar direção do Pac-Man com base na última velocidade
    if (this.pacmanVelocity) {
      this.pacman.setVelocity(this.pacmanVelocity.x, this.pacmanVelocity.y);

      if (this.pacmanVelocity.x < 0) this.direction = "left";
      else if (this.pacmanVelocity.x > 0) this.direction = "right";
      else if (this.pacmanVelocity.y < 0) this.direction = "up";
      else if (this.pacmanVelocity.y > 0) this.direction = "down";
    }

    // Restaurar direção e velocidade dos fantasmas
    this.ghosts.forEach((ghost) => {
      if (ghost.storedVelocity) {
        ghost.setVelocity(ghost.storedVelocity.x, ghost.storedVelocity.y);
      }
      if (ghost.storedDirection) {
        ghost.direction = ghost.storedDirection;
      }
    });

    this.handlePacmanMovement();
    this.ghosts.forEach((g) => this.handleGhostMovement(g));

    setTimeout(() => {
      this.handlePacmanMovement();
      this.ghosts.forEach((g) => this.handleGhostMovement(g));
    }, 100);
  }

  initializeGhosts(layer) {
    this.pinkGhost = this.initializeGhost(232, 290, "pinkGhost", layer);
    this.orangeGhost = this.initializeGhost(210, 290, "orangeGhost", layer);
    this.redGhost = this.initializeGhost(232, 290, "redGhost", layer);
    this.blueGhost = this.initializeGhost(255, 290, "blueGhost", layer);
    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];
    this.startGhostEntries();
  }

  startGhostEntries() {
    this.ghosts.forEach((ghost, index) => {
      if (ghost.entryTimer) {
        clearTimeout(ghost.entryTimer);
      }
      ghost.entryTimer = setTimeout(() => {
        this.enterMaze(ghost);
      }, this.entryDelay * index);
    });
  }

  enterMaze(ghost) {
    ghost.setPosition(232, 240);
    ghost.enteredMaze = true;
    if (this.currentMode !== "scared") ghost.hasBeenEaten = true;
  }
  initializeGhost(x, y, spriteKey, layer) {
    const ghost = this.physics.add.sprite(x, y, spriteKey);
    this.physics.add.collider(ghost, layer);
    ghost.originalTexture = spriteKey;
    ghost.direction = "right";
    ghost.previousDirection = "right";
    ghost.nextIntersection = null;
    ghost.enteredMaze = false;
    return ghost;
  }
  isInghostHouse(x, y) {
    if (x <= 262 && x >= 208 && y <= 290 && y > 240) return true;
    else return false;
  }

  aStarAlgorithm(start, target) {
    const isInGhostHouse = this.isInghostHouse.bind(this);

    function findNearestIntersection(point, intersections) {
      let nearest = null;
      let minDist = Infinity;
      for (const intersection of intersections) {
        if (isInGhostHouse(intersection.x, intersection.y)) {
          continue;
        }
        const dist =
          Math.abs(intersection.x - point.x) +
          Math.abs(intersection.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = intersection;
        }
      }
      return nearest;
    }

    const startIntersection = findNearestIntersection.call(
      this,
      start,
      this.intersections
    );
    target = findNearestIntersection.call(this, target, this.intersections);

    if (!startIntersection || !target) {
      return [];
    }

    const openList = [];
    const closedList = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    openList.push({
      node: startIntersection,
      g: 0,
      f: heuristic(startIntersection, target),
    });
    gScore.set(JSON.stringify(startIntersection), 0);

    function heuristic(node, target) {
      return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
    }

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift().node;

      if (current.x === target.x && current.y === target.y) {
        const path = [];
        let currentNode = current;
        while (cameFrom.has(JSON.stringify(currentNode))) {
          path.push(currentNode);
          currentNode = cameFrom.get(JSON.stringify(currentNode));
        }
        path.push(startIntersection);
        return path.reverse();
      }

      closedList.add(JSON.stringify(current));

      const currentIntersection = this.intersections.find(
        (i) => i.x === current.x && i.y === current.y
      );

      if (currentIntersection) {
        for (const direction of currentIntersection.openPaths) {
          const neighbor = this.getNextIntersection(
            current.x,
            current.y,
            direction
          );

          if (
            neighbor &&
            !isInGhostHouse(neighbor.x, neighbor.y) &&
            !closedList.has(JSON.stringify(neighbor))
          ) {
            const tentativeGScore = gScore.get(JSON.stringify(current)) + 1;

            if (
              !gScore.has(JSON.stringify(neighbor)) ||
              tentativeGScore < gScore.get(JSON.stringify(neighbor))
            ) {
              gScore.set(JSON.stringify(neighbor), tentativeGScore);
              const fScore = tentativeGScore + heuristic(neighbor, target);
              openList.push({ node: neighbor, g: tentativeGScore, f: fScore });
              cameFrom.set(JSON.stringify(neighbor), current);
            }
          }
        }
      }
    }

    return [];
  }

  getNextIntersection(currentX, currentY, previousDirection) {
    let filteredIntersections;
    const isUp = previousDirection === "up";
    const isDown = previousDirection === "down";
    const isLeft = previousDirection === "left";
    const isRight = previousDirection === "right";
    filteredIntersections = this.intersections
      .filter((intersection) => {
        return (
          (isUp && intersection.x === currentX && intersection.y < currentY) ||
          (isDown &&
            intersection.x === currentX &&
            intersection.y > currentY) ||
          (isLeft &&
            intersection.y === currentY &&
            intersection.x < currentX) ||
          (isRight && intersection.y === currentY && intersection.x > currentX)
        );
      })
      .sort((a, b) => {
        if (isUp || isDown) {
          return isUp ? b.y - a.y : a.y - b.y;
        } else {
          return isLeft ? b.x - a.x : a.x - b.x;
        }
      });
    return filteredIntersections ? filteredIntersections[0] : null;
  }

  populateBoardAndTrackEmptyTiles(layer) {
    layer.forEachTile((tile) => {
      if (!this.board[tile.y]) {
        this.board[tile.y] = [];
      }
      this.board[tile.y][tile.x] = tile.index;
      if (
        tile.y < 4 ||
        (tile.y > 11 && tile.y < 23 && tile.x > 6 && tile.x < 21) ||
        (tile.y === 17 && tile.x !== 6 && tile.x !== 21)
      )
        return;
      let rightTile = this.map.getTileAt(
        tile.x + 1,
        tile.y,
        true,
        "Tile Layer 1"
      );
      let bottomTile = this.map.getTileAt(
        tile.x,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );
      let rightBottomTile = this.map.getTileAt(
        tile.x + 1,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );
      if (
        tile.index === -1 &&
        rightTile &&
        rightTile.index === -1 &&
        bottomTile &&
        bottomTile.index === -1 &&
        rightBottomTile &&
        rightBottomTile.index === -1
      ) {
        const x = tile.x * tile.width;
        const y = tile.y * tile.height;
        this.dots.create(x + tile.width, y + tile.height, "dot");
      }
    });

    this.powerPills.create(32, 144, "powerPill");
    this.powerPills.create(432, 144, "powerPill");
    this.powerPills.create(32, 480, "powerPill");
    this.powerPills.create(432, 480, "powerPill");
  }

  checkVictory250() {
    if (this.dotsEaten >= 250) {
      this.physics.pause();
      this.pacman.setVelocity(0);
      this.pacman.anims?.stop?.();

      setTimeout(() => {
        if (typeof window.showGameOver === "function") {
          window.showGameOver(true);
        }
      }, 1000);
    }
  }
  eatDot(pacman, dot) {
    dot.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);
    this.dotsEaten++;
    this.checkVictory250();

    // checa high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("pacmanHighScore", this.highScore);
      this.highScoreText.setText("High-Score: " + this.highScore);
    }
  }

  eatPowerPill(pacman, powerPill) {
    powerPill.disableBody(true, true);
    this.score += 100;
    this.scoreText.setText("Score: " + this.score);
    this.dotsEaten++;
    this.checkVictory250();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("pacmanHighScore", this.highScore);
      this.highScoreText.setText("High-Score: " + this.highScore);
    }
    this.currentMode = "scared";
    this.setGhostsToScaredMode();
    this.setModeTimer(this.scaredModeDuration);
    this.ghostSpeed = this.speed * 0.5;
    this.ghosts.forEach((ghost) => {
      ghost.hasBeenEaten = false;
    });
  }

  setGhostsToScaredMode() {
    this.ghosts.forEach((ghost) => {
      // escolhe um caminho aleatório
      let scaredTarget = this.getScaredTarget();
      this.updateGhostPath(ghost, scaredTarget);

      // remove timer anterior
      if (ghost.blinkInterval) clearInterval(ghost.blinkInterval);

      // define quando começa a piscar
      const blinkTime = this.scaredModeDuration - 2000;
      ghost.blinkInterval = setTimeout(() => {
        if (ghost.hasBeenEaten) return;
        let blinkOn = true;
        ghost.blinkInterval = setInterval(() => {
          blinkOn = !blinkOn;
          // aqui ele alterna entre as duas texturas
          ghost.setTexture(blinkOn ? "scaredGhost" : "scaredGhostWhite");
        }, 200);
      }, blinkTime);

      // textura inicial (antes de piscar)
      ghost.setTexture("scaredGhost");
    });
  }

  detectIntersections() {
    const directions = [
      { x: -this.blockSize, y: 0, name: "left" },
      { x: this.blockSize, y: 0, name: "right" },
      { x: 0, y: -this.blockSize, name: "up" },
      { x: 0, y: this.blockSize, name: "down" },
    ];
    const blockSize = this.blockSize;
    for (let y = 0; y < this.map.heightInPixels; y += blockSize) {
      for (let x = 0; x < this.map.widthInPixels; x += blockSize) {
        if (x % blockSize !== 0 || y % blockSize !== 0) continue;
        if (!this.isPointClear(x, y)) continue;
        let openPaths = [];
        directions.forEach((dir) => {
          if (this.isPathOpenAroundPoint(x + dir.x, y + dir.y)) {
            openPaths.push(dir.name);
          }
        });
        if (openPaths.length > 2 && y > 64 && y < 530) {
          this.intersections.push({ x: x, y: y, openPaths: openPaths });
        } else if (openPaths.length === 2 && y > 64 && y < 530) {
          const [dir1, dir2] = openPaths;
          if (
            ((dir1 === "left" || dir1 === "right") &&
              (dir2 === "up" || dir2 === "down")) ||
            ((dir1 === "up" || dir1 === "down") &&
              (dir2 === "left" || dir2 === "right"))
          ) {
            this.intersections.push({ x: x, y: y, openPaths: openPaths });
          }
        }
      }
    }
  }

  isPathOpenAroundPoint(pixelX, pixelY) {
    const corners = [
      { x: pixelX - 1, y: pixelY - 1 },
      { x: pixelX + 1, y: pixelY - 1 },
      { x: pixelX - 1, y: pixelY + 1 },
      { x: pixelX + 1, y: pixelY + 1 },
    ];
    return corners.every((corner) => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);
      if (!this.board[tileY] || this.board[tileY][tileX] !== -1) {
        return false;
      }
      return true;
    });
  }
  isPointClear(x, y) {
    const corners = [
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y + 1 },
    ];
    return corners.every((corner) => {
      const tileX = Math.floor(corner.x / this.blockSize);
      const tileY = Math.floor(corner.y / this.blockSize);

      return !this.board[tileY] || this.board[tileY][tileX] === -1;
    });
  }

  handlePacmanGhostCollision(pacman, ghost) {
    if (this.currentMode === "scared" && !ghost.hasBeenEaten) {
      ghost.setActive(false);
      ghost.setVisible(false);
      this.time.delayedCall(1000, () => {
        this.respawnGhost(ghost);
      });
    } else if (ghost.hasBeenEaten) {
      this.pacmanDies();
    }
  }

  pacmanDies() {
    if (!this.isPacmanAlive) return;

    this.pacman.setVelocityY(0);
    this.pacman.setVelocityX(0);
    this.isPacmanAlive = false;
    this.pacman.anims.stop();

    this.pacman.play("pacmanDeath");
    this.time.delayedCall(2000, () => {
      this.resetAfterDeath();
    });
  }

  resetAfterDeath() {
    this.lives -= 1;
    if (this.lives === 1) this.lifeCounter1.destroy();
    if (this.lives === 2) this.lifeCounter2.destroy();
    if (this.lives > 0) {
      this.pacman.setPosition(230, 432);
      this.resetGhosts();
      this.anims.create({
        key: "pacmanAnim",
        frames: [
          { key: "pacman" },
          { key: "pacman1" },
          { key: "pacman2" },
          { key: "pacman3" },
          { key: "pacman4" },
        ],
        frameRate: 10,
        repeat: -1,
      });
      this.pacman.play("pacmanAnim");
      this.currentMode = "scatter";
    } else {
      this.pacman.destroy();
      this.redGhost.destroy();
      this.pinkGhost.destroy();
      this.blueGhost.destroy();
      this.orangeGhost.destroy();
      this.physics.pause();
      this.time.delayedCall(1000, () => {
        showGameOver(false); // Mostra menu "PERDEU"
      });
    }
    this.isPacmanAlive = true;
    this.hasRespawned = true;
  }

  resetGhosts() {
    this.redGhost.setPosition(232, 290);
    this.pinkGhost.setPosition(220, 290);
    this.blueGhost.setPosition(255, 290);
    this.orangeGhost.setPosition(210, 290);

    this.ghosts = [
      this.pinkGhost,
      this.redGhost,
      this.orangeGhost,
      this.blueGhost,
    ];

    this.ghosts.forEach((ghost) => {
      ghost.setTexture(ghost.originalTexture);
      ghost.hasBeenEaten = true;
      ghost.enteredMaze = false;
      clearInterval(ghost.blinkInterval);
      let target = this.getScatterTarget(ghost);
      this.updateGhostPath(ghost, target);
      ghost.direction = "left";
    });
    this.startGhostEntries();
    this.setModeTimer(this.scatterModeDuration);
    this.currentMode = "scatter";
    this.previouseMode = this.currentMode;
  }

  respawnGhost(ghost) {
    ghost.setPosition(232, 290);
    ghost.setActive(true);
    ghost.setVisible(true);
    ghost.setTexture(ghost.originalTexture);
    ghost.hasBeenEaten = true;
    this.enterMaze(ghost);
    let target =
      this.currentMode === "chase"
        ? this.getChaseTarget(ghost)
        : this.getScatterTarget(ghost);
    this.updateGhostPath(ghost, target);
  }

  update() {
    if (this.gameOver) return;
    if (!this.isPacmanAlive || this.lives === 0) return;
    this.handleDirectionInput();
    this.handlePacmanMovement();
    this.teleportPacmanAcrossWorldBounds();
    if (this.pinkGhost.enteredMaze) {
      this.handleGhostDirection(this.pinkGhost);
      this.handleGhostMovement(this.pinkGhost);
    }
    if (this.orangeGhost.enteredMaze) {
      this.handleGhostDirection(this.orangeGhost);
      this.handleGhostMovement(this.orangeGhost);
    }
    if (this.blueGhost.enteredMaze) {
      this.handleGhostDirection(this.blueGhost);
      this.handleGhostMovement(this.blueGhost);
    }
    if (this.redGhost.enteredMaze) {
      this.handleGhostDirection(this.redGhost);
      this.handleGhostMovement(this.redGhost);
    }
  }

  handleDirectionInput() {
    const arrowKeys = ["left", "right", "up", "down"];
    for (const key of arrowKeys) {
      if (
        (this.cursors[key].isDown && this.direction !== key) ||
        this.hasRespawned
      ) {
        if (this.hasRespawned) this.hasRespawned = !this.hasRespawned;

        this.previousDirection = this.direction;
        this.direction = key;
        this.nextIntersection = this.getNextIntersectionInNextDirection(
          this.pacman.x,
          this.pacman.y,
          this.previousDirection,
          key
        );
        break;
      }
    }
  }

  getNextIntersectionInNextDirection(
    currentX,
    currentY,
    currentDirection,
    nextDirection
  ) {
    let filteredIntersections;
    const isUp = currentDirection === "up";
    const isDown = currentDirection === "down";
    const isLeft = currentDirection === "left";
    const isRight = currentDirection === "right";
    filteredIntersections = this.intersections
      .filter((intersection) => {
        return (
          ((isUp &&
            intersection.x === currentX &&
            intersection.y <= currentY) ||
            (isDown &&
              intersection.x === currentX &&
              intersection.y >= currentY) ||
            (isLeft &&
              intersection.y === currentY &&
              intersection.x <= currentX) ||
            (isRight &&
              intersection.y === currentY &&
              intersection.x >= currentX)) &&
          this.isIntersectionInDirection(intersection, nextDirection)
        );
      })
      .sort((a, b) => {
        if (isUp || isDown) {
          return isUp ? b.y - a.y : a.y - b.y;
        } else {
          return isLeft ? b.x - a.x : a.x - b.x;
        }
      });
    return filteredIntersections ? filteredIntersections[0] : null;
  }
  isIntersectionInDirection(intersection, direction) {
    switch (direction) {
      case "up":
        return intersection.openPaths.includes("up");
      case "down":
        return intersection.openPaths.includes("down");
      case "left":
        return intersection.openPaths.includes("left");
      case "right":
        return intersection.openPaths.includes("right");
      default:
        return false;
    }
  }

  handlePacmanMovement() {
    let nextIntersectionx = null;
    let nextIntersectiony = null;
    if (this.nextIntersection) {
      nextIntersectionx = this.nextIntersection.x;
      nextIntersectiony = this.nextIntersection.y;
    }
    switch (this.direction) {
      case "left":
        this.handleMovementInDirection(
          "left",
          "right",
          this.pacman.y,
          nextIntersectiony,
          this.pacman.x,
          true,
          false,
          0,
          -this.speed,
          0,
          this.pacman.body.velocity.y
        );
        break;
      case "right":
        this.handleMovementInDirection(
          "right",
          "left",
          this.pacman.y,
          nextIntersectiony,
          this.pacman.x,
          true,
          false,
          180,
          this.speed,
          0,
          this.pacman.body.velocity.y
        );
        break;
      case "up":
        this.handleMovementInDirection(
          "up",
          "down",
          this.pacman.x,
          nextIntersectionx,
          this.pacman.y,
          false,
          true,
          -90,
          0,
          -this.speed,
          this.pacman.body.velocity.x
        );
        break;
      case "down":
        this.handleMovementInDirection(
          "down",
          "up",
          this.pacman.x,
          nextIntersectionx,
          this.pacman.y,
          false,
          true,
          90,
          0,
          this.speed,
          this.pacman.body.velocity.x
        );
        break;
    }
  }
  handleMovementInDirection(
    currentDirection,
    oppositeDirection,
    pacmanPosition,
    intersectionPosition,
    movingCoordinate,
    flipX,
    flipY,
    angle,
    velocityX,
    velocityY,
    currentVelocity
  ) {
    let perpendicularDirection =
      currentDirection === "left" || currentDirection === "right"
        ? ["up", "down"]
        : ["left", "right"];
    let condition = false;
    if (this.nextIntersection)
      condition =
        (this.previousDirection == perpendicularDirection[0] &&
          pacmanPosition <= intersectionPosition) ||
        (this.previousDirection == perpendicularDirection[1] &&
          pacmanPosition >= intersectionPosition) ||
        this.previousDirection === oppositeDirection;
    if (condition) {
      let newPosition = intersectionPosition;
      if (
        this.previousDirection != oppositeDirection &&
        newPosition !== pacmanPosition
      ) {
        if (currentDirection === "left" || currentDirection === "right")
          this.pacman.body.reset(movingCoordinate, newPosition);
        else this.pacman.body.reset(newPosition, movingCoordinate);
      }
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    } else if (currentVelocity === 0) {
      this.changeDirection(flipX, flipY, angle, velocityX, velocityY);
      this.adjustPacmanPosition(velocityX, velocityY);
    }
  }
  adjustPacmanPosition(velocityX, velocityY) {
    if (this.pacman.x % this.blockSize !== 0 && velocityY > 0) {
      let nearestMultiple =
        Math.round(this.pacman.x / this.blockSize) * this.blockSize;
      this.pacman.body.reset(nearestMultiple, this.pacman.y);
    }
    if (this.pacman.y % this.blockSize !== 0 && velocityX > 0) {
      let nearestMultiple =
        Math.round(this.pacman.y / this.blockSize) * this.blockSize;
      this.pacman.body.reset(this.pacman.x, nearestMultiple);
    }
  }

  changeDirection(flipX, flipY, angle, velocityX, velocityY) {
    this.pacman.setFlipX(flipX);
    this.pacman.setFlipY(flipY);
    this.pacman.setAngle(angle);
    this.pacman.setVelocityY(velocityY);
    this.pacman.setVelocityX(velocityX);
  }
  teleportPacmanAcrossWorldBounds() {
    const worldBounds = this.physics.world.bounds;
    if (this.pacman.x <= worldBounds.x) {
      this.pacman.body.reset(worldBounds.right - this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(
        this.pacman.x,
        this.pacman.y,
        "left",
        this.direction
      );
      this.pacman.setVelocityX(-1 * this.speed);
    }
    if (this.pacman.x >= worldBounds.right) {
      this.pacman.body.reset(worldBounds.x + this.blockSize, this.pacman.y);
      this.nextIntersection = this.getNextIntersectionInNextDirection(
        this.pacman.x,
        this.pacman.y,
        "right",
        this.direction
      );
      this.pacman.setVelocityX(this.speed);
    }
  }

  handleGhostDirection(ghost) {
    if (this.isInghostHouse(ghost.x, ghost.y)) {
      this.changeGhostDirection(ghost, 0, -this.ghostSpeed);
      if (ghost.direction === "down") ghost.direction = "up";
    }

    const isMoving = ghost.body.velocity.x !== 0 || ghost.body.velocity.y !== 0;
    if (!isMoving) {
      ghost.stuckTimer = (ghost.stuckTimer || 0) + 1;
      if (ghost.stuckTimer > 30) {
        ghost.stuckTimer = 0;
        let newTarget =
          this.currentMode === "scared"
            ? this.getScaredTarget()
            : this.currentMode === "chase"
            ? this.getChaseTarget(ghost)
            : this.getScatterTarget(ghost);
        this.updateGhostPath(ghost, newTarget);
      }
    } else ghost.stuckTimer = 0;

    if (ghost.body.velocity.x == 0 && ghost.body.velocity.y == 0) {
      this.adjustGhostPosition(ghost);
    }

    let isAtIntersection = this.isGhostAtIntersection(
      ghost.nextIntersection,
      ghost.x,
      ghost.y,
      ghost.direction
    );

    if (isAtIntersection) {
      if (
        this.PINKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.PINKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "pinkGhost"
      )
        return;
      if (
        this.BLINKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.BLINKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "redGhost"
      )
        return;
      if (
        this.INKY_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.INKY_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "blueGhost"
      )
        return;
      if (
        this.CLYDE_SCATTER_TARGET.x === ghost.nextIntersection.x &&
        this.CLYDE_SCATTER_TARGET.y === ghost.nextIntersection.y &&
        this.currentMode === "scatter" &&
        ghost.texture.key === "orangeGhost"
      )
        return;

      if (this.currentMode === "chase") {
        let chaseTarget = this.getChaseTarget(ghost);
        this.updateGhostPath(ghost, chaseTarget);
      }

      if (ghost.path.length > 0) {
        ghost.nextIntersection = ghost.path.shift();
      }
      if (ghost.path.length == 0 && this.currentMode === "scared") {
        let scaredTarget = this.getScaredTarget();
        this.updateGhostPath(ghost, scaredTarget);
      }

      let newDirection = this.getGhostNextDirection(
        ghost,
        ghost.nextIntersection
      );
      ghost.previousDirection = ghost.direction;
      ghost.direction = newDirection;
    }
  }

  adjustGhostPosition(ghost) {
    if (ghost.x % this.blockSize !== 0) {
      let nearestMultiple =
        Math.round(ghost.x / this.blockSize) * this.blockSize;
      ghost.body.reset(nearestMultiple, ghost.y);
    }
    if (ghost.y % this.blockSize !== 0) {
      let nearestMultiple =
        Math.round(ghost.y / this.blockSize) * this.blockSize;
      ghost.body.reset(ghost.x, nearestMultiple);
    }
  }

  isGhostAtIntersection(intersection, currentX, currentY, direction) {
    const isUp = direction === "up";
    const isDown = direction === "down";
    const isLeft = direction === "left";
    const isRight = direction === "right";

    let condition =
      (isUp && intersection.x === currentX && intersection.y >= currentY) ||
      (isDown && intersection.x === currentX && intersection.y <= currentY) ||
      (isLeft && intersection.y === currentY && intersection.x >= currentX) ||
      (isRight && intersection.y === currentY && intersection.x <= currentX);
    return condition;
  }

  getGhostNextDirection(ghost, intersection) {
    if (
      Math.abs(intersection.x - ghost.x) < this.blockSize &&
      ghost.y <= intersection.y
    )
      return "down";
    if (
      Math.abs(intersection.x - ghost.x) < this.blockSize &&
      ghost.y >= intersection.y
    )
      return "up";
    if (
      Math.abs(intersection.y - ghost.y) < this.blockSize &&
      ghost.x <= intersection.x
    )
      return "right";
    if (
      Math.abs(intersection.y - ghost.y) < this.blockSize &&
      ghost.x >= intersection.x
    )
      return "left";
    return "up";
  }

  handleGhostMovement(ghost) {
    let nextIntersectionx = null;
    let nextIntersectiony = null;
    if (ghost.nextIntersection) {
      nextIntersectionx = ghost.nextIntersection.x;
      nextIntersectiony = ghost.nextIntersection.y;
    }
    switch (ghost.direction) {
      case "left":
        this.handleGhostMovementInDirection(
          ghost,
          "left",
          "right",
          ghost.y,
          nextIntersectiony,
          ghost.x,
          -this.ghostSpeed,
          0,
          ghost.body.velocity.y
        );
        break;
      case "right":
        this.handleGhostMovementInDirection(
          ghost,
          "right",
          "left",
          ghost.y,
          nextIntersectiony,
          ghost.x,
          this.ghostSpeed,
          0,
          ghost.body.velocity.y
        );
        break;
      case "up":
        this.handleGhostMovementInDirection(
          ghost,
          "up",
          "down",
          ghost.x,
          nextIntersectionx,
          ghost.y,
          0,
          -this.ghostSpeed,
          ghost.body.velocity.x
        );
        break;
      case "down":
        this.handleGhostMovementInDirection(
          ghost,
          "down",
          "up",
          ghost.x,
          nextIntersectionx,
          ghost.y,
          0,
          this.ghostSpeed,
          ghost.body.velocity.x
        );
        break;
    }
  }

  handleGhostMovementInDirection(
    ghost,
    currentDirection,
    oppositeDirection,
    ghostPosition,
    intersectionPosition,
    movingCoordinate,
    velocityX,
    velocityY,
    currentVelocity
  ) {
    let perpendicularDirection =
      currentDirection === "left" || currentDirection === "right"
        ? ["up", "down"]
        : ["left", "right"];
    let condition = false;
    if (ghost.nextIntersection)
      condition =
        (ghost.previousDirection == perpendicularDirection[0] &&
          ghostPosition <= intersectionPosition) ||
        (ghost.previousDirection == perpendicularDirection[1] &&
          ghostPosition >= intersectionPosition) ||
        ghost.previousDirection === oppositeDirection;
    if (condition) {
      let newPosition = intersectionPosition;
      if (
        ghost.previousDirection != oppositeDirection &&
        newPosition !== ghostPosition
      ) {
        if (currentDirection === "left" || currentDirection === "right")
          ghost.body.reset(movingCoordinate, newPosition);
        else ghost.body.reset(newPosition, movingCoordinate);
      }
      this.changeGhostDirection(ghost, velocityX, velocityY);
    } else if (currentVelocity === 0) {
      this.changeGhostDirection(ghost, velocityX, velocityY);
    }
  }

  changeGhostDirection(ghost, velocityX, velocityY) {
    ghost.setVelocityY(velocityY);
    ghost.setVelocityX(velocityX);
  }

  getOppositeDirection(direction) {
    switch (direction) {
      case "up":
        return "down";
      case "down":
        return "up";
      case "left":
        return "right";
      case "right":
        return "left";
      default:
        return "";
    }
  }
  getPerpendicularDirection(direction) {
    switch (direction) {
      case "up":
        return "right";
      case "down":
        return "left";
      case "left":
        return "up";
      case "right":
        return "down";
      default:
        return "";
    }
  }

  isMovingInxDirection(direction) {
    let result = direction === "left" || direction === "right" ? true : false;
    return result;
  }
}

function showGameOver(win = false) {
  const modal = document.getElementById("game-over-container");
  const title = document.getElementById("game-over-title");

  title.textContent = win ? "YOU WIN!" : "GAME OVER";
  modal.classList.remove("hidden");
}

function restartGame() {
  document.getElementById("game-over-container").classList.add("hidden");
  if (gameInstance) {
    const difficulty =
      window.selectedDifficulty === 1.0
        ? "easy"
        : window.selectedDifficulty === 1.8
        ? "hard"
        : "normal";

    gameInstance.scene.start("default", { difficulty }); // ✅ CORRETO
  }
}

function goToMenu() {
  document.getElementById("game-over-container").classList.add("hidden");
  document.getElementById("game-container").classList.add("hidden");
  document.getElementById("menu-container").classList.remove("hidden");

  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

let gameInstance = null;

function startGame(difficulty) {
  document.getElementById("difficulty-container").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");

  // Define multiplicador da dificuldade
  let ghostSpeedMultiplier = 1.2;
  if (difficulty === "easy") ghostSpeedMultiplier = 1.0;
  if (difficulty === "hard") ghostSpeedMultiplier = 1.8;

  // Passar valor global para a cena
  window.selectedDifficulty = ghostSpeedMultiplier;

  if (gameInstance) {
    gameInstance.destroy(true);
  }

  const config = {
    type: Phaser.AUTO,
    width: 464,
    height: 560,
    parent: "game-container",
    backgroundColor: "#000000",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: Pacman, // usa a tua classe original
  };

  gameInstance = new Phaser.Game(config);
}

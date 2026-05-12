import Phaser from 'phaser';
import { CORE_ENEMY, CORE_RELEASE_SECONDS, ENEMY_CONFIGS, RUN_DURATION_SECONDS, UPGRADE_CONFIGS } from './config';
import { spawnDeathParticles } from './effects';
import { emitGameState, emitLevelUp, emitRunEnded } from './events';
import { soundManager } from './SoundManager';
import {
  addExperience,
  applyUpgrade,
  createInitialGameState,
  receiveDamage,
  startRun,
  updateCoreIntegrity,
  updateElapsed,
} from './rules';
import type { BossPhase, EnemyConfig, GameState, UpgradeConfig } from './types';

type EnemySprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  config: EnemyConfig;
  hp: number;
  maxHp: number;
  dashTimer: number;
  isDashing: boolean;
  dashDuration: number;
  poolDropTimer: number;
  hitByIds: Set<number>;
};

type BulletSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  damage: number;
  pierceCount: number;
  splitDepth: number;
  bulletId: number;
};

type PickupSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  experience: number;
};

export class LabRogueliteScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private state: GameState = createInitialGameState();
  private lastShotAt = 0;
  private lastSpawnAt = 0;
  private lastDamageAt = 0;
  private lastEmitAt = 0;
  private startedAt = 0;
  private boss?: EnemySprite;
  private bossBullets!: Phaser.Physics.Arcade.Group;
  private slowPools: { x: number; y: number; radius: number; graphics: Phaser.GameObjects.Graphics; expiresAt: number }[] = [];
  private damageZones: { x: number; y: number; radius: number; graphics: Phaser.GameObjects.Graphics; expiresAt: number }[] = [];
  private decoys!: Phaser.Physics.Arcade.Group;
  private bossPhase: BossPhase = 'phase1';
  private bossAttackTimer = 0;
  private bossSpawnTimer = 0;
  private playerSlowed = false;
  private lastDashTime = 0;
  private dashDirection: { x: number; y: number } | null = null;
  private dashDuration = 0;
  private isDashing = false;
  private mouseWorldX = 480;
  private mouseWorldY = 320;
  private mouseMovedAt = 0;
  private statusText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private runFinished = false;

  constructor() {
    super('LabRogueliteScene');
  }

  create() {
    this.state = startRun(createInitialGameState());
    this.lastEmitAt = 0;
    this.startedAt = this.time.now;
    this.lastShotAt = 0;
    this.lastSpawnAt = 0;
    this.lastDamageAt = 0;
    this.boss = undefined;
    this.runFinished = false;
    this.slowPools = [];
    this.damageZones = [];
    this.bossPhase = 'phase1';
    this.bossAttackTimer = 0;
    this.bossSpawnTimer = 0;
    this.playerSlowed = false;
    this.lastDashTime = 0;
    this.dashDirection = null;
    this.dashDuration = 0;
    this.isDashing = false;
    this.mouseWorldX = 480;
    this.mouseWorldY = 320;
    this.mouseMovedAt = 0;

    this.createTextures();
    this.drawLab();

    this.player = this.physics.add.sprite(480, 320, 'player');
    this.player.setCircle(16);
    this.player.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.decoys = this.physics.add.group();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickup, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.bossBullets, this.handleBossBulletPlayer, undefined, this);
    this.physics.add.overlap(this.enemies, this.decoys, this.handleEnemyDecoy, undefined, this);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseWorldX = pointer.worldX;
      this.mouseWorldY = pointer.worldY;
      this.mouseMovedAt = this.time.now;
    });

    this.hudText = this.add.text(18, 16, '', {
      color: '#d7fff4',
      fontFamily: 'Arial',
      fontSize: '16px',
      lineSpacing: 6,
    });
    this.statusText = this.add
      .text(480, 300, '', {
        color: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '28px',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20);

    emitGameState(this.state);
  }

  update(time: number, delta: number) {
    if (this.state.status !== 'running') {
      this.player.setVelocity(0, 0);
      if (this.state.status === 'won' || this.state.status === 'lost') {
        this.finishRun();
      }
      return;
    }

    const elapsedSeconds = Math.floor((time - this.startedAt) / 1000);
    this.state = updateElapsed(this.state, elapsedSeconds);
    this.playerSlowed = false;
    this.updateSlowPools(time);
    this.updateDamageZones(time);
    this.movePlayer();
    this.updateEnemies(time, delta);
    this.updateDecoys(time, delta);
    this.updateDash(time, delta);
    this.tryShoot(time);
    this.trySpawnEnemy(time);
    this.tryReleaseCore(elapsedSeconds);
    this.updateBoss(time, delta);
    this.cleanupObjects();
    this.updateHud();

    if (elapsedSeconds >= RUN_DURATION_SECONDS && !this.boss) {
      this.spawnEnemy(CORE_ENEMY, 480, 90);
    }

    if (this.boss?.active) {
      this.state = updateCoreIntegrity(this.state, this.boss.hp, this.boss.maxHp);
    }

    if (this.state.status === 'won' || this.state.status === 'lost') {
      this.finishRun();
      return;
    }

    if (time - this.lastEmitAt >= 100) {
      this.lastEmitAt = time;
      emitGameState(this.state);
    }
  }

  applyUpgrade(upgrade: UpgradeConfig) {
    this.state = applyUpgrade(this.state, upgrade);
    this.scene.resume();
    emitGameState(this.state);
  }

  private createTextures() {
    this.makeCircleTexture('player', 0x13e2b7, 18, 0x042f2a);
    this.makeCircleTexture('bullet', 0xd7fff4, 5);
    this.makeCircleTexture('xp', 0x8ef76e, 7);
    for (const config of [...ENEMY_CONFIGS, CORE_ENEMY]) {
      this.makeCircleTexture(config.id, config.color, config.radius, 0x111827);
    }
    this.makeCircleTexture('bossBullet', 0xff4d6d, 6, 0xffffff);
    this.makeCircleTexture('decoysprite', 0x13e2b7, 14, 0x042f2a);
  }

  private makeCircleTexture(key: string, color: number, radius: number, stroke?: number) {
    if (this.textures.exists(key)) {
      return;
    }
    const size = radius * 2 + 6;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    if (stroke !== undefined) {
      g.lineStyle(3, stroke, 0.85);
    }
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, radius);
    if (stroke !== undefined) {
      g.strokeCircle(size / 2, size / 2, radius);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private drawLab() {
    this.cameras.main.setBackgroundColor('#091018');
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x15303c, 0.75);
    for (let x = 0; x <= 960; x += 48) {
      grid.lineBetween(x, 0, x, 640);
    }
    for (let y = 0; y <= 640; y += 48) {
      grid.lineBetween(0, y, 960, y);
    }
    const accents = this.add.graphics();
    accents.lineStyle(2, 0x13e2b7, 0.45);
    accents.strokeRoundedRect(42, 42, 876, 556, 18);
    accents.lineStyle(2, 0xffc247, 0.35);
    accents.strokeRect(398, 46, 164, 64);
  }

  private lastMoveKey: string | null = null;
  private lastMoveKeyTime = 0;

  private movePlayer() {
    if (this.isDashing) {
      if (this.dashDirection) {
        this.player.setVelocity(
          this.dashDirection.x * this.state.moveSpeed * 3,
          this.dashDirection.y * this.state.moveSpeed * 3,
        );
      }
      return;
    }

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const x = Number(right) - Number(left);
    const y = Number(down) - Number(up);
    const length = Math.hypot(x, y) || 1;
    const speedMult = this.playerSlowed ? 0.5 : 1;
    this.player.setVelocity((x / length) * this.state.moveSpeed * speedMult, (y / length) * this.state.moveSpeed * speedMult);

    if (this.state.dashEnabled && length > 0 && (x !== 0 || y !== 0)) {
      const key = `${Math.round(x)},${Math.round(y)}`;
      const now = this.time.now;
      if (key === this.lastMoveKey && now - this.lastMoveKeyTime < 280 && now - this.lastDashTime >= this.state.dashCooldownMs) {
        this.isDashing = true;
        this.dashDuration = 150;
        this.dashDirection = { x: Math.round(x), y: Math.round(y) };
        this.lastDashTime = now;
        soundManager.dash();
        this.player.setAlpha(0.45);
      }
      this.lastMoveKey = key;
      this.lastMoveKeyTime = now;
    }
  }

  private updateEnemies(time: number, delta: number) {
    this.enemies.children.each((child) => {
      const enemy = child as EnemySprite;
      if (!enemy.active) {
        return true;
      }
      switch (enemy.config.behavior) {
        case 'sprinter':
          this.updateSprinter(enemy, delta);
          break;
        case 'tank':
          this.updateTank(enemy, time, delta);
          break;
        case 'chaser':
        case 'core':
        default: {
          const target = this.findNearestForEnemy(enemy);
          if (target) {
            this.physics.moveToObject(enemy, target, enemy.config.speed);
          }
          break;
        }
      }
      return true;
    });
  }

  private findNearestForEnemy(enemy: EnemySprite): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    let nearest: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody = this.player;
    let nearestDist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.decoys.children.each((child) => {
      const decoy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!decoy.active) return true;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, decoy.x, decoy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = decoy;
      }
      return true;
    });
    return nearest;
  }

  private updateSprinter(enemy: EnemySprite, delta: number) {
    if (enemy.isDashing) {
      enemy.dashDuration -= delta;
      if (enemy.dashDuration <= 0) {
        enemy.isDashing = false;
        enemy.clearTint();
        enemy.dashTimer = 1500 + Math.random() * 1000;
      } else {
        this.physics.moveToObject(enemy, this.player, enemy.config.speed * 2.5);
        return;
      }
    } else {
      enemy.dashTimer -= delta;
      if (enemy.dashTimer <= 0) {
        enemy.isDashing = true;
        enemy.dashDuration = 380;
        enemy.setTint(0xffffff);
        this.physics.moveToObject(enemy, this.player, enemy.config.speed * 2.5);
        return;
      }
    }
    this.physics.moveToObject(enemy, this.player, enemy.config.speed);
  }

  private updateTank(enemy: EnemySprite, time: number, delta: number) {
    this.physics.moveToObject(enemy, this.player, enemy.config.speed);
    enemy.poolDropTimer -= delta;
    if (enemy.poolDropTimer <= 0) {
      enemy.poolDropTimer = 2000 + Math.random() * 1500;
      const g = this.add.graphics();
      g.fillStyle(0x7b61ff, 0.22);
      g.fillCircle(0, 0, 44);
      g.setPosition(enemy.x, enemy.y);
      g.setDepth(1);
      this.slowPools.push({
        x: enemy.x,
        y: enemy.y,
        radius: 44,
        graphics: g,
        expiresAt: time + 4000,
      });
    }
  }

  private updateSlowPools(time: number) {
    for (let i = this.slowPools.length - 1; i >= 0; i--) {
      const pool = this.slowPools[i];
      if (time >= pool.expiresAt) {
        pool.graphics.destroy();
        this.slowPools.splice(i, 1);
        continue;
      }
      pool.graphics.setAlpha(0.22 * (1 - (time - (pool.expiresAt - 4000)) / 4000));
      if (!this.playerSlowed) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pool.x, pool.y);
        if (dist <= pool.radius + 16) {
          this.playerSlowed = true;
        }
      }
    }
  }

  private updateBoss(time: number, delta: number) {
    if (!this.boss?.active) return;
    const hpRatio = this.boss.hp / this.boss.maxHp;
    const newPhase: BossPhase = hpRatio > 0.6 ? 'phase1' : hpRatio > 0.3 ? 'phase2' : 'phase3';
    if (newPhase !== this.bossPhase) {
      this.bossPhase = newPhase;
      this.bossAttackTimer = 0;
      this.bossSpawnTimer = 0;
      if (newPhase === 'phase2') {
        this.statusText.setText('失控核心进入第二阶段\n加速并召唤异常');
        this.time.delayedCall(1800, () => this.statusText.setText(''));
      } else if (newPhase === 'phase3') {
        this.statusText.setText('失控核心暴走！第三阶段');
        this.time.delayedCall(1800, () => this.statusText.setText(''));
      }
    }
    switch (this.bossPhase) {
      case 'phase1': this.updateBossPhase1(time, delta); break;
      case 'phase2': this.updateBossPhase2(time, delta); break;
      case 'phase3': this.updateBossPhase3(time, delta); break;
    }
  }

  private updateBossPhase1(time: number, delta: number) {
    this.physics.moveToObject(this.boss!, this.player, CORE_ENEMY.speed);
    this.bossAttackTimer -= delta;
    if (this.bossAttackTimer <= 0) {
      this.bossAttackTimer = 2000;
      const angle = Phaser.Math.Angle.Between(this.boss!.x, this.boss!.y, this.player.x, this.player.y);
      this.fireBossBullet(this.boss!.x, this.boss!.y, angle, 180);
      this.fireBossBullet(this.boss!.x, this.boss!.y, angle - 0.26, 180);
      this.fireBossBullet(this.boss!.x, this.boss!.y, angle + 0.26, 180);
    }
  }

  private updateBossPhase2(time: number, delta: number) {
    this.physics.moveToObject(this.boss!, this.player, CORE_ENEMY.speed * 1.5);
    this.bossAttackTimer -= delta;
    if (this.bossAttackTimer <= 0) {
      this.bossAttackTimer = 3000;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        this.fireBossBullet(this.boss!.x, this.boss!.y, a, 150);
      }
    }
    this.bossSpawnTimer -= delta;
    if (this.bossSpawnTimer <= 0) {
      this.bossSpawnTimer = 8000;
      const driftBug = ENEMY_CONFIGS.find((e) => e.id === 'drift-bug')!;
      this.spawnEnemy(driftBug, this.boss!.x - 50, this.boss!.y + 30);
      this.spawnEnemy(driftBug, this.boss!.x + 50, this.boss!.y + 30);
    }
  }

  private updateBossPhase3(time: number, delta: number) {
    this.physics.moveToObject(this.boss!, this.player, CORE_ENEMY.speed * 2);
    this.bossAttackTimer -= delta;
    if (this.bossAttackTimer <= 0) {
      this.bossAttackTimer = 220;
      const angle = Phaser.Math.Angle.Between(this.boss!.x, this.boss!.y, this.player.x, this.player.y);
      this.fireBossBullet(this.boss!.x, this.boss!.y, angle + (Math.random() - 0.5) * 0.3, 220);
    }
  }

  private fireBossBullet(x: number, y: number, angle: number, speed: number) {
    const bullet = this.bossBullets.create(x, y, 'bossBullet') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    bullet.setCircle(6);
    bullet.setDepth(6);
    this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), speed, bullet.body!.velocity);
  }

  private handleBossBulletPlayer(_playerObject: unknown, bulletObject: unknown) {
    const bullet = bulletObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    bullet.destroy();
    if (this.time.now - this.lastDamageAt < 650) return;
    this.lastDamageAt = this.time.now;
    this.state = receiveDamage(this.state, 8);
    this.cameras.main.shake(80, 0.005);
    this.player.setTint(0xff4d6d);
    this.time.delayedCall(100, () => { if (this.player.active) this.player.clearTint(); });
    emitGameState(this.state);
  }

  private handleEnemyDecoy(_enemyObject: unknown, _decoyObject: unknown) {
    // decoys act as distraction targets; enemies use findNearestForEnemy
  }

  private updateDecoys(time: number, delta: number) {
    if (this.state.mirrorImages <= 0) return;
    this.decoySpawnTimer -= delta;
    const activeCount = this.decoys.children.size;
    if (this.decoySpawnTimer <= 0 && activeCount < this.state.mirrorImages) {
      this.decoySpawnTimer = 4000;
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 50;
      const decoy = this.decoys.create(
        this.player.x + Math.cos(angle) * dist,
        this.player.y + Math.sin(angle) * dist,
        'decoysprite',
      ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      decoy.setCircle(14);
      decoy.setAlpha(0.5);
      decoy.setDepth(3);
      this.time.delayedCall(6000, () => { if (decoy.active) decoy.destroy(); });
    }
  }
  private decoySpawnTimer = 0;

  private updateDamageZones(time: number) {
    for (let i = this.damageZones.length - 1; i >= 0; i--) {
      const zone = this.damageZones[i];
      if (time >= zone.expiresAt) {
        zone.graphics.destroy();
        this.damageZones.splice(i, 1);
        continue;
      }
      zone.graphics.setAlpha(0.2 * (1 - (time - (zone.expiresAt - 3000)) / 3000));
      const dps = this.state.logOverflow;
      if (dps <= 0) continue;
      this.enemies.children.each((child) => {
        const enemy = child as EnemySprite;
        if (!enemy.active) return true;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, zone.x, zone.y);
        if (dist <= zone.radius + (enemy.config.radius || 14)) {
          enemy.hp -= dps * (16 / 1000);
          this.flash(enemy);
          if (enemy.hp <= 0) this.defeatEnemy(enemy);
        }
        return true;
      });
    }
  }

  private updateDash(time: number, delta: number) {
    if (!this.state.dashEnabled) return;
    if (this.isDashing) {
      this.dashDuration -= delta;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.player.setAlpha(1);
        this.dashDirection = null;
      }
      return;
    }
    // double-tap detection is handled in movePlayer
  }

  private bulletSeq = 0;

  private tryShoot(time: number) {
    if (time - this.lastShotAt < this.state.fireRateMs) {
      return;
    }
    let angle: number;
    const pointer = this.input.activePointer;
    const inBounds = pointer.worldX > 0 && pointer.worldX < 960 && pointer.worldY > 0 && pointer.worldY < 640;
    const mouseActive = inBounds && (time - this.mouseMovedAt) < 2000;

    if (mouseActive) {
      angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.mouseWorldX, this.mouseWorldY);
    } else {
      const target = this.findNearestEnemy();
      if (!target) return;
      angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    }

    this.lastShotAt = time;
    soundManager.shoot();
    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet') as BulletSprite;
    bullet.damage = this.state.damage;
    bullet.pierceCount = this.state.piercingShots;
    bullet.splitDepth = 0;
    bullet.bulletId = this.bulletSeq++;
    bullet.setCircle(5);
    this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), this.state.bulletSpeed, bullet.body!.velocity);
  }

  private findNearestEnemy(): EnemySprite | undefined {
    let nearest: EnemySprite | undefined;
    let nearestDistance = Infinity;
    this.enemies.children.each((child) => {
      const enemy = child as EnemySprite;
      if (!enemy.active) {
        return true;
      }
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
      return true;
    });
    return nearest;
  }

  private trySpawnEnemy(time: number) {
    const interval = Math.max(460, 1400 - this.state.elapsedSeconds * 3);
    if (time - this.lastSpawnAt < interval) {
      return;
    }
    this.lastSpawnAt = time;
    const config = this.pickEnemyConfig();
    const side = Phaser.Math.Between(0, 3);
    const x = side === 0 ? -20 : side === 1 ? 980 : Phaser.Math.Between(40, 920);
    const y = side === 2 ? -20 : side === 3 ? 660 : Phaser.Math.Between(40, 600);
    this.spawnEnemy(config, x, y);
  }

  private tryReleaseCore(elapsedSeconds: number) {
    if (elapsedSeconds < CORE_RELEASE_SECONDS || this.boss?.active) {
      return;
    }
    const boss = this.spawnEnemy(CORE_ENEMY, 480, 90);
    this.boss = boss;
    soundManager.bossAppear();
    this.statusText.setText('失控核心已释放\n集中火力清理异常');
    this.time.delayedCall(1800, () => this.statusText.setText(''));
  }

  private pickEnemyConfig(): EnemyConfig {
    const totalWeight = ENEMY_CONFIGS.reduce((sum, enemy) => sum + enemy.spawnWeight, 0);
    let roll = Phaser.Math.Between(1, totalWeight);
    for (const enemy of ENEMY_CONFIGS) {
      roll -= enemy.spawnWeight;
      if (roll <= 0) {
        return enemy;
      }
    }
    return ENEMY_CONFIGS[0];
  }

  private spawnEnemy(config: EnemyConfig, x: number, y: number): EnemySprite {
    const enemy = this.enemies.create(x, y, config.id) as EnemySprite;
    enemy.config = config;
    enemy.hp = config.health;
    enemy.maxHp = config.health;
    enemy.dashTimer = 500 + Math.random() * 1500;
    enemy.isDashing = false;
    enemy.dashDuration = 0;
    enemy.poolDropTimer = 2000 + Math.random() * 1500;
    enemy.hitByIds = new Set();
    enemy.setCircle(config.radius);
    enemy.setDepth(config.behavior === 'core' ? 5 : 2);
    if (config.behavior === 'core') {
      enemy.setScale(1.2);
      this.tweens.add({
        targets: enemy,
        scale: { from: 1.1, to: 1.35 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    return enemy;
  }

  private handleBulletEnemy(bulletObject: unknown, enemyObject: unknown) {
    const bullet = bulletObject as BulletSprite;
    const enemy = enemyObject as EnemySprite;

    if (enemy.hitByIds.has(bullet.bulletId)) return;
    enemy.hitByIds.add(bullet.bulletId);

    enemy.hp -= bullet.damage;
    this.flash(enemy);
    soundManager.enemyHit();

    if (enemy.config.behavior === 'core') {
      this.cameras.main.shake(50, 0.003);
    }

    if (this.state.chainLightning > 0 && Phaser.Math.Between(0, 100) < 24 + this.state.chainLightning * 8) {
      this.zapNearby(enemy, bullet.damage * 0.45);
    }

    if (this.state.recursiveShots > 0 && bullet.splitDepth < this.state.recursiveShots) {
      const angle = Math.atan2(bullet.body!.velocity.y, bullet.body!.velocity.x);
      for (let i = 0; i < 2; i++) {
        const childAngle = angle + (i === 0 ? -1 : 1) * (0.35 + Math.random() * 0.5);
        const childBullet = this.bullets.create(enemy.x, enemy.y, 'bullet') as BulletSprite;
        childBullet.damage = bullet.damage * 0.55;
        childBullet.pierceCount = this.state.piercingShots;
        childBullet.splitDepth = bullet.splitDepth + 1;
        childBullet.bulletId = this.bulletSeq++;
        childBullet.setCircle(5);
        this.physics.velocityFromAngle(Phaser.Math.RadToDeg(childAngle), this.state.bulletSpeed * 0.8, childBullet.body!.velocity);
      }
    }

    bullet.pierceCount -= 1;
    if (bullet.pierceCount < 0) {
      bullet.destroy();
    }

    if (enemy.hp <= 0) {
      this.defeatEnemy(enemy);
    }
  }

  private zapNearby(origin: EnemySprite, damage: number) {
    const line = this.add.graphics();
    line.lineStyle(2, 0x8ef76e, 0.9);
    let zapped = 0;
    this.enemies.children.each((child) => {
      const target = child as EnemySprite;
      if (!target.active || target === origin || zapped >= this.state.chainLightning + 1) {
        return true;
      }
      const distance = Phaser.Math.Distance.Between(origin.x, origin.y, target.x, target.y);
      if (distance <= 150) {
        line.lineBetween(origin.x, origin.y, target.x, target.y);
        target.hp -= damage;
        this.flash(target);
        zapped += 1;
        if (target.hp <= 0) {
          this.defeatEnemy(target);
        }
      }
      return true;
    });
    this.time.delayedCall(80, () => line.destroy());
  }

  private defeatEnemy(enemy: EnemySprite) {
    const isCore = enemy.config.behavior === 'core';
    spawnDeathParticles(this, enemy.x, enemy.y, enemy.config.color, isCore ? 24 : 8);

    if (isCore) {
      this.state = updateCoreIntegrity(this.state, 0, enemy.maxHp);
      soundManager.bossDefeat();
      this.cameras.main.shake(300, 0.015);
      this.cameras.main.flash(300, 19, 226, 183);
    } else {
      const pickup = this.pickups.create(enemy.x, enemy.y, 'xp') as PickupSprite;
      pickup.experience = enemy.config.experience;
      pickup.setCircle(7);
      this.state = {
        ...this.state,
        enemiesDefeated: this.state.enemiesDefeated + 1,
      };
      if (this.state.logOverflow > 0) {
        const g = this.add.graphics();
        g.fillStyle(0x8ef76e, 0.18);
        g.fillCircle(0, 0, 36);
        g.setPosition(enemy.x, enemy.y);
        g.setDepth(1);
        this.damageZones.push({
          x: enemy.x,
          y: enemy.y,
          radius: 36,
          graphics: g,
          expiresAt: this.time.now + 3000,
        });
      }
    }
    enemy.destroy();

    if (this.state.status === 'upgrade') {
      soundManager.levelUp();
      const offer = this.createLevelUpOffer();
      emitLevelUp({ state: this.state, options: offer });
      emitGameState(this.state);
      this.scene.pause();
    }
  }

  private createLevelUpOffer(): UpgradeConfig[] {
    const available = UPGRADE_CONFIGS.filter((upgrade) => {
      if (this.state.activeUpgradeIds.includes(upgrade.id)) return false;
      if (upgrade.id === 'sandbox-reset' && this.state.deathSaveActive) return false;
      return true;
    });
    const shuffled = Phaser.Utils.Array.Shuffle([...available]);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  private handlePickup(_playerObject: unknown, pickupObject: unknown) {
    const pickup = pickupObject as PickupSprite;
    this.state = addExperience(this.state, pickup.experience);
    soundManager.pickupXp();
    pickup.destroy();
    if (this.state.status === 'upgrade') {
      soundManager.levelUp();
      const offer = this.createLevelUpOffer();
      emitLevelUp({ state: this.state, options: offer });
      emitGameState(this.state);
      this.scene.pause();
    }
  }

  private handlePlayerEnemy(_playerObject: unknown, enemyObject: unknown) {
    const enemy = enemyObject as EnemySprite;
    if (this.isDashing) return;
    if (this.time.now - this.lastDamageAt < 650) {
      return;
    }
    this.lastDamageAt = this.time.now;
    this.state = receiveDamage(this.state, enemy.config.damage);
    soundManager.playerHurt();
    this.cameras.main.shake(90, 0.006);
    this.player.setTint(0xff4d6d);
    this.time.delayedCall(100, () => { if (this.player.active) this.player.clearTint(); });

    if (this.state.status === 'lost' && this.state.deathSaveActive) {
      this.state = {
        ...this.state,
        health: Math.ceil(this.state.maxHealth * 0.5),
        status: 'running',
        deathSaveActive: false,
      };
      this.cameras.main.flash(400, 19, 226, 183);
      this.statusText.setText('沙箱重启已触发');
      this.time.delayedCall(1800, () => this.statusText.setText(''));
    }
    emitGameState(this.state);
  }

  private flash(target: Phaser.GameObjects.GameObject) {
    this.tweens.add({
      targets: target,
      alpha: 0.35,
      duration: 45,
      yoyo: true,
    });
  }

  private cleanupObjects() {
    this.bullets.children.each((child) => {
      const bullet = child as BulletSprite;
      if (bullet.x < -80 || bullet.x > 1040 || bullet.y < -80 || bullet.y > 720) {
        bullet.destroy();
      }
      return true;
    });
    this.bossBullets.children.each((child) => {
      const bullet = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (bullet.x < -80 || bullet.x > 1040 || bullet.y < -80 || bullet.y > 720) {
        bullet.destroy();
      }
      return true;
    });
  }

  private updateHud() {
    const remaining = Math.max(0, RUN_DURATION_SECONDS - this.state.elapsedSeconds);
    const coreText = this.boss?.active ? `核心完整度 ${this.state.coreIntegrity}%` : `核心释放 ${Math.max(0, CORE_RELEASE_SECONDS - this.state.elapsedSeconds)}s`;
    this.hudText.setText([
      `生命 ${this.state.health}/${this.state.maxHealth}  护盾 ${this.state.shield}`,
      `等级 ${this.state.level}  经验 ${this.state.experience}/${this.state.nextLevelExperience}`,
      `伤害 ${this.state.damage}  攻速 ${this.state.fireRateMs}ms`,
      `${coreText}  剩余 ${remaining}s`,
      `已清理 ${this.state.enemiesDefeated}`,
    ]);
  }

  private finishRun() {
    if (this.runFinished) {
      return;
    }
    this.runFinished = true;
    const won = this.state.status === 'won';
    this.statusText.setText(won ? '核心异常已清理\nDemo Run Complete' : '研究员离线\nRun Failed');
    this.physics.pause();
    this.bossBullets.children.each((child) => {
      (child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).destroy();
      return true;
    });
    this.decoys.children.each((child) => {
      (child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).destroy();
      return true;
    });
    emitRunEnded(this.state);
    emitGameState(this.state);
  }
}

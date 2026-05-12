import Phaser from 'phaser';
import { CORE_ENEMY, CORE_RELEASE_SECONDS, ENEMY_CONFIGS, RUN_DURATION_SECONDS, UPGRADE_CONFIGS } from './config';
import { emitGameState, emitLevelUp, emitRunEnded } from './events';
import {
  addExperience,
  applyUpgrade,
  createInitialGameState,
  receiveDamage,
  startRun,
  updateCoreIntegrity,
  updateElapsed,
} from './rules';
import type { EnemyConfig, GameState, UpgradeConfig } from './types';

type EnemySprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  config: EnemyConfig;
  hp: number;
  maxHp: number;
};

type BulletSprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  damage: number;
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
  private startedAt = 0;
  private boss?: EnemySprite;
  private statusText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private runFinished = false;

  constructor() {
    super('LabRogueliteScene');
  }

  create() {
    this.state = startRun(createInitialGameState());
    this.startedAt = this.time.now;
    this.lastShotAt = 0;
    this.lastSpawnAt = 0;
    this.lastDamageAt = 0;
    this.boss = undefined;
    this.runFinished = false;

    this.createTextures();
    this.drawLab();

    this.player = this.physics.add.sprite(480, 320, 'player');
    this.player.setCircle(16);
    this.player.setCollideWorldBounds(true);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickup, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemy, undefined, this);

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
    this.movePlayer();
    this.updateEnemies();
    this.tryShoot(time);
    this.trySpawnEnemy(time);
    this.tryReleaseCore(elapsedSeconds);
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

    if (delta > 0) {
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

  private movePlayer() {
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;
    const x = Number(right) - Number(left);
    const y = Number(down) - Number(up);
    const length = Math.hypot(x, y) || 1;
    this.player.setVelocity((x / length) * this.state.moveSpeed, (y / length) * this.state.moveSpeed);
  }

  private updateEnemies() {
    this.enemies.children.each((child) => {
      const enemy = child as EnemySprite;
      if (!enemy.active) {
        return true;
      }
      this.physics.moveToObject(enemy, this.player, enemy.config.speed);
      return true;
    });
  }

  private tryShoot(time: number) {
    if (time - this.lastShotAt < this.state.fireRateMs) {
      return;
    }
    const target = this.findNearestEnemy();
    if (!target) {
      return;
    }
    this.lastShotAt = time;
    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet') as BulletSprite;
    bullet.damage = this.state.damage;
    bullet.setCircle(5);
    this.physics.moveToObject(bullet, target, this.state.bulletSpeed);
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
    enemy.setCircle(config.radius);
    enemy.setDepth(config.behavior === 'core' ? 5 : 2);
    if (config.behavior === 'core') {
      enemy.setScale(1.2);
    }
    return enemy;
  }

  private handleBulletEnemy(bulletObject: unknown, enemyObject: unknown) {
    const bullet = bulletObject as BulletSprite;
    const enemy = enemyObject as EnemySprite;
    bullet.destroy();
    enemy.hp -= bullet.damage;
    this.flash(enemy);

    if (this.state.chainLightning > 0 && Phaser.Math.Between(0, 100) < 24 + this.state.chainLightning * 8) {
      this.zapNearby(enemy, bullet.damage * 0.45);
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
    if (enemy.config.behavior === 'core') {
      this.state = updateCoreIntegrity(this.state, 0, enemy.maxHp);
    } else {
      const pickup = this.pickups.create(enemy.x, enemy.y, 'xp') as PickupSprite;
      pickup.experience = enemy.config.experience;
      pickup.setCircle(7);
      this.state = {
        ...this.state,
        enemiesDefeated: this.state.enemiesDefeated + 1,
      };
    }
    enemy.destroy();

    if (this.state.status === 'upgrade') {
      const offer = this.createLevelUpOffer();
      emitLevelUp({ state: this.state, options: offer });
      emitGameState(this.state);
      this.scene.pause();
    }
  }

  private createLevelUpOffer(): UpgradeConfig[] {
    const shuffled = Phaser.Utils.Array.Shuffle([...UPGRADE_CONFIGS]);
    return shuffled.slice(0, 3);
  }

  private handlePickup(_playerObject: unknown, pickupObject: unknown) {
    const pickup = pickupObject as PickupSprite;
    this.state = addExperience(this.state, pickup.experience);
    pickup.destroy();
    if (this.state.status === 'upgrade') {
      const offer = this.createLevelUpOffer();
      emitLevelUp({ state: this.state, options: offer });
      emitGameState(this.state);
      this.scene.pause();
    }
  }

  private handlePlayerEnemy(_playerObject: unknown, enemyObject: unknown) {
    const enemy = enemyObject as EnemySprite;
    if (this.time.now - this.lastDamageAt < 650) {
      return;
    }
    this.lastDamageAt = this.time.now;
    this.state = receiveDamage(this.state, enemy.config.damage);
    this.cameras.main.shake(90, 0.006);
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
    emitRunEnded(this.state);
    emitGameState(this.state);
  }
}

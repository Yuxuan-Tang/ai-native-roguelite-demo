import Phaser from 'phaser';

export function spawnDeathParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count = 8,
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 40 + Math.random() * 80;
    const particle = scene.add.circle(x, y, 2 + Math.random() * 4, color, 0.9);
    particle.setDepth(10);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.2,
      duration: 300 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}

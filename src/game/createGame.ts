import Phaser from 'phaser';
import { LabRogueliteScene } from './LabRogueliteScene';

export function createLabGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: '#091018',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [LabRogueliteScene],
  });
}

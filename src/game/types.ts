export type GameStatus = 'ready' | 'running' | 'upgrade' | 'won' | 'lost';

export interface GameState {
  status: GameStatus;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  nextLevelExperience: number;
  elapsedSeconds: number;
  enemiesDefeated: number;
  coreIntegrity: number;
  activeUpgradeIds: string[];
  damage: number;
  fireRateMs: number;
  bulletSpeed: number;
  moveSpeed: number;
  shield: number;
  chainLightning: number;
  mirrorImages: number;
  recursiveShots: number;
  logOverflow: number;
  deathSaveActive: boolean;
  piercingShots: number;
  dashEnabled: boolean;
  dashCooldownMs: number;
}

export type EnemyBehavior = 'chaser' | 'sprinter' | 'tank' | 'core';

export type BossPhase = 'phase1' | 'phase2' | 'phase3';

export interface EnemyConfig {
  id: string;
  name: string;
  behavior: EnemyBehavior;
  health: number;
  speed: number;
  damage: number;
  experience: number;
  spawnWeight: number;
  color: number;
  radius: number;
}

export type UpgradeRarity = 'common' | 'rare' | 'prototype';

export interface UpgradeConfig {
  id: string;
  name: string;
  rarity: UpgradeRarity;
  description: string;
  apply: (state: GameState) => GameState;
}

export interface AgentDevLog {
  agent: 'Codex' | 'Claude Code' | 'Trae' | 'Human Owner';
  task: string;
  input: string;
  output: string;
  decision: string;
  result: string;
}

export interface LevelUpOffer {
  state: GameState;
  options: UpgradeConfig[];
}

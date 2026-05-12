import type { GameState, UpgradeConfig } from './types';

export function createInitialGameState(): GameState {
  return {
    status: 'ready',
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    nextLevelExperience: 36,
    elapsedSeconds: 0,
    enemiesDefeated: 0,
    coreIntegrity: 100,
    activeUpgradeIds: [],
    damage: 18,
    fireRateMs: 560,
    bulletSpeed: 420,
    moveSpeed: 210,
    shield: 0,
    chainLightning: 0,
    mirrorImages: 0,
    recursiveShots: 0,
    logOverflow: 0,
    deathSaveActive: false,
    piercingShots: 0,
    dashEnabled: false,
    dashCooldownMs: 0,
  };
}

export function getNextLevelExperience(level: number): number {
  return Math.round(32 + level * 12 + Math.pow(level, 1.35) * 8);
}

export function startRun(state: GameState): GameState {
  return { ...state, status: 'running', elapsedSeconds: 0 };
}

export function addExperience(state: GameState, amount: number): GameState {
  let next = { ...state, experience: state.experience + amount };
  while (next.experience >= next.nextLevelExperience) {
    next = {
      ...next,
      status: 'upgrade',
      experience: next.experience - next.nextLevelExperience,
      level: next.level + 1,
      nextLevelExperience: getNextLevelExperience(next.level + 1),
    };
  }
  return next;
}

export function applyUpgrade(state: GameState, upgrade: UpgradeConfig): GameState {
  return {
    ...upgrade.apply(state),
    status: 'running',
    activeUpgradeIds: [...state.activeUpgradeIds, upgrade.id],
  };
}

export function receiveDamage(state: GameState, amount: number): GameState {
  const shieldDamage = Math.min(state.shield, amount);
  const remainingDamage = amount - shieldDamage;
  const health = Math.max(0, state.health - remainingDamage);
  return {
    ...state,
    shield: Math.max(0, state.shield - shieldDamage),
    health,
    status: health <= 0 ? 'lost' : state.status,
  };
}

export function updateElapsed(state: GameState, elapsedSeconds: number): GameState {
  if (state.status !== 'running') {
    return state;
  }
  return {
    ...state,
    elapsedSeconds,
  };
}

export function updateCoreIntegrity(state: GameState, bossHealth: number, bossMaxHealth: number): GameState {
  const coreIntegrity = Math.max(0, Math.round((bossHealth / bossMaxHealth) * 100));
  return {
    ...state,
    coreIntegrity,
    status: coreIntegrity <= 0 ? 'won' : state.status,
  };
}

export function boostDamage(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    damage: state.damage + amount,
  });
}

export function boostFireRate(amountMs: number) {
  return (state: GameState): GameState => ({
    ...state,
    fireRateMs: Math.max(180, state.fireRateMs - amountMs),
  });
}

export function boostMoveSpeed(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    moveSpeed: state.moveSpeed + amount,
  });
}

export function addShield(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    shield: state.shield + amount,
  });
}

export function addMaxHealth(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    maxHealth: state.maxHealth + amount,
    health: Math.min(state.maxHealth + amount, state.health + amount),
  });
}

export function enableChainLightning(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    chainLightning: state.chainLightning + amount,
  });
}

export function enableMirrorImages(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    mirrorImages: state.mirrorImages + amount,
  });
}

export function enableRecursiveShots(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    recursiveShots: state.recursiveShots + amount,
  });
}

export function enableLogOverflow(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    logOverflow: state.logOverflow + amount,
  });
}

export function enableDeathSave() {
  return (state: GameState): GameState => ({
    ...state,
    deathSaveActive: true,
  });
}

export function enablePiercingShots(amount: number) {
  return (state: GameState): GameState => ({
    ...state,
    piercingShots: state.piercingShots + amount,
  });
}

export function enableEmergencyDash() {
  return (state: GameState): GameState => ({
    ...state,
    dashEnabled: true,
    dashCooldownMs: 1200,
  });
}

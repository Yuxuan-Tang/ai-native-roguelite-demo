import { describe, expect, it } from 'vitest';
import { UPGRADE_CONFIGS } from '../src/game/config';
import {
  addExperience,
  applyUpgrade,
  createInitialGameState,
  enableDeathSave,
  enableEmergencyDash,
  enableMirrorImages,
  enableLogOverflow,
  enablePiercingShots,
  enableRecursiveShots,
  receiveDamage,
  updateCoreIntegrity,
} from '../src/game/rules';

describe('roguelite rules', () => {
  it('levels up when enough experience is earned', () => {
    const state = addExperience(createInitialGameState(), 40);

    expect(state.status).toBe('upgrade');
    expect(state.level).toBe(2);
    expect(state.experience).toBe(4);
  });

  it('applies upgrades and returns to a running state', () => {
    const upgrade = UPGRADE_CONFIGS.find((item) => item.id === 'packet-burst')!;
    const state = applyUpgrade({ ...createInitialGameState(), status: 'upgrade' }, upgrade);

    expect(state.status).toBe('running');
    expect(state.damage).toBe(24);
    expect(state.activeUpgradeIds).toContain('packet-burst');
  });

  it('uses shield before health and loses at zero health', () => {
    const shielded = receiveDamage({ ...createInitialGameState(), shield: 10 }, 16);
    const defeated = receiveDamage({ ...createInitialGameState(), health: 8 }, 16);

    expect(shielded.shield).toBe(0);
    expect(shielded.health).toBe(94);
    expect(defeated.status).toBe('lost');
  });

  it('wins when core integrity reaches zero', () => {
    const state = updateCoreIntegrity({ ...createInitialGameState(), status: 'running' }, 0, 900);

    expect(state.coreIntegrity).toBe(0);
    expect(state.status).toBe('won');
  });

  it('initial state has all new fields with sensible defaults', () => {
    const state = createInitialGameState();
    expect(state.mirrorImages).toBe(0);
    expect(state.recursiveShots).toBe(0);
    expect(state.logOverflow).toBe(0);
    expect(state.deathSaveActive).toBe(false);
    expect(state.piercingShots).toBe(0);
    expect(state.dashEnabled).toBe(false);
    expect(state.dashCooldownMs).toBe(0);
  });

  it('new upgrade factories modify state correctly', () => {
    const base = createInitialGameState();

    const withImages = enableMirrorImages(2)(base);
    expect(withImages.mirrorImages).toBe(2);

    const withRecursive = enableRecursiveShots(2)(base);
    expect(withRecursive.recursiveShots).toBe(2);

    const withOverflow = enableLogOverflow(12)(base);
    expect(withOverflow.logOverflow).toBe(12);

    const withDeathSave = enableDeathSave()(base);
    expect(withDeathSave.deathSaveActive).toBe(true);

    const withPiercing = enablePiercingShots(2)(base);
    expect(withPiercing.piercingShots).toBe(2);

    const withDash = enableEmergencyDash()(base);
    expect(withDash.dashEnabled).toBe(true);
    expect(withDash.dashCooldownMs).toBe(1200);
  });

  it('applying new upgrades via applyUpgrade works end-to-end', () => {
    const dashUpgrade = UPGRADE_CONFIGS.find((u) => u.id === 'emergency-dash')!;
    const state = applyUpgrade({ ...createInitialGameState(), status: 'upgrade' }, dashUpgrade);

    expect(state.status).toBe('running');
    expect(state.dashEnabled).toBe(true);
    expect(state.activeUpgradeIds).toContain('emergency-dash');
  });
});

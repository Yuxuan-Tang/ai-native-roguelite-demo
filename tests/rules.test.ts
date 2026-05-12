import { describe, expect, it } from 'vitest';
import { UPGRADE_CONFIGS } from '../src/game/config';
import {
  addExperience,
  applyUpgrade,
  createInitialGameState,
  receiveDamage,
  recordEnemyDefeat,
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

  it('records enemy defeats and rewards experience', () => {
    const state = recordEnemyDefeat(createInitialGameState(), 9);

    expect(state.enemiesDefeated).toBe(1);
    expect(state.experience).toBe(9);
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
});

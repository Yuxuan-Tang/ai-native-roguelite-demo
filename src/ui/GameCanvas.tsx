import { RotateCcw, Shield, Sparkles } from 'lucide-react';
import Phaser from 'phaser';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createLabGame } from '../game/createGame';
import { GAME_EVENTS } from '../game/events';
import { createInitialGameState } from '../game/rules';
import type { GameState, LevelUpOffer, UpgradeConfig } from '../game/types';

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [state, setState] = useState<GameState>(createInitialGameState());
  const [offer, setOffer] = useState<LevelUpOffer | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }
    gameRef.current = createLabGame(hostRef.current);

    const onState = (event: Event) => {
      setState((event as CustomEvent<GameState>).detail);
    };
    const onLevelUp = (event: Event) => {
      setOffer((event as CustomEvent<LevelUpOffer>).detail);
    };
    window.addEventListener(GAME_EVENTS.state, onState);
    window.addEventListener(GAME_EVENTS.levelUp, onLevelUp);

    return () => {
      window.removeEventListener(GAME_EVENTS.state, onState);
      window.removeEventListener(GAME_EVENTS.levelUp, onLevelUp);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const restart = () => {
    setOffer(null);
    const scene = gameRef.current?.scene.getScene('LabRogueliteScene');
    scene?.scene.restart();
  };

  const chooseUpgrade = (upgrade: UpgradeConfig) => {
    const scene = gameRef.current?.scene.getScene('LabRogueliteScene') as { applyUpgrade?: (upgrade: UpgradeConfig) => void } | undefined;
    scene?.applyUpgrade?.(upgrade);
    setOffer(null);
  };

  return (
    <section className="play-surface" aria-label="AI实验室异常清理游戏区域">
      <div className="game-toolbar">
        <div>
          <p className="eyebrow">AI Lab Roguelite</p>
          <h1>异常清理 Run</h1>
        </div>
        <div className="toolbar-actions">
          <span className={`status-pill status-${state.status}`}>{state.status.toUpperCase()}</span>
          <button type="button" className="icon-button" onClick={restart} aria-label="重新开始">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="game-shell">
        <div ref={hostRef} className="game-host" data-testid="game-host" />
        {offer && (
          <div className="upgrade-overlay" role="dialog" aria-label="选择升级">
            <div className="upgrade-panel">
              <div className="upgrade-title">
                <Sparkles size={20} />
                <span>选择一次研究突破</span>
              </div>
              <div className="upgrade-grid">
                {offer.options.map((upgrade) => (
                  <button type="button" key={upgrade.id} className={`upgrade-card rarity-${upgrade.rarity}`} onClick={() => chooseUpgrade(upgrade)}>
                    <span>{upgrade.name}</span>
                    <small>{upgrade.description}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stat-strip">
        <Stat label="生命" value={`${state.health}/${state.maxHealth}`} />
        <Stat label="等级" value={String(state.level)} />
        <Stat label="核心" value={`${state.coreIntegrity}%`} />
        <Stat label="清理" value={String(state.enemiesDefeated)} />
        <Stat label="护盾" value={`${state.shield}`} icon={<Shield size={15} />} />
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="stat-cell">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

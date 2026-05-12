import type { GameState, LevelUpOffer } from './types';

export const GAME_EVENTS = {
  state: 'lab:state',
  levelUp: 'lab:level-up',
  runEnded: 'lab:run-ended',
} as const;

export type GameEventMap = {
  [GAME_EVENTS.state]: CustomEvent<GameState>;
  [GAME_EVENTS.levelUp]: CustomEvent<LevelUpOffer>;
  [GAME_EVENTS.runEnded]: CustomEvent<GameState>;
};

export function emitGameState(state: GameState) {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.state, { detail: state }));
}

export function emitLevelUp(offer: LevelUpOffer) {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.levelUp, { detail: offer }));
}

export function emitRunEnded(state: GameState) {
  window.dispatchEvent(new CustomEvent(GAME_EVENTS.runEnded, { detail: state }));
}

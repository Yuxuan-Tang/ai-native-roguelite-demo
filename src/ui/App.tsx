import { GameCanvas } from './GameCanvas';
import { Workbench } from './Workbench';

export function App() {
  return (
    <main className="app-shell">
      <GameCanvas />
      <Workbench />
    </main>
  );
}

# AI-Native Roguelite Lab Agent Guide

## Project Overview

`AI-Native Roguelite Lab` is a browser-based 2D top-down lightweight roguelite demo for a game AI operations and research role. The player acts as a lab debugger, clears abnormal programs, collects energy, chooses upgrades, and eventually cleans up a rogue core.

The project is meant to show two things at the same time:

- A playable game prototype built with a small, inspectable engineering surface.
- A Multi-Agent game development workflow where Codex, Claude Code, Trae, and the human owner collaborate through explicit roles, logs, tests, and reviewable decisions.

First-version constraints:

- Do not depend on a real LLM API in the main demo path.
- Prioritize stable interview demonstration over large content scope.
- Keep rules testable outside Phaser whenever practical.

## Tech Stack

- Vite + React + TypeScript for the browser app shell.
- Phaser 3 for realtime 2D gameplay.
- Vitest for pure TypeScript rule tests.
- Playwright for browser smoke tests.
- Lucide React for UI icons.

## Commands

Run from the repository root:

```bash
npm install
npm run dev
npm run test
npm run build
npm run test:e2e
```

Command intent:

- `npm run dev`: start the local Vite dev server on `127.0.0.1`.
- `npm run test`: run Vitest rule tests using `vitest.config.ts`.
- `npm run build`: run TypeScript project checks and produce a production build.
- `npm run test:e2e`: run Playwright smoke tests through `playwright.config.ts`.

Do not commit generated or dependency folders such as `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `coverage/`, or `*.tsbuildinfo`.

## Architecture

The app is split into gameplay, UI, tests, and process evidence:

- `src/game/`: Phaser scene, game config, pure rules, shared types, and browser event bridge.
- `src/ui/`: React app shell, Phaser host component, status strips, upgrade overlay, and AI-Native workbench.
- `tests/`: Vitest rule coverage and Playwright browser smoke test.
- `dev-log/`: project decisions, implementation notes, and review follow-ups.
- `README.md`: public-facing project summary and run instructions.

Important files:

- `src/game/types.ts`: source of truth for `GameState`, `EnemyConfig`, `UpgradeConfig`, and `AgentDevLog`.
- `src/game/config.ts`: run duration, enemy configs, upgrade configs, and workbench agent logs.
- `src/game/rules.ts`: pure gameplay rules for state creation, experience, upgrades, damage, and win/loss conditions.
- `src/game/LabRogueliteScene.ts`: realtime Phaser implementation for movement, spawning, shooting, pickups, level-up pause, and core release.
- `src/game/events.ts`: browser `CustomEvent` bridge between Phaser and React.
- `src/ui/GameCanvas.tsx`: owns Phaser lifecycle and React upgrade selection UI.
- `src/ui/Workbench.tsx`: presents the Multi-Agent workflow evidence inside the demo.

## Gameplay Rules And Data Flow

- `GameState` is the central runtime state shared between rules, Phaser, and React.
- Prefer placing deterministic state transforms in `src/game/rules.ts` so they can be unit tested.
- Phaser owns realtime entities and emits state changes with `GAME_EVENTS`.
- React listens for `GAME_EVENTS.state` and `GAME_EVENTS.levelUp`, then renders status UI and upgrade choices.
- The current Phaser scene separates enemy defeat counting from experience pickup:
  - Defeating a normal enemy increments `enemiesDefeated` and creates an XP pickup.
  - Collecting the XP pickup calls `addExperience`.
  - Avoid reintroducing double-counting by calling `recordEnemyDefeat` from the pickup path.
- The rogue core is released after `CORE_RELEASE_SECONDS`; defeating it drives `coreIntegrity` to zero and sets status to `won`.
- When status becomes `won` or `lost`, `finishRun` is guarded by `runFinished` so end events are not emitted every frame.

## Testing Expectations

Before committing implementation changes, run:

```bash
npm run test
npm run build
```

Run `npm run test:e2e` when changes affect app startup, React/Phaser integration, keyboard input, or visible UI.

Test coverage currently focuses on:

- Level-up thresholds and upgrade application.
- Enemy defeat reward accounting.
- Shield-before-health damage handling.
- Core defeat win condition.
- Browser startup smoke test and workbench rendering.

## Multi-Agent Collaboration Protocol

## Goal

Use multiple AI Agent tools to complete a runnable, testable, reviewable game demo. The human owner keeps product judgment and final acceptance authority; AI Agents accelerate implementation, review, and focused iteration.

## Roles

| Agent | Responsibility | Output |
| --- | --- | --- |
| Human Owner | Define job target, control scope, make final tradeoffs | Requirement boundaries, acceptance criteria, application narrative |
| Codex | Main engineering implementation, code edits, tests, docs | Runnable project, tests, README, commits |
| Claude Code | Architecture review, complex logic review, UX and narrative critique | Review findings, risk list, improvement suggestions |
| Trae | IDE-local iteration, UI details, game feel tuning | Small patches, interaction polish, visual fixes |

## Working Rules

- Every Agent task must state input, expected output, and affected areas before work begins.
- Core logic changes should include tests or a manual verification note.
- UI and gameplay changes should preserve stable interview demonstration.
- Do not add external services or real model API dependencies to the main path without an explicit owner decision.
- If Agents disagree, the Human Owner decides and records the tradeoff in `dev-log/`.
- Keep Multi-Agent value visible through docs, tests, logs, and workbench evidence, not just claims.

## Handoff Template

```md
## Task

## Context

## Files or Areas

## Expected Output

## Verification

## Notes for Human Owner
```

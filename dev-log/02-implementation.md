# Dev Log 02: Implementation

## Task

实现 AI 实验室异常清理 demo 的第一版。

## Agent Split

- Codex：搭建 Vite + React + Phaser 项目，完成主实现、测试和文档。
- Claude Code：建议保持规则模块独立，方便审查和测试。
- Trae：适合后续针对 UI 细节、手感和响应式布局做局部迭代。
- Human Owner：决定题材、战斗形式和第一版是否接真实 API。

## Implementation Notes

- `src/game/rules.ts` 放置升级、经验、伤害和胜负规则。
- `src/game/LabRogueliteScene.ts` 负责实时移动、敌人生成、射击、拾取和 Boss。
- `src/ui/Workbench.tsx` 把多 Agent 协作证据前置展示。

## Verification

核心规则使用 Vitest 测试；页面启动和基本渲染使用 Playwright 冒烟测试。

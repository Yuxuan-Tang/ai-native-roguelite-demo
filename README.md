# AI-Native Roguelite Lab

一个面向游戏 AI 运用研究岗位的网页 2D 实时俯视角轻量肉鸽 demo。玩家扮演实验室调试员，清理不断涌现的异常程序，升级武器模块，并在短局末尾击败失控核心。

这个项目的重点不是堆内容量，而是验证一套可复盘的 AI-Native 游戏研发流程：用 Codex、Claude Code、Trae 等多个 AI Agent 工具协作完成需求拆解、实现、评审、测试和迭代。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址后即可试玩。WASD 或方向键移动，角色会自动瞄准最近的异常程序开火。升级时点击卡片选择研究突破。

## 岗位匹配点

- **AI-Native 工作流**：项目用 `AGENTS.md` 固化多 Agent 职责，用 `dev-log/` 记录关键取舍。
- **游戏研发落地**：Phaser 负责实时玩法，React 负责工作台和状态展示。
- **工程可验证**：核心规则在纯 TypeScript 模块中实现，并配有 Vitest 单元测试与 Playwright 冒烟测试。
- **演示稳定**：第一版不依赖真实大模型 API，避免面试现场出现 Key、网络或费用问题。

## 脚本

```bash
npm run dev       # 启动开发服务器
npm run build     # TypeScript 检查并构建
npm run test      # 运行核心规则测试
npm run test:e2e  # 运行 Playwright 冒烟测试
```

## 项目结构

- `src/game/`：Phaser 场景、游戏配置、核心规则和事件桥接。
- `src/ui/`：React 页面、游戏容器和 AI-Native 研发工作台。
- `tests/`：规则测试与端到端冒烟测试。
- `AGENTS.md`：Codex、Claude Code、Trae、人类 Owner 的协作协议。
- `dev-log/`：需求、实现、评审、修复等过程记录。

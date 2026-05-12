# Multi-Agent Collaboration Protocol

## Goal

用多个 AI Agent 工具协作完成一个可运行、可测试、可复盘的游戏 demo。人类 Owner 保留产品判断和最终验收权，AI Agent 负责加速实现、评审和局部迭代。

## Roles

| Agent | Responsibility | Output |
| --- | --- | --- |
| Human Owner | 定义岗位目标、控制范围、做最终取舍 | 需求边界、验收标准、投递叙事 |
| Codex | 主工程实现、读写代码、运行测试、整理文档 | 可运行项目、测试、README |
| Claude Code | 架构评审、复杂逻辑审查、体验和叙事建议 | Review 结论、风险清单、改进建议 |
| Trae | IDE 内局部迭代、UI 细节、手感调优 | 小范围补丁、交互优化、视觉修正 |

## Working Rules

- 每个 Agent 接任务前必须明确输入、期望输出和影响范围。
- 对核心逻辑的修改需要配套测试或手动验收记录。
- UI 和玩法改动优先保证面试演示稳定，不引入不可控外部服务。
- 发生冲突时由 Human Owner 决策，保留取舍原因到 `dev-log/`。
- 第一版不接真实 LLM API，多 Agent 价值通过研发流程和证据链体现。

## Handoff Template

```md
## Task

## Context

## Files or Areas

## Expected Output

## Verification

## Notes for Human Owner
```

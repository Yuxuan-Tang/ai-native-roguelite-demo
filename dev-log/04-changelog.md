# Dev Log 04: 全维度优化 Changelog

## 日期

2026-05-12

## 优化背景

在一轮完整代码审查后，识别出 demo 在玩法深度、战斗表现、音效反馈、升级多样性和面试展示效果等方面存在可优化空间。本轮改动由 Claude Code 主导实施，覆盖了全部建议项。

## 改动清单

### Phase A: 代码清理

- **删除未使用的 `recordEnemyDefeat`**：该纯函数在 `rules.ts` 中定义但场景从未调用（场景手动分离了击败计数和经验拾取逻辑），现予删除并移除对应测试。
- **状态事件节流**：`emitGameState()` 从每帧调用（60fps）降为每 100ms 一次（10fps），减少 React 不必要的重渲染。

### Phase B: 敌人行为差异化 + Boss 战重做

- **Sprinter（延迟尖刺）**：间歇性向玩家冲刺（2.5x 速度，380ms），冲刺时高亮闪烁白光，冷却 1.5-2.5s。
- **Tank（内存泄漏体）**：慢速追击，每 2-3.5s 掉落紫色减速池（持续 4s，玩家进入后半速移动）。
- **Boss 三阶段战斗**：
  - Phase 1（100%-60% HP）：慢速追踪 + 每 2s 散射 3 发弹幕
  - Phase 2（60%-30% HP）：1.5x 加速 + 每 3s 圆形 8 向弹幕 + 每 8s 召唤 2 只漂移 Bug
  - Phase 3（30%-0% HP）：2x 暴走 + 每 220ms 连续射击
  - Boss 弹幕（红色圆形弹）会对玩家造成伤害
  - 阶段切换时显示提示文字
  - Boss 击杀：大型粒子爆发 + 相机震动 + 青色闪光

### Phase C: 升级池扩充（6 → 12）

新增 6 个机制型升级：

| ID | 名称 | 稀有度 | 效果 |
|----|------|--------|------|
| mirror-image | 分身镜像 | rare | 周期性生成 2 个诱饵分散敌人 |
| recursive-warhead | 递归弹头 | prototype | 子弹命中后分裂为 2 发，可连锁 |
| log-overflow | 溢出日志 | common | 击败敌人留下持续伤害区域（12 dps） |
| sandbox-reset | 沙箱重启 | rare | 一次性免死，血量归零时回复 50% |
| infiltration-protocol | 渗透协议 | prototype | 子弹穿透最多 2 个敌人 |
| emergency-dash | 应急冲刺 | common | 双击方向键冲刺，期间无敌（1.2s CD） |

GameState 新增 7 个字段，`createLevelUpOffer()` 自动过滤已持有升级。

### Phase D: 音效 + 视觉

- **SoundManager**（新建，~90 行）：Web Audio API 程序化合成，无外部依赖。8 种音效：射击、命中、拾取经验、升级、玩家受伤、Boss 出场、Boss 击杀、冲刺。
- **effects.ts**（新建）：`spawnDeathParticles()` 死亡粒子爆发函数。
- **玩家受伤红色闪烁**（100ms tint `0xff4d6d`）。
- **Boss 脉冲呼吸**：`setScale` 在 1.1-1.35 之间循环 tween。
- **升级卡片 shimmer 动画**：CSS `@keyframes` 渐变流光，3.5s 循环。

### Phase E: 鼠标瞄准

- 追踪 `pointermove` 事件获取鼠标画布坐标。
- 鼠标在画布内且 2s 内有移动 → 子弹飞向光标方向。
- 鼠标出界或静止超时 → fallback 自动索敌。
- 统一子弹移动为 `velocityFromAngle` 直线飞行（替换原有的 `moveToObject` 追踪模式）。

### Phase F: 部署 + 测试

- `vite.config.ts`：添加 `base: '/ai-native-roguelite-demo/'` 以支持 GitHub Pages。
- `package.json`：添加 `npm run deploy` 脚本（构建 + gh-pages 部署）。
- `.github/workflows/deploy.yml`：CI 自动部署（push main → 构建 → 部署到 gh-pages 分支）。
- `README.md`：新增部署说明。
- 单元测试从 4 个增至 7 个：新增初始值验证、新升级工厂函数测试、端到端升级应用测试。
- TypeScript 编译零错误，生产构建成功。

## 统计

- 修改文件：9 个
- 新建文件：4 个（SoundManager.ts, effects.ts, deploy.yml, 本 changelog）
- 新增代码：约 600 行
- 新增测试：3 个
- 升级总数：6 → 12
- 敌人行为：1 种（追踪） → 3 种（追踪 / 冲刺 / 坦克）

## 验证

```bash
npm run test     # 7/7 通过
npm run build    # 零错误，1589 模块，7s 构建
npm run dev      # Vite 开发服务器正常启动
```

import type { AgentDevLog, EnemyConfig, UpgradeConfig } from './types';
import {
  addMaxHealth,
  addShield,
  boostDamage,
  boostFireRate,
  boostMoveSpeed,
  enableChainLightning,
} from './rules';

export const RUN_DURATION_SECONDS = 300;
export const CORE_RELEASE_SECONDS = 240;

export const ENEMY_CONFIGS: EnemyConfig[] = [
  {
    id: 'drift-bug',
    name: '漂移 Bug',
    behavior: 'chaser',
    health: 28,
    speed: 72,
    damage: 8,
    experience: 9,
    spawnWeight: 55,
    color: 0xff4d6d,
    radius: 14,
  },
  {
    id: 'latency-spike',
    name: '延迟尖刺',
    behavior: 'sprinter',
    health: 18,
    speed: 118,
    damage: 6,
    experience: 11,
    spawnWeight: 35,
    color: 0xffc247,
    radius: 11,
  },
  {
    id: 'memory-leak',
    name: '内存泄漏体',
    behavior: 'tank',
    health: 76,
    speed: 44,
    damage: 14,
    experience: 24,
    spawnWeight: 10,
    color: 0x7b61ff,
    radius: 21,
  },
];

export const CORE_ENEMY: EnemyConfig = {
  id: 'rogue-core',
  name: '失控核心',
  behavior: 'core',
  health: 900,
  speed: 34,
  damage: 20,
  experience: 120,
  spawnWeight: 0,
  color: 0x13e2b7,
  radius: 34,
};

export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  {
    id: 'packet-burst',
    name: '数据脉冲',
    rarity: 'common',
    description: '伤害 +6，清理异常更快。',
    apply: boostDamage(6),
  },
  {
    id: 'quick-compile',
    name: '快速编译',
    rarity: 'common',
    description: '攻击间隔减少 90ms。',
    apply: boostFireRate(90),
  },
  {
    id: 'runtime-boots',
    name: '运行时靴子',
    rarity: 'common',
    description: '移动速度 +28。',
    apply: boostMoveSpeed(28),
  },
  {
    id: 'sandbox-shield',
    name: '沙箱护盾',
    rarity: 'rare',
    description: '获得 26 点可再生护盾。',
    apply: addShield(26),
  },
  {
    id: 'health-patch',
    name: '热修复补丁',
    rarity: 'rare',
    description: '生命上限 +24，并回复同等生命。',
    apply: addMaxHealth(24),
  },
  {
    id: 'chain-debugger',
    name: '链式调试器',
    rarity: 'prototype',
    description: '子弹命中后有机会向附近异常放电。',
    apply: enableChainLightning(1),
  },
];

export const AGENT_DEV_LOGS: AgentDevLog[] = [
  {
    agent: 'Human Owner',
    task: '定义岗位匹配目标',
    input: '招聘岗位强调 AI-Native 工作流、Multi-Agent 协作和游戏研发落地。',
    output: '确定用小型肉鸽展示游戏研发能力，用文档和面板展示多 Agent 流程。',
    decision: '优先做可运行闭环，不把时间消耗在真实 API 和复杂美术上。',
    result: '范围收敛为 2D 实时俯视角实验室异常清理。',
  },
  {
    agent: 'Codex',
    task: '主工程实现',
    input: 'React + Phaser + TypeScript 技术栈，要求规则可测试。',
    output: '搭建项目、实现游戏场景、规则模块、测试和文档。',
    decision: '把升级、经验、胜负条件放到纯 TS 模块，降低 Phaser 场景复杂度。',
    result: '得到可运行 demo 和可维护的核心规则。',
  },
  {
    agent: 'Claude Code',
    task: '架构与体验评审',
    input: '检查玩法闭环、代码边界、文档表达和面试叙事。',
    output: '建议强化“AI 研发工作台”和多 Agent 证据链。',
    decision: '用 dev-log 固化关键取舍，避免只说“用了 AI”。',
    result: '作品更像研究工程师样品。',
  },
  {
    agent: 'Trae',
    task: '局部交互迭代',
    input: '针对 UI、手感和视觉反馈做快速改动。',
    output: '优化开始按钮、状态面板、升级卡片和移动/攻击反馈。',
    decision: '把第一屏做成实际工作台，不做营销式落地页。',
    result: '面试官打开后能立刻试玩并理解项目价值。',
  },
];

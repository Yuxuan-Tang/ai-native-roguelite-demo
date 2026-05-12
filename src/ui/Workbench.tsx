import { Bot, BrainCircuit, ClipboardCheck, GitBranch, Hammer, UserRound } from 'lucide-react';
import { AGENT_DEV_LOGS } from '../game/config';

const agentIcons = {
  Codex: Hammer,
  'Claude Code': BrainCircuit,
  Trae: Bot,
  'Human Owner': UserRound,
};

export function Workbench() {
  return (
    <aside className="workbench" aria-label="AI-Native研发工作台">
      <div className="workbench-section">
        <p className="eyebrow">Multi-Agent Workflow</p>
        <h2>研发工作台</h2>
        <p className="panel-copy">
          这个 demo 把 AI 工具当成研发系统的一部分：人类负责目标和取舍，多个代码 Agent 分别承担实现、评审和局部迭代。
        </p>
      </div>

      <div className="agent-stack">
        {AGENT_DEV_LOGS.map((log) => {
          const Icon = agentIcons[log.agent];
          return (
            <article className="agent-card" key={`${log.agent}-${log.task}`}>
              <div className="agent-heading">
                <span className="agent-icon">
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{log.agent}</strong>
                  <small>{log.task}</small>
                </div>
              </div>
              <p>{log.result}</p>
            </article>
          );
        })}
      </div>

      <div className="workbench-section compact">
        <div className="check-heading">
          <ClipboardCheck size={18} />
          <h3>投递时可展示</h3>
        </div>
        <ul className="evidence-list">
          <li>可玩的一局肉鸽闭环</li>
          <li>规则模块和自动化测试</li>
          <li>AGENTS.md 协作协议</li>
          <li>dev-log 研发复盘材料</li>
        </ul>
      </div>

      <div className="workbench-section compact">
        <div className="check-heading">
          <GitBranch size={18} />
          <h3>当前设计取舍</h3>
        </div>
        <p className="panel-copy">
          第一版不接真实模型 API，确保演示稳定；AI 价值通过协作分工、工程证据和可复盘过程体现。
        </p>
      </div>
    </aside>
  );
}

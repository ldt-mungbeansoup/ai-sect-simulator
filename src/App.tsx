import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { calculateDivineSenseCost, countDecreeChars, MAX_DECREE_CHARS, trimDecreeToMaxChars } from "./domain/decreeCost";
import { SAMPLE_DECREES } from "./domain/initialState";
import { rateSect } from "./domain/rating";
import type { AnnualReport, NumericDelta, SectState } from "./domain/types";
import { fetchNewGame, submitTurn } from "./services/apiClient";
import { clearSavedState, loadSavedState, saveState } from "./services/saveStore";

type ViewId = "dashboard" | "disciples" | "facilities" | "finance" | "chronicle" | "decree" | "omens";

interface ReportEntry {
  year: number;
  report: AnnualReport;
}

interface DashboardCardProps {
  id: Exclude<ViewId, "dashboard">;
  title: string;
  seal: string;
  artifact: string;
  summary: Array<[string, string | number]>;
  onOpen: (view: ViewId) => void;
}

interface RepresentativeDisciple {
  name: string;
  root: string;
  realm: string;
  trait: string;
  loyalty: number;
}

const REPORT_ARCHIVE_KEY = "sect-simulator-report-archive-v1";
const ONBOARDING_SEEN_KEY = "sect-simulator-onboarding-seen-v1";

const ONBOARDING_STEPS = [
  {
    title: "执事传音",
    body: "宗主已闭死关突破，只能以神念传下谕令。距宗门大考尚余十年，请在十年内整顿山门，争取更高评级。"
  },
  {
    title: "一年一令",
    body: "每年只能传下一条谕令。谕令会消耗神念，字数越多消耗越高；执事长老会拆解谕令，诸堂据此结算本年变化。"
  },
  {
    title: "先定方向",
    body: "当前宗门尚稳，灵石略有余裕。可先选择一个方向：稳住弟子、开源聚财、修缮山门，或低调避世。"
  }
];

const ONBOARDING_DECREES = [
  "稳住弟子心气，讲道安抚门人。",
  "重开商路，售卖丹药，补足库房灵石。",
  "修缮山门阵法，戒备外患。"
];

const FACILITY_LEVEL_LABELS = ["未建", "初立", "完备", "鼎盛"];

const viewMeta: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: { title: "宗门卷轴", subtitle: "卷上六令，皆系宗门兴衰。" },
  disciples: { title: "弟子堂", subtitle: "观弟子根骨、修为、士气与忠诚。" },
  facilities: { title: "宗门设施", subtitle: "查山门诸院等级、作用与维护压力。" },
  finance: { title: "灵石账房", subtitle: "看库藏、收支、净益与破产风险。" },
  chronicle: { title: "宗门史书", subtitle: "汇总过往年报，回看宗门路线。" },
  decree: { title: "传音谕令", subtitle: "阅上一年卷宗，向执事长老传下本年谕令。" },
  omens: { title: "天机外务", subtitle: "察声望、气运、威胁与外部态势。" }
};

function loadReportArchive(): ReportEntry[] {
  const raw = localStorage.getItem(REPORT_ARCHIVE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ReportEntry[];
  } catch {
    localStorage.removeItem(REPORT_ARCHIVE_KEY);
    return [];
  }
}

function saveReportArchive(entries: ReportEntry[]) {
  localStorage.setItem(REPORT_ARCHIVE_KEY, JSON.stringify(entries));
}

function clearReportArchive() {
  localStorage.removeItem(REPORT_ARCHIVE_KEY);
}

function hasSeenOnboarding() {
  return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true";
}

function markOnboardingSeen() {
  localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}

function DeltaList({ deltas, limit = 8 }: { deltas: NumericDelta[]; limit?: number }) {
  if (deltas.length === 0) return <p className="muted">本年数值未见明显波动。</p>;

  return (
    <ul className="delta-list">
      {deltas.slice(0, limit).map((delta) => (
        <li key={delta.path} className={delta.change >= 0 ? "positive" : "negative"}>
          <span>{delta.label}</span>
          <strong>{delta.change > 0 ? `+${delta.change}` : delta.change}</strong>
        </li>
      ))}
    </ul>
  );
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function deltaTone(delta?: NumericDelta) {
  if (!delta || delta.change === 0) return "neutral";
  return delta.change > 0 ? "positive" : "negative";
}

function isRiskDelta(delta: NumericDelta) {
  return (delta.path === "influence.threat" && delta.change > 0) ||
    (delta.path === "finance.yearlyExpense" && delta.change > 0);
}

function isBenefitDelta(delta: NumericDelta) {
  if (delta.path === "influence.threat" || delta.path === "finance.yearlyExpense") {
    return delta.change < 0;
  }
  return delta.change > 0;
}

function consequenceTone(delta: NumericDelta) {
  if (isRiskDelta(delta)) return "risk";
  return isBenefitDelta(delta) ? "benefit" : "cost";
}

function consequenceImpact(delta: NumericDelta) {
  const value = Math.abs(delta.change);
  if (delta.path === "finance.spiritStones") return value / 24;
  if (delta.path.startsWith("finance.")) return value / 8;
  if (delta.path.startsWith("facilities.")) return value * 16;
  if (delta.path === "disciples.total") return value * 4;
  if (delta.path === "disciples.elite") return value * 8;
  if (delta.path === "influence.threat") return value * 2;
  return value;
}

function describeConsequence(delta: NumericDelta) {
  if (delta.path === "influence.threat" && delta.change > 0) return "风险上升";
  if (delta.path === "influence.threat" && delta.change < 0) return "外患缓和";
  if (delta.path === "finance.yearlyExpense" && delta.change > 0) return "供养压力增加";
  if (delta.path === "finance.yearlyExpense" && delta.change < 0) return "支出压力下降";
  if (delta.path === "finance.spiritStones" && delta.change < 0) return "库存消耗";
  if (delta.path === "finance.spiritStones" && delta.change > 0) return "库存增加";
  return delta.change > 0 ? "有所提升" : "有所下降";
}

function KeyConsequences({ deltas }: { deltas: NumericDelta[] }) {
  const importantDeltas = deltas
    .filter((delta) => delta.path !== "divineSense")
    .slice()
    .sort((a, b) => consequenceImpact(b) - consequenceImpact(a))
    .slice(0, 3);
  const groups = [
    { key: "benefit", title: "收益", items: importantDeltas.filter((delta) => consequenceTone(delta) === "benefit") },
    { key: "cost", title: "代价", items: importantDeltas.filter((delta) => consequenceTone(delta) === "cost") },
    { key: "risk", title: "风险", items: importantDeltas.filter((delta) => consequenceTone(delta) === "risk") }
  ];

  if (importantDeltas.length === 0) return <p className="muted">除神念外，本年数值未见明显波动。</p>;

  return (
    <div className="consequence-groups">
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <section className={`consequence-group ${group.key}`} key={group.key}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map((delta) => (
              <li key={delta.path}>
                <span>{delta.label}</span>
                <strong>{formatSigned(delta.change)}</strong>
                <small>{describeConsequence(delta)}</small>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function findDelta(deltas: NumericDelta[], path: string) {
  return deltas.find((delta) => delta.path === path);
}

function summarizeDeltaGroup(deltas: NumericDelta[], paths: string[]) {
  return deltas.filter((delta) => paths.some((path) => delta.path === path || delta.path.startsWith(`${path}.`)));
}

function sumChanges(deltas: NumericDelta[]) {
  return deltas.reduce((total, delta) => total + delta.change, 0);
}

function buildStewardComment(report: AnnualReport) {
  const deltas = report.consequences;
  const spiritStones = findDelta(deltas, "finance.spiritStones");
  const income = findDelta(deltas, "finance.yearlyIncome");
  const morale = findDelta(deltas, "disciples.morale");
  const loyalty = findDelta(deltas, "disciples.loyalty");
  const combat = findDelta(deltas, "disciples.combat");
  const threat = findDelta(deltas, "influence.threat");
  const reputation = findDelta(deltas, "influence.reputation");
  const facilities = summarizeDeltaGroup(deltas, ["facilities"]);

  if ((morale?.change ?? 0) > 0 || (loyalty?.change ?? 0) > 0) return "执事评语：此令重在稳住人心，适合修复内耗、承接后续整顿。";
  if ((income?.change ?? 0) > 0 || (spiritStones?.change ?? 0) > 0) return "执事评语：此令偏向经营财源，短期账面改善，宜留意副作用。";
  if (facilities.length > 0 && sumChanges(facilities) > 0) return "执事评语：此令偏向夯实根基，收益不一定立刻显眼，但利于十年积累。";
  if ((combat?.change ?? 0) > 0 || (threat?.change ?? 0) < 0) return "执事评语：此令偏向护宗避险，能压住外患，却可能牺牲部分发展速度。";
  if ((reputation?.change ?? 0) > 0 || (threat?.change ?? 0) > 0) return "执事评语：此令有外放之势，声名会动，随之而来的注视也要算入账中。";
  return "执事评语：此令影响温和，宗门未见剧烈转折，后续仍需宗主持续定调。";
}

function buildRiskNotes(report: AnnualReport) {
  const notes = [...report.warnings];
  const deltas = report.consequences;
  const spiritStones = findDelta(deltas, "finance.spiritStones");
  const morale = findDelta(deltas, "disciples.morale");
  const loyalty = findDelta(deltas, "disciples.loyalty");
  const threat = findDelta(deltas, "influence.threat");
  const combat = findDelta(deltas, "disciples.combat");

  if ((spiritStones?.after ?? 999) < 180) notes.push("灵石库存偏低，连续支出可能拖垮供养。");
  if ((morale?.after ?? 100) < 40) notes.push("士气仍低，弟子执行谕令的韧性不足。");
  if ((loyalty?.after ?? 100) < 40) notes.push("忠诚不稳，内务整肃或安抚需要排上日程。");
  if ((threat?.after ?? 0) > 60) notes.push("外部威胁已高，继续扬名或扩张会更危险。");
  if ((combat?.change ?? 0) < 0) notes.push("战力本年下滑，若遇外患会更吃紧。");

  return [...new Set(notes)].slice(0, 4);
}

function ReportSettlement({ report }: { report: AnnualReport }) {
  const deltas = report.consequences;
  const divineSense = findDelta(deltas, "divineSense");
  const riskNotes = buildRiskNotes(report);

  return (
    <section className="settlement-summary" aria-label="本年结算摘要">
      <div className="settlement-head">
        <h2>本年结算摘要</h2>
        <p>{buildStewardComment(report)}</p>
      </div>
      <div className="settlement-cards">
        <div className={`settlement-card ${deltaTone(divineSense)}`}>
          <span>神念</span>
          <strong>{divineSense ? `${divineSense.before} -> ${divineSense.after}` : "未波动"}</strong>
          <small>{divineSense ? `净变化 ${formatSigned(divineSense.change)}` : "本年未留下神念差额"}</small>
        </div>
      </div>
      <div className="risk-notes">
        <strong>风险提示</strong>
        {riskNotes.length > 0 ? (
          <ul>
            {riskNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        ) : (
          <p>暂无急迫风险，宗门可按当前方向继续推进。</p>
        )}
      </div>
    </section>
  );
}

function gradeAxis(score: number) {
  if (score >= 80) return "鼎盛";
  if (score >= 65) return "强";
  if (score >= 45) return "稳";
  if (score >= 25) return "虚";
  return "危";
}

function axisHint(axis: string, score: number) {
  if (axis === "人") {
    if (score >= 65) return "人心可用，门人能承大令。";
    if (score >= 45) return "弟子尚稳，精锐与战力仍可再培。";
    return "人心未固，先稳士气与忠诚。";
  }
  if (axis === "财") {
    if (score >= 65) return "财脉宽裕，可支撑建设与招募。";
    if (score >= 45) return "账面能转，但连续大支出需谨慎。";
    return "财脉偏虚，灵石与净收益要优先补。";
  }
  if (axis === "物") {
    if (score >= 65) return "设施成势，宗门根基渐厚。";
    if (score >= 45) return "已有根基，仍缺关键设施等级。";
    return "山门根基薄，设施建设会影响大考底盘。";
  }
  if (score >= 65) return "声势渐成，外患尚可压住。";
  if (score >= 45) return "外势可控，扬名与避险要拿捏。";
  return "外势不稳，威胁与声望都需调度。";
}

function ExamPreview({ state }: { state: SectState }) {
  const rating = rateSect(state);
  const yearsLeft = Math.max(0, 11 - state.year);
  const axes = Object.entries(rating.axisScores);
  const weakest = axes.slice().sort((a, b) => a[1] - b[1])[0];
  const strongest = axes.slice().sort((a, b) => b[1] - a[1])[0];

  return (
    <section className="exam-preview" aria-label="十年大考预览">
      <div className="exam-preview-head">
        <p className="eyebrow">十年大考预览</p>
        <h2>{state.year <= 10 ? `尚余 ${yearsLeft} 年` : "大考已入延展"}</h2>
        <p>目标是在第十年大考中拿到更高宗门评级；四轴越稳，短板越少，最终品秩越高。</p>
      </div>
      <div className="exam-axis-grid">
        {axes.map(([axis, score]) => (
          <div className="exam-axis-card" key={axis}>
            <div>
              <span>{axis}</span>
              <strong>{gradeAxis(score)}</strong>
            </div>
            <div className="exam-axis-track" aria-label={`${axis}轴当前倾向 ${score}`}>
              <span style={{ width: `${score}%` }} />
            </div>
            <p>{axisHint(axis, score)}</p>
          </div>
        ))}
      </div>
      <p className="exam-advice">
        当前长处在{strongest[0]}，短板在{weakest[0]}；若要冲高评级，后续谕令应避免只补单轴。
      </p>
    </section>
  );
}

function StatusBar({ state }: { state: SectState }) {
  const stats = [
    ["年岁", `第 ${state.year} 年`],
    ["弟子", `${state.disciples.total} 人`],
    ["灵石", state.finance.spiritStones],
    ["士气", state.disciples.morale],
    ["神念", state.divineSense],
    ["威胁", state.influence.threat]
  ];

  return (
    <section className="ink-status" aria-label="宗门核心状态">
      {stats.map(([label, value]) => (
        <div className="ink-status-item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function DashboardCard({ id, title, seal, artifact, summary, onOpen }: DashboardCardProps) {
  return (
    <button className={`dashboard-card artifact-${id}`} type="button" onClick={() => onOpen(id)} aria-label={`查看${title}`}>
      <span className="artifact-mark" aria-hidden="true">{artifact}</span>
      <span className="card-side" aria-hidden="true">
        <span className="card-heading">{title}</span>
        <span className="seal">{seal}</span>
      </span>
      <span className="card-body">
        <span className="ink-line" />
        <dl>
          {summary.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </span>
    </button>
  );
}

function SectionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DetailLayout({
  title,
  subtitle,
  children,
  onBack,
  onNewGame
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack: () => void;
  onNewGame: () => void;
}) {
  return (
    <section className="detail-scroll-stage" aria-label={`${title}详情`}>
      <div className="detail-scroll-paper">
        <aside className="detail-title-tab" aria-hidden="true">
          <span>{title}</span>
        </aside>
        <div className="detail-scroll-content">
          <header className="detail-scroll-head">
            <div>
              <h1>{title}</h1>
              <p className="lead">{subtitle}</p>
            </div>
            <div className="head-actions">
              <button className="ghost-button" type="button" onClick={onBack}>返回总览</button>
              <button className="ghost-button" type="button" onClick={onNewGame}>重开</button>
            </div>
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}

function ReportView({ report }: { report?: AnnualReport }) {
  if (!report) {
    return (
      <div className="empty-scroll">
        <h2>开局简报</h2>
        <p>宗主闭死关突破，距离宗门大考还有十年时间，山门急需整顿。</p>
      </div>
    );
  }

  return (
    <article className="report-scroll">
      <h2>宗主谕令</h2>
      <blockquote>{report.decree}</blockquote>

      <ReportSettlement report={report} />

      <h2>本年大事</h2>
      <ol className="event-list">
        {report.events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}
      </ol>

      <h2>关键后果</h2>
      <KeyConsequences deltas={report.consequences} />

      <p className="summary">{report.executiveSummary}</p>

      {report.rating && (
        <section className="rating">
          <h2>宗门评级大考：{report.rating.rank}</h2>
          <p>{report.rating.summary}</p>
          <DeltaList
            deltas={Object.entries(report.rating.axisScores).map(([axis, score]) => ({
              path: axis,
              label: axis,
              before: 0,
              after: score,
              change: score
            }))}
          />
        </section>
      )}
    </article>
  );
}

function DashboardView({
  state,
  archive,
  onOpen,
  onNewGame,
  onShowGuide
}: {
  state: SectState;
  archive: ReportEntry[];
  onOpen: (view: ViewId) => void;
  onNewGame: () => void;
  onShowGuide: () => void;
}) {
  const netIncome = state.finance.yearlyIncome - state.finance.yearlyExpense;
  const latestReport = archive.at(-1)?.report ?? state.lastReport;
  const examProgress = Math.min(100, Math.max(0, ((state.year - 1) / 10) * 100));
  const examStatus = state.year <= 10 ? `距第十年大考 ${11 - state.year} 年` : "沙盒延展";
  const pressureNotes = [
    netIncome < 0 ? "账房入不敷出" : "",
    state.disciples.morale < 40 ? "弟子士气偏低" : "",
    state.disciples.loyalty < 40 ? "门人忠诚动摇" : "",
    state.influence.threat > 60 ? "外部威胁逼近" : "",
    state.finance.spiritStones < 160 ? "灵石库存吃紧" : ""
  ].filter(Boolean);
  const routeHint = state.history.at(-1) ?? "宗主闭死关突破，距离宗门大考还有十年时间。";

  return (
    <section className="desk-board" aria-label="宗门卷轴主界面">
      <div className="desk-grain" aria-hidden="true" />
      <StatusBar state={state} />
      <div className="home-summary-stack">
        <aside className="home-brief" aria-label="掌门案头摘要">
          <div>
            <h2>{examStatus}</h2>
            <div className="exam-track" aria-label={`大考进度 ${Math.round(examProgress)}%`}>
              <span style={{ width: `${examProgress}%` }} />
            </div>
            <p className="exam-goal">目标：第十年大考拿到更高宗门评级。</p>
          </div>
          <p className="route-hint">{routeHint}</p>
          <button className="primary-button home-decree-button" type="button" onClick={() => onOpen("decree")}>
            传下本年谕令
          </button>
        </aside>
        <aside className="home-report" aria-label="最近年报摘录">
          <p className="eyebrow">{latestReport ? "最近年报" : "开局简报"}</p>
          <h2>{latestReport?.title ?? "旧宗待兴"}</h2>
          <p>{latestReport?.events[0] ?? "宗主闭死关突破，距离宗门大考还有十年时间，山门急需整顿。"}</p>
          <div className="pressure-tags" aria-label="当前风险">
            {(pressureNotes.length > 0 ? pressureNotes : ["暂无急迫危机"]).map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        </aside>
        <div className="home-actions">
          <button className="ghost-button home-restart-button" type="button" onClick={onNewGame}>重开</button>
          <button className="ghost-button home-guide-button" type="button" onClick={onShowGuide}>玩法引导</button>
        </div>
      </div>
      <div className="dashboard-grid">
      <DashboardCard
        id="disciples"
        title="弟子堂"
        seal="人"
        artifact="册"
        onOpen={onOpen}
        summary={[
          ["弟子总数", state.disciples.total],
          ["精英弟子", state.disciples.elite],
          ["士气 / 忠诚", `${state.disciples.morale} / ${state.disciples.loyalty}`]
        ]}
      />
      <DashboardCard
        id="facilities"
        title="宗门设施"
        seal="物"
        artifact="图"
        onOpen={onOpen}
        summary={[
          ["演武场", `Lv${state.facilities.trainingGround}`],
          ["藏经阁", `Lv${state.facilities.scripturePavilion}`],
          ["灵田 / 炼丹", `${state.facilities.spiritField} / ${state.facilities.alchemyRoom}`]
        ]}
      />
      <DashboardCard
        id="finance"
        title="灵石账房"
        seal="财"
        artifact="簿"
        onOpen={onOpen}
        summary={[
          ["库存", state.finance.spiritStones],
          ["年收入", `+${state.finance.yearlyIncome}`],
          ["净收益", `${netIncome >= 0 ? "+" : ""}${netIncome}`]
        ]}
      />
      <DashboardCard
        id="chronicle"
        title="宗门史书"
        seal="史"
        artifact="卷"
        onOpen={onOpen}
        summary={[
          ["已载年份", archive.length],
          ["最近卷名", latestReport ? "年报已归档" : "开局简报"],
          ["关键转折", latestReport ? "点击翻阅" : "大考将近"]
        ]}
      />
      <DashboardCard
        id="decree"
        title="传音谕令"
        seal="令"
        artifact="简"
        onOpen={onOpen}
        summary={[
          ["本年状态", state.gameOver ? "宗门已止" : "待传音"],
          ["神念", state.divineSense],
          ["上一年", latestReport?.title ?? "暂无年报"]
        ]}
      />
      <DashboardCard
        id="omens"
        title="天机外务"
        seal="势"
        artifact="签"
        onOpen={onOpen}
        summary={[
          ["声望", state.influence.reputation],
          ["气运", state.influence.luck],
          ["威胁", state.influence.threat]
        ]}
      />
      </div>
    </section>
  );
}

const SURNAMES = ["沈", "许", "秦", "陆", "林", "顾", "闻", "苏", "谢", "叶", "楚", "韩"];
const GIVEN_NAMES = ["清玄", "明烛", "照夜", "怀真", "云岫", "知微", "守拙", "临川", "见素", "归尘", "照水", "问松"];
const ROOTS = ["凡骨", "灵根", "异骨", "天骄"];
const REALMS = ["炼气初期", "炼气中期", "炼气后期", "炼气圆满", "筑基初期", "筑基中期", "筑基后期", "金丹种子"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

function getSectTrait(state: SectState, seed: number) {
  const recentHistory = state.history.slice(-4).join("，");
  const netIncome = state.finance.yearlyIncome - state.finance.yearlyExpense;

  if (state.disciples.loyalty < 35) return "观望";
  if (state.disciples.morale < 35) return "沉郁";
  if (recentHistory.includes("广招")) return "新锐";
  if (recentHistory.includes("精培")) return "笃学";
  if (recentHistory.includes("严训")) return "争胜";
  if (recentHistory.includes("安抚")) return "温和";
  if (recentHistory.includes("整肃")) return "守律";
  if (recentHistory.includes("扬名") || state.influence.reputation >= 65) return "慕名";
  if (recentHistory.includes("避世")) return "清修";
  if (state.influence.threat >= 60) return "警觉";
  if (netIncome < 0) return "清苦";
  if (state.facilities.trainingGround >= state.facilities.scripturePavilion + 2) return "好武";
  if (state.facilities.scripturePavilion >= state.facilities.trainingGround + 2) return "悟性";

  return pick(["勤勉", "沉稳", "机敏", "赤诚"], seed);
}

function getRealm(state: SectState, slot: number, seed: number) {
  const eliteRatio = state.disciples.total > 0 ? state.disciples.elite / state.disciples.total : 0;
  const facilityBonus = state.facilities.trainingGround + state.facilities.scripturePavilion;
  const score = state.disciples.combat + eliteRatio * 35 + facilityBonus * 5 + (seed % 15) - slot * 6;
  const realmIndex = clamp(Math.floor(score / 18), 0, REALMS.length - 1);

  return REALMS[realmIndex];
}

function generateRepresentativeDisciples(state: SectState): RepresentativeDisciple[] {
  const count = Math.min(4, state.disciples.total);
  if (count <= 0) return [];

  const seedBase = hashText([
    state.year,
    state.disciples.total,
    state.disciples.elite,
    state.disciples.morale,
    state.disciples.loyalty,
    state.disciples.combat,
    state.finance.spiritStones,
    state.influence.reputation,
    state.influence.threat,
    state.history.slice(-3).join("|")
  ].join(":"));

  return Array.from({ length: count }, (_, slot) => {
    const seed = seedBase + slot * 97;
    const eliteLine = slot < state.disciples.elite;
    const rootScore = clamp(
      Math.floor((state.disciples.elite / Math.max(1, state.disciples.total)) * 4) + (eliteLine ? 1 : 0) + (seed % 2),
      0,
      ROOTS.length - 1
    );

    return {
      name: `${pick(SURNAMES, seed)}${pick(GIVEN_NAMES, Math.floor(seed / 7))}`,
      root: ROOTS[rootScore],
      realm: getRealm(state, slot, seed),
      trait: getSectTrait(state, seed),
      loyalty: clamp(state.disciples.loyalty + (state.disciples.morale - 50) / 4 + (seed % 17) - 8, 0, 100)
    };
  });
}

function DisciplesView({ state }: { state: SectState }) {
  const disciples = generateRepresentativeDisciples(state);

  return (
    <div className="detail-grid">
      <SectionPanel title="弟子概况">
        <dl className="ledger-list">
          <div><dt>弟子总数</dt><dd>{state.disciples.total}</dd></div>
          <div><dt>精英弟子</dt><dd>{state.disciples.elite}</dd></div>
          <div><dt>士气</dt><dd>{state.disciples.morale}</dd></div>
          <div><dt>忠诚</dt><dd>{state.disciples.loyalty}</dd></div>
          <div><dt>战力</dt><dd>{state.disciples.combat}</dd></div>
        </dl>
      </SectionPanel>
      <SectionPanel title="代表弟子">
        <div className="disciple-list">
          {disciples.length > 0 ? (
            disciples.map((disciple) => (
              <article className="disciple-card" key={disciple.name}>
                <strong>{disciple.name}</strong>
                <span>{disciple.root} · {disciple.realm}</span>
                <span>{disciple.trait} · 忠诚 {Math.round(disciple.loyalty)}</span>
              </article>
            ))
          ) : (
            <p className="muted">山门已无可记名弟子。</p>
          )}
        </div>
      </SectionPanel>
    </div>
  );
}

function FacilitiesView({ state }: { state: SectState }) {
  const facilities = [
    ["演武场", state.facilities.trainingGround, "影响战力、严训与威胁应对"],
    ["藏经阁", state.facilities.scripturePavilion, "影响突破、精培与传承"],
    ["灵田", state.facilities.spiritField, "影响收入、安抚与稳定"],
    ["炼丹房", state.facilities.alchemyRoom, "影响收入、疗伤与机遇"]
  ];

  return (
    <div className="detail-grid">
      {facilities.map(([name, level, desc]) => (
        <SectionPanel title={String(name)} key={String(name)}>
          <dl className="ledger-list">
            <div><dt>等级</dt><dd>Lv{level} · {FACILITY_LEVEL_LABELS[Number(level)]}</dd></div>
            <div><dt>下一阶</dt><dd>{Number(level) >= 3 ? "已达上限" : `Lv${Number(level) + 1} · ${FACILITY_LEVEL_LABELS[Number(level) + 1]}`}</dd></div>
            <div><dt>作用</dt><dd>{desc}</dd></div>
          </dl>
        </SectionPanel>
      ))}
    </div>
  );
}

function FinanceView({ state }: { state: SectState }) {
  const netIncome = state.finance.yearlyIncome - state.finance.yearlyExpense;

  return (
    <div className="detail-grid">
      <SectionPanel title="账房总览">
        <dl className="ledger-list">
          <div><dt>灵石库存</dt><dd>{state.finance.spiritStones}</dd></div>
          <div><dt>年收入</dt><dd>+{state.finance.yearlyIncome}</dd></div>
          <div><dt>年支出</dt><dd>-{state.finance.yearlyExpense}</dd></div>
          <div><dt>净收益</dt><dd className={netIncome >= 0 ? "positive-text" : "negative-text"}>{netIncome >= 0 ? "+" : ""}{netIncome}</dd></div>
        </dl>
      </SectionPanel>
      <SectionPanel title="风险批注">
        <p className="summary">
          {netIncome >= 0
            ? "账面尚能自持，可承受少量建设或招募。"
            : "年度入不敷出，若连续亏损，宗门将进入灵石枯竭风险。"}
        </p>
      </SectionPanel>
    </div>
  );
}

function ChronicleView({ archive, state }: { archive: ReportEntry[]; state: SectState }) {
  const entries = archive.length > 0 ? archive : state.lastReport ? [{ year: state.year - 1, report: state.lastReport }] : [];

  if (entries.length === 0) {
    return <ReportView />;
  }

  return (
    <div className="chronicle-list">
      {entries.map((entry, index) => (
        <article className="chronicle-entry" key={`${entry.year}-${index}`}>
          <span className="year-seal">第 {entry.year} 年</span>
          <ReportView report={entry.report} />
        </article>
      ))}
    </div>
  );
}

function getErrorGuidance(error: string) {
  if (!error) return [];
  if (error.includes("神念不足")) {
    return [
      "缩短谕令可降低神念消耗；标点和空格不计入消耗。",
      "每个有效字消耗 1 点神念，回合结算后会静息回复。"
    ];
  }
  if (error.includes("API_KEY") || error.includes("API Key") || error.includes("缺少服务端")) {
    return [
      "线上试玩需要在 Netlify 环境变量中配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，并重新部署。",
      "本地联网演示则在 .env 配置密钥；没有密钥时可用 AI_TEST_MODE=true npm run dev 启动演示模式。"
    ];
  }
  if (error.includes("演算失败") || error.includes("无法连接")) {
    return ["谕令仍保留在输入框中，存档未损坏；确认本地服务后可直接重试。"];
  }
  return ["谕令仍在案上，存档未损坏；可修改后再次传音。"];
}

function DecreeView({
  state,
  decree,
  error,
  isLoading,
  waitingSeconds,
  onDecreeChange,
  onSubmit,
  onRetry
}: {
  state: SectState;
  decree: string;
  error: string;
  isLoading: boolean;
  waitingSeconds: number;
  onDecreeChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  const decreeLength = countDecreeChars(decree);
  const divineSenseCost = calculateDivineSenseCost(decree);
  const hasEnoughDivineSense = divineSenseCost <= state.divineSense;
  const canSubmit = decreeLength >= 2 && !isLoading && !state.gameOver && hasEnoughDivineSense;
  const waitingStage = waitingSeconds < 8
    ? "执事长老拆解谕令..."
    : waitingSeconds < 16
      ? "诸堂核算本年收支..."
      : "史官誊写年报...";
  const showSlowHint = isLoading && waitingSeconds >= 20;
  const errorGuidance = getErrorGuidance(error);

  return (
    <div className="detail-grid decree-layout">
      <SectionPanel title="上一年卷宗">
        <ReportView report={state.lastReport} />
      </SectionPanel>
      <SectionPanel title="传下本年谕令">
        {state.gameOver ? (
          <div className="game-over">
            <h2>{state.gameOver.reason}</h2>
            <p>{state.gameOver.chronicle}</p>
          </div>
        ) : (
          <>
            <textarea
              value={decree}
              onChange={(event) => onDecreeChange(event.target.value)}
              placeholder="例如：闭门清修，先稳住弟子心气，不要争一时虚名。"
            />
            <div className="decree-meter">
              <span>{decreeLength}/{MAX_DECREE_CHARS}</span>
              <span className={hasEnoughDivineSense ? "mind-cost" : "mind-cost insufficient"}>
                消耗神念：{divineSenseCost}
              </span>
            </div>
            <div className="samples">
              {SAMPLE_DECREES.map((sample) => (
                <button type="button" key={sample} onClick={() => onDecreeChange(sample)}>{sample}</button>
              ))}
            </div>
            {!hasEnoughDivineSense && <p className="error">神念不足，当前仅余 {state.divineSense} 点。</p>}
            {error && (
              <div className="error error-panel">
                <p>{error}</p>
                <ul>
                  {errorGuidance.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            {isLoading && (
              <div className="decree-waiting" role="status" aria-live="polite">
                <p>{waitingStage}</p>
                {showSlowHint && (
                  <div className="decree-timeout">
                    <span>AI 年报仍在生成，谕令未丢失。</span>
                    <span>重试会保留当前谕令，并取消上一轮等待。</span>
                    <div className="timeout-actions">
                      <span>可继续等待</span>
                      <button className="ghost-button" type="button" onClick={onRetry}>重试</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button className="primary-button" type="button" disabled={!canSubmit} onClick={onSubmit}>
              {isLoading ? waitingStage : "消耗神念传音"}
            </button>
          </>
        )}
      </SectionPanel>
    </div>
  );
}

function OmensView({ state }: { state: SectState }) {
  return (
    <div className="detail-grid">
      <SectionPanel title="大考预览">
        <ExamPreview state={state} />
      </SectionPanel>
      <SectionPanel title="天机三象">
        <dl className="ledger-list">
          <div><dt>声望</dt><dd>{state.influence.reputation}</dd></div>
          <div><dt>气运</dt><dd>{state.influence.luck}</dd></div>
          <div><dt>威胁</dt><dd>{state.influence.threat}</dd></div>
        </dl>
      </SectionPanel>
      <SectionPanel title="外务批注">
        <p className="summary">扬名会提高招募质量，也会引来关注；避世可压低威胁，但会损失机遇与声望。</p>
      </SectionPanel>
    </div>
  );
}

function OnboardingGuide({
  onClose,
  onPickDecree
}: {
  onClose: () => void;
  onPickDecree: (decree: string) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  return (
    <aside className="onboarding-guide" aria-label="开局游玩引导">
      <div className="onboarding-header">
        <span>开局指引</span>
        <button type="button" onClick={onClose}>跳过</button>
      </div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      {isLastStep && (
        <div className="onboarding-decrees" aria-label="示例谕令">
          {ONBOARDING_DECREES.map((sample) => (
            <button type="button" key={sample} onClick={() => onPickDecree(sample)}>
              {sample}
            </button>
          ))}
        </div>
      )}
      <div className="onboarding-footer">
        <div className="onboarding-dots" aria-hidden="true">
          {ONBOARDING_STEPS.map((item, index) => (
            <span className={index === stepIndex ? "active" : ""} key={item.title} />
          ))}
        </div>
        {isLastStep ? (
          <button className="primary-button" type="button" onClick={onClose}>开始整顿</button>
        ) : (
          <button className="primary-button" type="button" onClick={() => setStepIndex((index) => index + 1)}>
            {stepIndex === 0 ? "知晓" : "传令试行"}
          </button>
        )}
      </div>
    </aside>
  );
}

export default function App() {
  const [state, setState] = useState<SectState | null>(() => loadSavedState());
  const [reportArchive, setReportArchive] = useState<ReportEntry[]>(() => loadReportArchive());
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [decree, setDecree] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    saveReportArchive(reportArchive);
  }, [reportArchive]);

  useEffect(() => {
    if (!state) {
      fetchNewGame().then(setState).catch((err: Error) => setError(err.message));
    }
  }, [state]);

  useEffect(() => {
    if (!isLoading) {
      setWaitingSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setWaitingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const currentMeta = useMemo(() => viewMeta[activeView], [activeView]);

  function handleDecreeChange(value: string) {
    setDecree(trimDecreeToMaxChars(value));
    setError("");
  }

  function closeOnboarding() {
    markOnboardingSeen();
    setShowOnboarding(false);
  }

  function handleOnboardingDecree(sample: string) {
    handleDecreeChange(sample);
    setActiveView("decree");
    closeOnboarding();
  }

  async function handleSubmit(retry = false) {
    if (!state || decree.trim().length < 2 || (!retry && isLoading) || state.gameOver) return;
    const divineSenseCost = calculateDivineSenseCost(decree);
    if (divineSenseCost > state.divineSense) {
      setError(`神念不足：本令需消耗${divineSenseCost}点神念，当前仅余${state.divineSense}点。`);
      return;
    }
    if (retry) {
      abortControllerRef.current?.abort();
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setWaitingSeconds(0);
    setError("");
    try {
      const turnYear = state.year;
      const response = await submitTurn(state, decree.trim(), abortController.signal);
      if (requestIdRef.current !== requestId) return;
      setState(response.state);
      setReportArchive((entries) => [...entries, { year: turnYear, report: response.report }]);
      setActiveView("decree");
      setDecree("");
    } catch (err) {
      if (abortController.signal.aborted) return;
      setError(err instanceof Error ? err.message : "本回合演算失败。");
    } finally {
      if (requestIdRef.current === requestId) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }

  async function handleNewGame() {
    clearSavedState();
    clearReportArchive();
    setReportArchive([]);
    setActiveView("dashboard");
    setError("");
    setDecree("");
    abortControllerRef.current?.abort();
    setState(await fetchNewGame());
  }

  if (!state) {
    return (
      <main className="app-shell">
        <section className="ink-panel loading-panel">正在铺开宗门卷宗...</section>
      </main>
    );
  }

  const detailContent = activeView === "disciples"
    ? <DisciplesView state={state} />
    : activeView === "facilities"
      ? <FacilitiesView state={state} />
      : activeView === "finance"
        ? <FinanceView state={state} />
        : activeView === "chronicle"
          ? <ChronicleView archive={reportArchive} state={state} />
          : activeView === "decree"
            ? (
              <DecreeView
                state={state}
                decree={decree}
                error={error}
                isLoading={isLoading}
                waitingSeconds={waitingSeconds}
                onDecreeChange={handleDecreeChange}
                onSubmit={() => handleSubmit()}
                onRetry={() => handleSubmit(true)}
              />
            )
            : activeView === "omens"
              ? <OmensView state={state} />
              : null;

  return (
    <main className={`app-shell ${activeView === "dashboard" ? "home-shell" : "detail-shell"}`}>
      {activeView !== "dashboard" && <StatusBar state={state} />}
      <section className="ink-panel">
        {activeView === "dashboard" && (
          <DashboardView
            state={state}
            archive={reportArchive}
            onOpen={setActiveView}
            onNewGame={handleNewGame}
            onShowGuide={() => setShowOnboarding(true)}
          />
        )}
        {activeView === "dashboard" && showOnboarding && (
          <OnboardingGuide onClose={closeOnboarding} onPickDecree={handleOnboardingDecree} />
        )}
        {activeView !== "dashboard" && detailContent && (
          <DetailLayout
            title={currentMeta.title}
            subtitle={currentMeta.subtitle}
            onBack={() => setActiveView("dashboard")}
            onNewGame={handleNewGame}
          >
            {detailContent}
          </DetailLayout>
        )}
      </section>
    </main>
  );
}

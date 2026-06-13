import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SAMPLE_DECREES } from "./domain/initialState";
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

function StatusBar({ state }: { state: SectState }) {
  const stats = [
    ["年岁", `第 ${state.year} 年`],
    ["弟子", `${state.disciples.total} 人`],
    ["灵石", state.finance.spiritStones],
    ["士气", state.disciples.morale],
    ["神念", 100],
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
      <span className="seal">{seal}</span>
      <span className="card-heading">{title}</span>
      <span className="ink-line" />
      <dl>
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
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

function ReportView({ report }: { report?: AnnualReport }) {
  if (!report) {
    return (
      <div className="empty-scroll">
        <h2>开局简报</h2>
        <p>魔封未破，旧宗待兴。宗主闭关前，只余十年可整顿山门。</p>
      </div>
    );
  }

  return (
    <article className="report-scroll">
      <p className="eyebrow">{report.title}</p>
      <h2>宗主谕令</h2>
      <blockquote>{report.decree}</blockquote>

      <h2>本年大事</h2>
      <ol className="event-list">
        {report.events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}
      </ol>

      <h2>执行后果</h2>
      <DeltaList deltas={report.consequences} />

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

function DashboardView({ state, archive, onOpen }: { state: SectState; archive: ReportEntry[]; onOpen: (view: ViewId) => void }) {
  const netIncome = state.finance.yearlyIncome - state.finance.yearlyExpense;
  const latestReport = archive.at(-1)?.report ?? state.lastReport;

  return (
    <section className="desk-board" aria-label="宗门卷轴主界面">
      <div className="desk-grain" aria-hidden="true" />
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
          ["最近卷名", latestReport?.title ?? "开局简报"],
          ["关键转折", latestReport?.events[0] ?? "旧封印渐松"]
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
          ["神念", 100],
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
            <div><dt>等级</dt><dd>Lv{level}</dd></div>
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

function DecreeView({
  state,
  decree,
  error,
  isLoading,
  onDecreeChange,
  onSubmit
}: {
  state: SectState;
  decree: string;
  error: string;
  isLoading: boolean;
  onDecreeChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = decree.trim().length >= 2 && !isLoading && !state.gameOver;

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
            <div className="samples">
              {SAMPLE_DECREES.map((sample) => (
                <button type="button" key={sample} onClick={() => onDecreeChange(sample)}>{sample}</button>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <button className="primary-button" type="button" disabled={!canSubmit} onClick={onSubmit}>
              {isLoading ? "执事长老演算中..." : "朱批传音"}
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

export default function App() {
  const [state, setState] = useState<SectState | null>(() => loadSavedState());
  const [reportArchive, setReportArchive] = useState<ReportEntry[]>(() => loadReportArchive());
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [decree, setDecree] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const currentMeta = useMemo(() => viewMeta[activeView], [activeView]);

  async function handleSubmit() {
    if (!state || decree.trim().length < 2 || isLoading || state.gameOver) return;
    setIsLoading(true);
    setError("");
    try {
      const turnYear = state.year;
      const response = await submitTurn(state, decree.trim());
      setState(response.state);
      setReportArchive((entries) => [...entries, { year: turnYear, report: response.report }]);
      setActiveView("decree");
      setDecree("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "本回合演算失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewGame() {
    clearSavedState();
    clearReportArchive();
    setReportArchive([]);
    setActiveView("dashboard");
    setError("");
    setDecree("");
    setState(await fetchNewGame());
  }

  if (!state) {
    return (
      <main className="app-shell">
        <section className="ink-panel loading-panel">正在铺开宗门卷宗...</section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${activeView === "dashboard" ? "home-shell" : "detail-shell"}`}>
      <StatusBar state={state} />
      <section className="ink-panel">
        <header className={`page-head ${activeView === "dashboard" ? "desk-head" : "scroll-head"}`}>
          <div>
            <p className="eyebrow">水墨宗门案牍</p>
            <h1>{currentMeta.title}</h1>
            <p className="lead">{currentMeta.subtitle}</p>
          </div>
          <div className="head-actions">
            {activeView !== "dashboard" && (
              <button className="ghost-button" type="button" onClick={() => setActiveView("dashboard")}>返回总览</button>
            )}
            <button className="ghost-button" type="button" onClick={handleNewGame}>重开</button>
          </div>
        </header>

        {activeView === "dashboard" && <DashboardView state={state} archive={reportArchive} onOpen={setActiveView} />}
        {activeView === "disciples" && <DisciplesView state={state} />}
        {activeView === "facilities" && <FacilitiesView state={state} />}
        {activeView === "finance" && <FinanceView state={state} />}
        {activeView === "chronicle" && <ChronicleView archive={reportArchive} state={state} />}
        {activeView === "decree" && (
          <DecreeView
            state={state}
            decree={decree}
            error={error}
            isLoading={isLoading}
            onDecreeChange={setDecree}
            onSubmit={handleSubmit}
          />
        )}
        {activeView === "omens" && <OmensView state={state} />}
      </section>
    </main>
  );
}

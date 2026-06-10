import { useEffect, useMemo, useState } from "react";
import { SAMPLE_DECREES } from "./domain/initialState";
import type { NumericDelta, SectState } from "./domain/types";
import { fetchNewGame, submitTurn } from "./services/apiClient";
import { clearSavedState, loadSavedState, saveState } from "./services/saveStore";

function DeltaList({ deltas }: { deltas: NumericDelta[] }) {
  if (deltas.length === 0) return <p className="muted">本年数值未见明显波动。</p>;

  return (
    <ul className="delta-list">
      {deltas.slice(0, 8).map((delta) => (
        <li key={delta.path} className={delta.change >= 0 ? "positive" : "negative"}>
          <span>{delta.label}</span>
          <strong>{delta.change > 0 ? `+${delta.change}` : delta.change}</strong>
        </li>
      ))}
    </ul>
  );
}

function StatGrid({ state }: { state: SectState }) {
  const stats = [
    ["年岁", `第 ${state.year} 年`],
    ["弟子", `${state.disciples.total} 人 / 精英 ${state.disciples.elite}`],
    ["士气", `${state.disciples.morale}`],
    ["战力", `${state.disciples.combat}`],
    ["灵石", `${state.finance.spiritStones}`],
    ["收支", `+${state.finance.yearlyIncome} / -${state.finance.yearlyExpense}`],
    ["声望", `${state.influence.reputation}`],
    ["威胁", `${state.influence.threat}`]
  ];

  return (
    <div className="stat-grid">
      {stats.map(([label, value]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<SectState | null>(() => loadSavedState());
  const [decree, setDecree] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    if (!state) {
      fetchNewGame().then(setState).catch((err: Error) => setError(err.message));
    }
  }, [state]);

  const canSubmit = useMemo(
    () => decree.trim().length >= 2 && !!state && !isLoading && !state.gameOver,
    [decree, isLoading, state]
  );

  async function handleSubmit() {
    if (!state || !canSubmit) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await submitTurn(state, decree.trim());
      setState(response.state);
      setDecree("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "本回合演算失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewGame() {
    clearSavedState();
    setError("");
    setDecree("");
    setState(await fetchNewGame());
  }

  if (!state) {
    return (
      <main className="app-shell">
        <section className="report-panel">正在铺开宗门卷宗...</section>
      </main>
    );
  }

  const report = state.lastReport;

  return (
    <main className="app-shell">
      <section className="report-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">闭关宗主案前卷宗</p>
            <h1>宗门模拟器</h1>
            <p className="lead">一年一谕令，一谕令一回响。</p>
          </div>
          <button className="ghost-button" onClick={handleNewGame}>重开</button>
        </header>

        <StatGrid state={state} />

        {report ? (
          <article className="annual-report">
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
        ) : (
          <article className="annual-report">
            <h2>开局简报</h2>
            <p>魔封未破，旧宗待兴。宗主闭关前，只余十年可整顿山门。</p>
          </article>
        )}

        {state.gameOver ? (
          <section className="game-over">
            <h2>{state.gameOver.reason}</h2>
            <p>{state.gameOver.chronicle}</p>
          </section>
        ) : (
          <section className="decree-box">
            <h2>传下本年谕令</h2>
            <textarea
              value={decree}
              onChange={(event) => setDecree(event.target.value)}
              placeholder="例如：广开山门，凡有灵根者皆可入我宗。"
            />
            <div className="samples">
              {SAMPLE_DECREES.map((sample) => (
                <button key={sample} onClick={() => setDecree(sample)}>{sample}</button>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <button className="primary-button" disabled={!canSubmit} onClick={handleSubmit}>
              {isLoading ? "执事长老演算中..." : "传音"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

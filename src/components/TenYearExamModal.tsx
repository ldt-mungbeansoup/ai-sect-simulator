import { useEffect, useMemo, useRef, useState } from "react";
import type { Axis, SectRating } from "../domain/types";

const AXES: Axis[] = ["人", "财", "物", "势"];

const AXIS_NAMES: Record<Axis, string> = {
  人: "门人传承",
  财: "财脉经营",
  物: "山门根基",
  势: "外势气运"
};

function axisTone(score: number) {
  if (score >= 65) return "strong";
  if (score >= 45) return "steady";
  return "weak";
}

function axisComment(axis: Axis, score: number) {
  if (axis === "人") {
    if (score >= 65) return "门人可用，传承渐成。";
    if (score >= 45) return "弟子尚稳，仍可精培。";
    return "人心未固，传承承压。";
  }
  if (axis === "财") {
    if (score >= 65) return "财脉宽裕，可承大业。";
    if (score >= 45) return "账面能转，仍需节用。";
    return "财脉偏虚，库藏吃紧。";
  }
  if (axis === "物") {
    if (score >= 65) return "设施成势，根基渐厚。";
    if (score >= 45) return "已有根基，仍待完备。";
    return "山门单薄，设施待兴。";
  }
  if (score >= 65) return "声势渐成，外患可控。";
  if (score >= 45) return "外势尚稳，仍需权衡。";
  return "外势不稳，威胁逼近。";
}

function rankTone(rank: SectRating["rank"]) {
  if (rank === "覆灭") return "fallen";
  if (rank === "勉强立足") return "fragile";
  if (rank === "小有名望") return "known";
  if (rank === "一方大宗") return "great";
  return "rising";
}

export function TenYearExamModal({
  rating,
  initiallyExpanded = false,
  onClose,
  onOpenChronicle,
  onRestart
}: {
  rating: SectRating;
  initiallyExpanded?: boolean;
  onClose: () => void;
  onOpenChronicle: () => void;
  onRestart: () => void;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const axes = useMemo(() => AXES.map((axis) => [axis, rating.axisScores[axis]] as const), [rating]);
  const strongest = axes.slice().sort((a, b) => b[1] - a[1])[0];
  const weakest = axes.slice().sort((a, b) => a[1] - b[1])[0];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="exam-modal-backdrop" role="presentation">
      <div
        className={`exam-modal exam-rank-${rankTone(rating.rank)} ${expanded ? "expanded" : "reveal"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-modal-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="exam-modal-head">
          <div>
            <p>仙盟敕榜</p>
            <h1 id="exam-modal-title">十年宗门大考</h1>
          </div>
          <button className="exam-close" type="button" onClick={onClose}>暂收敕榜</button>
        </header>

        <div className="exam-modal-body">
          <section className="exam-verdict" aria-label="最终评级">
            <span className="exam-seal" aria-hidden="true">定</span>
            <p>大考定评</p>
            <h2>{rating.rank}</h2>
            <strong>{rating.totalScore}</strong>
            <small>总评</small>
          </section>

          {!expanded ? (
            <section className="exam-reveal-copy">
              <p>{rating.summary}</p>
              <button className="primary-button" type="button" onClick={() => setExpanded(true)}>展开考卷</button>
            </section>
          ) : (
            <div className="exam-scroll-content">
              <section className="exam-axis-list" aria-label="四轴评分">
                {axes.map(([axis, score]) => (
                  <article className={`exam-axis-row ${axisTone(score)}`} key={axis}>
                    <div className="exam-axis-heading">
                      <div><b>{axis}</b><span>{AXIS_NAMES[axis]}</span></div>
                      <strong>{score}</strong>
                    </div>
                    <div className="exam-score-track" aria-label={`${axis}轴 ${score} 分`}>
                      <span style={{ width: `${score}%` }} />
                    </div>
                    <p>{axisComment(axis, score)}</p>
                  </article>
                ))}
              </section>

              <section className="exam-judgement">
                <h3>仙盟考语</h3>
                <p>{rating.summary}</p>
                <p>本宗以{strongest[0]}轴见长，{weakest[0]}轴最需补足。</p>
              </section>

              <section className="exam-turning-points">
                <h3>十年关键转折</h3>
                {rating.turningPoints.length > 0 ? (
                  <ol>
                    {rating.turningPoints.slice(0, 3).map((point, index) => (
                      <li key={`${point}-${index}`}><span>{index + 1}</span><p>{point}</p></li>
                    ))}
                  </ol>
                ) : (
                  <p>史册未录得显著转折。</p>
                )}
              </section>

              <p className="exam-sandbox-note">十年大考已定，但宗门仍可继续经营。</p>
            </div>
          )}
        </div>

        {expanded && (
          <footer className="exam-modal-actions">
            {confirmRestart ? (
              <div className="exam-restart-confirm" role="alert">
                <span>重开会清除当前十年存档与史书。</span>
                <button type="button" onClick={() => setConfirmRestart(false)}>取消</button>
                <button className="danger-button" type="button" onClick={onRestart}>确认重开</button>
              </div>
            ) : (
              <>
                <button className="exam-restart-link" type="button" onClick={() => setConfirmRestart(true)}>重开十年</button>
                <div>
                  <button className="ghost-button" type="button" onClick={onClose}>继续执掌</button>
                  <button className="primary-button" type="button" onClick={onOpenChronicle}>查看十年史书</button>
                </div>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

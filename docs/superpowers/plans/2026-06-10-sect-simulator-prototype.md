# Sect Simulator Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable 10-turn web prototype where one natural-language sect decree is parsed into a hidden stance, resolved by deterministic rules, and presented back as an annual report.

**Architecture:** Use a small Vite + React + TypeScript client and a Node/Express API in the same repository. The domain simulation is pure TypeScript and testable without the UI or AI provider; AI adapters only parse decrees and narrate bounded facts, while deterministic rules own all state changes.

**Tech Stack:** TypeScript, React, Vite, Express, Vitest, Zod, OpenAI Responses API via the official `openai` Node SDK, localStorage for prototype saves.

---

## File Structure

## Execution Adjustment: Framework First

Before executing the feature tasks below, create the full code framework once: package/config files, client entry, server entry, shared domain modules, AI boundary modules, service modules, tests, `.gitignore`, `.env.example`, and `README.md`.

The framework pass should keep interfaces stable and implementations minimal. Later tasks fill in behavior inside these files instead of changing module names, import paths, or ownership boundaries. This reduces cross-task drift between domain simulation, AI parsing, API orchestration, and UI work.

- Create: `package.json` - scripts, runtime dependencies, dev dependencies.
- Create: `tsconfig.json` - shared TypeScript settings.
- Create: `tsconfig.node.json` - server and config TypeScript settings.
- Create: `vite.config.ts` - Vite React setup and API proxy.
- Create: `index.html` - web entry point.
- Create: `src/main.tsx` - React root mounting.
- Create: `src/App.tsx` - prototype screen orchestration.
- Create: `src/styles.css` - desktop-first sect dossier visual style with basic mobile support.
- Create: `src/domain/types.ts` - all shared game state, AI, report, and scoring types.
- Create: `src/domain/stanceConfig.ts` - hidden stance table with deterministic numeric effects.
- Create: `src/domain/initialState.ts` - initial sect state and sample decrees.
- Create: `src/domain/resolveTurn.ts` - pure turn resolver.
- Create: `src/domain/rating.ts` - 10-turn rating calculation.
- Create: `src/domain/reportFacts.ts` - convert deltas and state into bounded narration facts.
- Create: `src/domain/__tests__/resolveTurn.test.ts` - core simulation tests.
- Create: `src/domain/__tests__/rating.test.ts` - rating tests.
- Create: `src/services/apiClient.ts` - browser API wrapper.
- Create: `src/services/saveStore.ts` - localStorage persistence.
- Create: `server/index.ts` - Express API and static dev bootstrap.
- Create: `server/ai/schemas.ts` - Zod schemas for AI responses and validation.
- Create: `server/ai/openaiClient.ts` - OpenAI client factory and model calls.
- Create: `server/ai/fallback.ts` - deterministic parsing and narration for test mode only.
- Create: `server/ai/prompts.ts` - compact prompts for decree parsing and report narration.
- Create: `server/__tests__/schemas.test.ts` - AI schema validation tests.

## Task 1: Bootstrap The Empty App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create the package manifest**

Create `package.json`:

```json
{
  "name": "sect-simulator-prototype",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server/index.ts",
    "dev:client": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "express": "^5.1.0",
    "openai": "^5.0.0",
    "vite": "^7.0.0",
    "zod": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "server", "vite.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node",
    "types": ["node"]
  },
  "include": ["server", "vite.config.ts"]
}
```

- [ ] **Step 3: Add Vite config and HTML entry**

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  }
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>宗门模拟器</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Add a minimal React shell**

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="report-panel">
        <p className="eyebrow">闭关宗主案前卷宗</p>
        <h1>宗门模拟器</h1>
        <p className="lead">网页试玩原型将围绕“一年一谕令，一谕令一回响”展开。</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #241b14;
  background: #eee7d6;
  font-family:
    Inter, "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
textarea,
input {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 32px;
  background:
    linear-gradient(120deg, rgba(90, 40, 24, 0.08), transparent 42%),
    #eee7d6;
}

.report-panel {
  width: min(1040px, 100%);
  margin: 0 auto;
  padding: 28px;
  border: 1px solid rgba(69, 48, 32, 0.24);
  border-radius: 8px;
  background: rgba(255, 252, 242, 0.82);
  box-shadow: 0 18px 60px rgba(42, 30, 20, 0.12);
}

.eyebrow {
  margin: 0 0 8px;
  color: #7b2f1d;
  font-size: 0.84rem;
  letter-spacing: 0;
}

h1 {
  margin: 0 0 12px;
  font-size: 2rem;
}

.lead {
  margin: 0;
  max-width: 680px;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .app-shell {
    padding: 16px;
  }

  .report-panel {
    padding: 20px;
  }
}
```

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and installation completes without dependency resolution errors.

- [ ] **Step 6: Verify the shell**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Commit bootstrap**

Run:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx src/styles.css
git commit -m "chore: bootstrap sect simulator prototype"
```

## Task 2: Define Domain Types, Initial State, And Hidden Stance Config

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/stanceConfig.ts`
- Create: `src/domain/initialState.ts`
- Create: `src/domain/__tests__/resolveTurn.test.ts`

- [ ] **Step 1: Add shared domain types**

Create `src/domain/types.ts`:

```ts
export type Axis = "人" | "财" | "物" | "势";

export type StanceName =
  | "广招"
  | "精培"
  | "严训"
  | "安抚"
  | "整肃"
  | "开源"
  | "节流"
  | "投资"
  | "赈济"
  | "搜刮"
  | "新建"
  | "升级"
  | "维护"
  | "专精"
  | "防御"
  | "扬名"
  | "结交"
  | "避世"
  | "震慑"
  | "占机";

export interface SectState {
  year: number;
  disciples: {
    total: number;
    elite: number;
    morale: number;
    loyalty: number;
    combat: number;
  };
  finance: {
    spiritStones: number;
    yearlyIncome: number;
    yearlyExpense: number;
  };
  facilities: {
    trainingGround: number;
    scripturePavilion: number;
    spiritField: number;
    alchemyRoom: number;
  };
  influence: {
    reputation: number;
    luck: number;
    threat: number;
  };
  history: string[];
  lastReport?: AnnualReport;
  gameOver?: GameOverState;
}

export interface GameOverState {
  reason: "弟子断绝" | "灵石枯竭" | "宗门离散";
  chronicle: string;
}

export interface ParsedDecree {
  axis: Axis;
  stance: StanceName;
  intensity: number;
  summary: string;
}

export interface NumericDelta {
  path: string;
  label: string;
  before: number;
  after: number;
  change: number;
}

export interface TurnFacts {
  decree: string;
  parsed: ParsedDecree;
  deltas: NumericDelta[];
  eventSeeds: string[];
  warnings: string[];
}

export interface AnnualReport {
  title: string;
  decree: string;
  events: string[];
  consequences: NumericDelta[];
  executiveSummary: string;
  warnings: string[];
  rating?: SectRating;
}

export interface SectRating {
  rank: "覆灭" | "勉强立足" | "小有名望" | "一方大宗" | "仙门新星";
  totalScore: number;
  axisScores: Record<Axis, number>;
  summary: string;
  turningPoints: string[];
}

export interface StanceEffect {
  axis: Axis;
  stance: StanceName;
  positive: string;
  cost: string;
  eventSeeds: string[];
  effects: Partial<{
    totalDisciples: number;
    eliteDisciples: number;
    morale: number;
    loyalty: number;
    combat: number;
    spiritStones: number;
    yearlyIncome: number;
    yearlyExpense: number;
    trainingGround: number;
    scripturePavilion: number;
    spiritField: number;
    alchemyRoom: number;
    reputation: number;
    luck: number;
    threat: number;
  }>;
}
```

- [ ] **Step 2: Add the hidden stance config**

Create `src/domain/stanceConfig.ts`:

```ts
import type { Axis, StanceEffect, StanceName } from "./types";

export const STANCE_CONFIG: Record<Axis, Record<string, StanceEffect>> = {
  人: {
    广招: {
      axis: "人",
      stance: "广招",
      positive: "弟子数量上升，声望小幅增加",
      cost: "消耗灵石，管理压力上升",
      eventSeeds: ["开山收徒", "散修投靠", "山门热闹"],
      effects: { totalDisciples: 3, spiritStones: -120, morale: -2, reputation: 4, yearlyExpense: 20 }
    },
    精培: {
      axis: "人",
      stance: "精培",
      positive: "精英弟子成长，战力质量上升",
      cost: "消耗灵石，人数增长缓慢",
      eventSeeds: ["闭关点拨", "内门选拔", "天才突破"],
      effects: { eliteDisciples: 1, combat: 8, spiritStones: -100, yearlyExpense: 15 }
    },
    严训: {
      axis: "人",
      stance: "严训",
      positive: "战力和威胁应对上升",
      cost: "士气与忠诚下降，有受伤隐患",
      eventSeeds: ["演武试炼", "弟子抱怨", "苦训成效"],
      effects: { combat: 12, morale: -7, loyalty: -4, threat: -2 }
    },
    安抚: {
      axis: "人",
      stance: "安抚",
      positive: "士气与忠诚上升，内忧风险下降",
      cost: "战力成长变慢，灵石小幅消耗",
      eventSeeds: ["宗主讲道", "抚恤弟子", "派系缓和"],
      effects: { morale: 10, loyalty: 8, spiritStones: -60, combat: 2 }
    },
    整肃: {
      axis: "人",
      stance: "整肃",
      positive: "纪律和效率上升，内忧下降",
      cost: "忠诚波动，声望可能下降",
      eventSeeds: ["清查门规", "惩戒执事", "派系震动"],
      effects: { loyalty: -3, morale: -4, combat: 6, yearlyExpense: -15, reputation: -2 }
    }
  },
  财: {
    开源: {
      axis: "财",
      stance: "开源",
      positive: "年度收入上升，长期财力增强",
      cost: "需要初期投入",
      eventSeeds: ["重开商路", "灵田增收", "丹药售卖"],
      effects: { spiritStones: -80, yearlyIncome: 80, reputation: 2 }
    },
    节流: {
      axis: "财",
      stance: "节流",
      positive: "支出下降，破产风险降低",
      cost: "士气小降，成长速度下降",
      eventSeeds: ["缩减用度", "账册清查", "库房封存"],
      effects: { yearlyExpense: -70, morale: -4, combat: -1 }
    },
    投资: {
      axis: "财",
      stance: "投资",
      positive: "未来收益上升",
      cost: "当前灵石大幅下降",
      eventSeeds: ["购置灵脉", "扩建产业", "商会往来"],
      effects: { spiritStones: -180, yearlyIncome: 120, luck: -1 }
    },
    赈济: {
      axis: "财",
      stance: "赈济",
      positive: "声望、气运和忠诚上升",
      cost: "灵石下降，短期收益较弱",
      eventSeeds: ["救济凡民", "扶助散修", "开仓施药"],
      effects: { spiritStones: -140, reputation: 8, luck: 5, loyalty: 5 }
    },
    搜刮: {
      axis: "财",
      stance: "搜刮",
      positive: "灵石快速上升",
      cost: "士气、声望、气运下降",
      eventSeeds: ["重税", "压榨附庸", "怨言四起"],
      effects: { spiritStones: 220, morale: -10, loyalty: -8, reputation: -8, luck: -5, threat: 4 }
    }
  },
  物: {
    新建: {
      axis: "物",
      stance: "新建",
      positive: "解锁或补足设施成长方向",
      cost: "灵石大幅消耗，维护压力上升",
      eventSeeds: ["动工扩建", "山门增筑", "匠修入山"],
      effects: { spiritStones: -160, trainingGround: 1, yearlyExpense: 25 }
    },
    升级: {
      axis: "物",
      stance: "升级",
      positive: "已有设施效果增强",
      cost: "灵石消耗，收益集中",
      eventSeeds: ["炼丹房扩炉", "藏经阁增典", "灵田改造"],
      effects: { spiritStones: -140, scripturePavilion: 1, yearlyIncome: 25, combat: 3 }
    },
    维护: {
      axis: "物",
      stance: "维护",
      positive: "设施稳定，事故风险下降",
      cost: "爆发收益较低",
      eventSeeds: ["修缮阵法", "整理库房", "检查炉火"],
      effects: { spiritStones: -70, morale: 3, luck: 2, yearlyExpense: -15 }
    },
    专精: {
      axis: "物",
      stance: "专精",
      positive: "某类设施收益显著上升",
      cost: "其他方向发展变慢",
      eventSeeds: ["丹道专修", "武修立宗", "藏经传承"],
      effects: { spiritStones: -120, alchemyRoom: 1, yearlyIncome: 55, reputation: 3 }
    },
    防御: {
      axis: "物",
      stance: "防御",
      positive: "威胁损失下降，评级安全感上升",
      cost: "灵石消耗，经济收益弱",
      eventSeeds: ["护山大阵", "巡山机关", "山门戒备"],
      effects: { spiritStones: -130, threat: -8, combat: 5 }
    }
  },
  势: {
    扬名: {
      axis: "势",
      stance: "扬名",
      positive: "声望和招募质量上升",
      cost: "外部关注上升",
      eventSeeds: ["论道扬名", "收服小派", "名声远播"],
      effects: { reputation: 12, eliteDisciples: 1, threat: 5 }
    },
    结交: {
      axis: "势",
      stance: "结交",
      positive: "支援机会增加，气运小升",
      cost: "消耗灵石和人情",
      eventSeeds: ["宗门往来", "礼聘盟友", "互换典籍"],
      effects: { spiritStones: -90, reputation: 5, luck: 4, threat: -2 }
    },
    避世: {
      axis: "势",
      stance: "避世",
      positive: "威胁压力下降，内修稳定",
      cost: "声望增长慢，机遇减少",
      eventSeeds: ["封山闭关", "低调隐修", "外务收束"],
      effects: { threat: -9, morale: 4, reputation: -3, yearlyIncome: -20 }
    },
    震慑: {
      axis: "势",
      stance: "震慑",
      positive: "威胁短期下降，战力威名上升",
      cost: "敌意积累，失败代价高",
      eventSeeds: ["斩妖立威", "强硬警告", "边境巡狩"],
      effects: { combat: 7, reputation: 5, threat: -5, luck: -2 }
    },
    占机: {
      axis: "势",
      stance: "占机",
      positive: "气运上升，风险缓和",
      cost: "收益偏间接",
      eventSeeds: ["占卜观星", "趋吉避凶", "预警异动"],
      effects: { luck: 8, threat: -3, spiritStones: -60 }
    }
  }
};

export function getStanceEffect(axis: Axis, stance: StanceName): StanceEffect {
  const effect = STANCE_CONFIG[axis][stance];
  if (!effect) {
    throw new Error(`未知姿态: ${axis}/${stance}`);
  }
  return effect;
}
```

- [ ] **Step 3: Add initial state and sample decrees**

Create `src/domain/initialState.ts`:

```ts
import type { SectState } from "./types";

export const SAMPLE_DECREES = [
  "广开山门，凡有灵根者皆可入我宗。",
  "闭门清修，先稳住弟子心气，不要争一时虚名。",
  "盘清账册，把灵石花在刀刃上。",
  "修缮山门，护山阵法不可再拖。",
  "遣人论道扬名，让四方知道我宗还未衰落。"
];

export function createInitialState(): SectState {
  return {
    year: 1,
    disciples: {
      total: 10,
      elite: 3,
      morale: 62,
      loyalty: 66,
      combat: 44
    },
    finance: {
      spiritStones: 500,
      yearlyIncome: 140,
      yearlyExpense: 110
    },
    facilities: {
      trainingGround: 0,
      scripturePavilion: 0,
      spiritField: 0,
      alchemyRoom: 0
    },
    influence: {
      reputation: 20,
      luck: 0,
      threat: 18
    },
    history: ["旧封印渐松，宗主闭关前留下十年整顿之期。"]
  };
}
```

- [ ] **Step 4: Add the first failing test for stance config integrity**

Create `src/domain/__tests__/resolveTurn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STANCE_CONFIG, getStanceEffect } from "../stanceConfig";

describe("hidden stance config", () => {
  it("defines five stances for each axis", () => {
    expect(Object.keys(STANCE_CONFIG.人)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.财)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.物)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.势)).toHaveLength(5);
  });

  it("returns a deterministic effect by axis and stance", () => {
    const effect = getStanceEffect("人", "广招");

    expect(effect.effects.totalDisciples).toBe(3);
    expect(effect.effects.spiritStones).toBe(-120);
    expect(effect.eventSeeds).toContain("开山收徒");
  });
});
```

- [ ] **Step 5: Run the tests**

Run:

```bash
npm test -- src/domain/__tests__/resolveTurn.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit domain foundation**

Run:

```bash
git add src/domain/types.ts src/domain/stanceConfig.ts src/domain/initialState.ts src/domain/__tests__/resolveTurn.test.ts
git commit -m "feat: add sect domain stance config"
```

## Task 3: Implement Deterministic Turn Resolution

**Files:**
- Create: `src/domain/resolveTurn.ts`
- Create: `src/domain/reportFacts.ts`
- Modify: `src/domain/__tests__/resolveTurn.test.ts`

- [ ] **Step 1: Add failing tests for turn resolution**

Append to `src/domain/__tests__/resolveTurn.test.ts`:

```ts
import { createInitialState } from "../initialState";
import { resolveTurn } from "../resolveTurn";

describe("resolveTurn", () => {
  it("applies a stance effect scaled by intensity and advances the year", () => {
    const state = createInitialState();

    const result = resolveTurn(state, "广开山门，今年重在收徒。", {
      axis: "人",
      stance: "广招",
      intensity: 0.7,
      summary: "放宽山门，快速扩充弟子。"
    });

    expect(result.nextState.year).toBe(2);
    expect(result.nextState.disciples.total).toBe(12);
    expect(result.nextState.finance.spiritStones).toBe(446);
    expect(result.facts.deltas.map((delta) => delta.label)).toContain("弟子总数");
    expect(result.facts.eventSeeds).toContain("开山收徒");
  });

  it("marks game over when disciples are gone", () => {
    const state = createInitialState();
    state.disciples.total = 0;

    const result = resolveTurn(state, "一切从简。", {
      axis: "财",
      stance: "节流",
      intensity: 0.5,
      summary: "压缩支出。"
    });

    expect(result.nextState.gameOver?.reason).toBe("弟子断绝");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/__tests__/resolveTurn.test.ts
```

Expected: test run fails because `../resolveTurn` does not exist.

- [ ] **Step 3: Implement fact helpers**

Create `src/domain/reportFacts.ts`:

```ts
import type { NumericDelta, SectState } from "./types";

type NumericPath = {
  path: string;
  label: string;
  read: (state: SectState) => number;
};

export const NUMERIC_PATHS: NumericPath[] = [
  { path: "disciples.total", label: "弟子总数", read: (state) => state.disciples.total },
  { path: "disciples.elite", label: "精英弟子", read: (state) => state.disciples.elite },
  { path: "disciples.morale", label: "士气", read: (state) => state.disciples.morale },
  { path: "disciples.loyalty", label: "忠诚", read: (state) => state.disciples.loyalty },
  { path: "disciples.combat", label: "战力", read: (state) => state.disciples.combat },
  { path: "finance.spiritStones", label: "灵石", read: (state) => state.finance.spiritStones },
  { path: "finance.yearlyIncome", label: "年收入", read: (state) => state.finance.yearlyIncome },
  { path: "finance.yearlyExpense", label: "年支出", read: (state) => state.finance.yearlyExpense },
  { path: "facilities.trainingGround", label: "演武场", read: (state) => state.facilities.trainingGround },
  { path: "facilities.scripturePavilion", label: "藏经阁", read: (state) => state.facilities.scripturePavilion },
  { path: "facilities.spiritField", label: "灵田", read: (state) => state.facilities.spiritField },
  { path: "facilities.alchemyRoom", label: "炼丹房", read: (state) => state.facilities.alchemyRoom },
  { path: "influence.reputation", label: "声望", read: (state) => state.influence.reputation },
  { path: "influence.luck", label: "气运", read: (state) => state.influence.luck },
  { path: "influence.threat", label: "威胁", read: (state) => state.influence.threat }
];

export function collectDeltas(before: SectState, after: SectState): NumericDelta[] {
  return NUMERIC_PATHS.map((item) => {
    const previous = item.read(before);
    const next = item.read(after);
    return {
      path: item.path,
      label: item.label,
      before: previous,
      after: next,
      change: next - previous
    };
  }).filter((delta) => delta.change !== 0);
}
```

- [ ] **Step 4: Implement turn resolution**

Create `src/domain/resolveTurn.ts`:

```ts
import { getStanceEffect } from "./stanceConfig";
import { collectDeltas } from "./reportFacts";
import type { ParsedDecree, SectState, TurnFacts } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaled = (value: number, intensity: number) => Math.round(value * clamp(intensity, 0.2, 1.2));

function cloneState(state: SectState): SectState {
  return JSON.parse(JSON.stringify(state)) as SectState;
}

function applyDelta(state: SectState, key: string, value: number) {
  switch (key) {
    case "totalDisciples":
      state.disciples.total = Math.max(0, state.disciples.total + value);
      break;
    case "eliteDisciples":
      state.disciples.elite = clamp(state.disciples.elite + value, 0, state.disciples.total);
      break;
    case "morale":
      state.disciples.morale = clamp(state.disciples.morale + value, 0, 100);
      break;
    case "loyalty":
      state.disciples.loyalty = clamp(state.disciples.loyalty + value, 0, 100);
      break;
    case "combat":
      state.disciples.combat = Math.max(0, state.disciples.combat + value);
      break;
    case "spiritStones":
      state.finance.spiritStones += value;
      break;
    case "yearlyIncome":
      state.finance.yearlyIncome = Math.max(0, state.finance.yearlyIncome + value);
      break;
    case "yearlyExpense":
      state.finance.yearlyExpense = Math.max(0, state.finance.yearlyExpense + value);
      break;
    case "trainingGround":
      state.facilities.trainingGround = clamp(state.facilities.trainingGround + value, 0, 3);
      break;
    case "scripturePavilion":
      state.facilities.scripturePavilion = clamp(state.facilities.scripturePavilion + value, 0, 3);
      break;
    case "spiritField":
      state.facilities.spiritField = clamp(state.facilities.spiritField + value, 0, 3);
      break;
    case "alchemyRoom":
      state.facilities.alchemyRoom = clamp(state.facilities.alchemyRoom + value, 0, 3);
      break;
    case "reputation":
      state.influence.reputation = clamp(state.influence.reputation + value, 0, 100);
      break;
    case "luck":
      state.influence.luck = clamp(state.influence.luck + value, -50, 50);
      break;
    case "threat":
      state.influence.threat = Math.max(0, state.influence.threat + value);
      break;
  }
}

function applyAnnualEconomy(state: SectState) {
  state.finance.spiritStones += state.finance.yearlyIncome - state.finance.yearlyExpense;
  state.influence.threat = Math.max(0, state.influence.threat + 2);
}

function detectGameOver(state: SectState) {
  if (state.disciples.total <= 0) {
    state.gameOver = { reason: "弟子断绝", chronicle: "山门灯火渐熄，传承无人续接。" };
  } else if (state.finance.spiritStones <= 0 && state.finance.yearlyIncome < state.finance.yearlyExpense) {
    state.gameOver = { reason: "灵石枯竭", chronicle: "库藏见底，供奉断绝，众弟子各寻出路。" };
  } else if (state.disciples.morale <= 5 && state.disciples.loyalty <= 10) {
    state.gameOver = { reason: "宗门离散", chronicle: "人心散尽，长老再难维系山门。" };
  }
}

export function resolveTurn(
  state: SectState,
  decree: string,
  parsed: ParsedDecree
): { nextState: SectState; facts: TurnFacts } {
  const before = cloneState(state);
  const nextState = cloneState(state);
  const effect = getStanceEffect(parsed.axis, parsed.stance);

  for (const [key, value] of Object.entries(effect.effects)) {
    applyDelta(nextState, key, scaled(value, parsed.intensity));
  }

  applyAnnualEconomy(nextState);
  nextState.year += 1;
  nextState.history = [
    ...nextState.history,
    `第${state.year}年：${parsed.axis}/${parsed.stance}，${parsed.summary}`
  ].slice(-12);

  detectGameOver(nextState);

  const facts: TurnFacts = {
    decree,
    parsed,
    deltas: collectDeltas(before, nextState),
    eventSeeds: effect.eventSeeds,
    warnings: nextState.gameOver ? [nextState.gameOver.chronicle] : []
  };

  return { nextState, facts };
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/domain/__tests__/resolveTurn.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit resolver**

Run:

```bash
git add src/domain/resolveTurn.ts src/domain/reportFacts.ts src/domain/__tests__/resolveTurn.test.ts
git commit -m "feat: resolve sect turns from hidden stances"
```

## Task 4: Implement 10-Year Rating

**Files:**
- Create: `src/domain/rating.ts`
- Create: `src/domain/__tests__/rating.test.ts`

- [ ] **Step 1: Add rating tests**

Create `src/domain/__tests__/rating.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { rateSect } from "../rating";

describe("rateSect", () => {
  it("calculates four axis scores and a rank", () => {
    const state = createInitialState();
    state.disciples.total = 18;
    state.disciples.elite = 5;
    state.disciples.combat = 82;
    state.finance.spiritStones = 900;
    state.finance.yearlyIncome = 260;
    state.finance.yearlyExpense = 120;
    state.facilities.trainingGround = 2;
    state.facilities.scripturePavilion = 1;
    state.facilities.spiritField = 2;
    state.facilities.alchemyRoom = 1;
    state.influence.reputation = 58;
    state.influence.luck = 12;
    state.influence.threat = 20;
    state.history = ["第1年：广招弟子。", "第2年：整顿财计。", "第3年：修缮山门。"];

    const rating = rateSect(state);

    expect(rating.axisScores.人).toBeGreaterThan(60);
    expect(rating.axisScores.财).toBeGreaterThan(70);
    expect(rating.totalScore).toBeGreaterThan(60);
    expect(rating.turningPoints).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/domain/__tests__/rating.test.ts
```

Expected: fails because `../rating` does not exist.

- [ ] **Step 3: Implement rating**

Create `src/domain/rating.ts`:

```ts
import type { Axis, SectRating, SectState } from "./types";

const clampScore = (value: number) => Math.round(Math.min(100, Math.max(0, value)));

export function rateSect(state: SectState): SectRating {
  const axisScores: Record<Axis, number> = {
    人: clampScore(
      state.disciples.total * 2 +
        state.disciples.elite * 6 +
        state.disciples.morale * 0.25 +
        state.disciples.loyalty * 0.25 +
        state.disciples.combat * 0.45
    ),
    财: clampScore(
      state.finance.spiritStones / 12 +
        state.finance.yearlyIncome * 0.25 -
        state.finance.yearlyExpense * 0.12
    ),
    物: clampScore(
      (state.facilities.trainingGround +
        state.facilities.scripturePavilion +
        state.facilities.spiritField +
        state.facilities.alchemyRoom) *
        18
    ),
    势: clampScore(state.influence.reputation * 0.8 + state.influence.luck * 0.5 - state.influence.threat * 0.25 + 20)
  };

  const shortfallPenalty = Math.min(...Object.values(axisScores)) * 0.18;
  const average = Object.values(axisScores).reduce((sum, score) => sum + score, 0) / 4;
  const totalScore = clampScore(average * 0.82 + shortfallPenalty);

  const rank: SectRating["rank"] =
    totalScore < 25
      ? "覆灭"
      : totalScore < 45
        ? "勉强立足"
        : totalScore < 65
          ? "小有名望"
          : totalScore < 82
            ? "一方大宗"
            : "仙门新星";

  const weakestAxis = Object.entries(axisScores).sort((a, b) => a[1] - b[1])[0][0] as Axis;
  const strongestAxis = Object.entries(axisScores).sort((a, b) => b[1] - a[1])[0][0] as Axis;

  return {
    rank,
    totalScore,
    axisScores,
    summary: `十年大考显示，贵宗以${strongestAxis}见长，而${weakestAxis}仍是短板。`,
    turningPoints: state.history.slice(-3).concat(["第十年：宗门评级大考落定。"]).slice(0, 3)
  };
}
```

- [ ] **Step 4: Run rating tests**

Run:

```bash
npm test -- src/domain/__tests__/rating.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit rating**

Run:

```bash
git add src/domain/rating.ts src/domain/__tests__/rating.test.ts
git commit -m "feat: add ten-year sect rating"
```

## Task 5: Add AI Schemas, Prompts, And Provider Boundary

**Files:**
- Create: `server/ai/schemas.ts`
- Create: `server/ai/prompts.ts`
- Create: `server/ai/fallback.ts`
- Create: `server/ai/openaiClient.ts`
- Create: `server/__tests__/schemas.test.ts`

- [ ] **Step 1: Add schema tests**

Create `server/__tests__/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ParsedDecreeSchema, ReportDraftSchema } from "../ai/schemas";

describe("AI schemas", () => {
  it("accepts a valid parsed decree", () => {
    const parsed = ParsedDecreeSchema.parse({
      axis: "人",
      stance: "广招",
      intensity: 0.7,
      summary: "放宽山门，快速扩充弟子。"
    });

    expect(parsed.stance).toBe("广招");
  });

  it("rejects a stance outside the allowed list", () => {
    expect(() =>
      ParsedDecreeSchema.parse({
        axis: "人",
        stance: "飞升",
        intensity: 0.7,
        summary: "越界姿态。"
      })
    ).toThrow();
  });

  it("accepts bounded report text", () => {
    const report = ReportDraftSchema.parse({
      title: "第1年年报",
      events: ["山门重开，散修闻讯而来。", "库藏因安置新人而略减。"],
      executiveSummary: "执事长老奉命广招弟子，宗门声势渐起。"
    });

    expect(report.events).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- server/__tests__/schemas.test.ts
```

Expected: fails because `../ai/schemas` does not exist.

- [ ] **Step 3: Implement schemas**

Create `server/ai/schemas.ts`:

```ts
import { z } from "zod";

export const AxisSchema = z.enum(["人", "财", "物", "势"]);

export const StanceSchema = z.enum([
  "广招",
  "精培",
  "严训",
  "安抚",
  "整肃",
  "开源",
  "节流",
  "投资",
  "赈济",
  "搜刮",
  "新建",
  "升级",
  "维护",
  "专精",
  "防御",
  "扬名",
  "结交",
  "避世",
  "震慑",
  "占机"
]);

export const ParsedDecreeSchema = z.object({
  axis: AxisSchema,
  stance: StanceSchema,
  intensity: z.number().min(0.2).max(1.2),
  summary: z.string().min(4).max(120)
});

export const ReportDraftSchema = z.object({
  title: z.string().min(4).max(40),
  events: z.array(z.string().min(8).max(160)).min(2).max(4),
  executiveSummary: z.string().min(8).max(180)
});

export type ParsedDecreeOutput = z.infer<typeof ParsedDecreeSchema>;
export type ReportDraftOutput = z.infer<typeof ReportDraftSchema>;
```

- [ ] **Step 4: Implement prompts**

Create `server/ai/prompts.ts`:

```ts
import type { TurnFacts } from "../../src/domain/types";

export const DECREE_SYSTEM_PROMPT = `你是宗门执事长老，只负责把宗主自然语言谕令解析为可计算意图。
只能输出 JSON。axis 必须是 人、财、物、势 之一。
stance 必须从对应方向的隐藏姿态中选择：
人：广招、精培、严训、安抚、整肃。
财：开源、节流、投资、赈济、搜刮。
物：新建、升级、维护、专精、防御。
势：扬名、结交、避世、震慑、占机。
intensity 表示执行强度，范围 0.2 到 1.2。
不要直接改数值，不要生成剧情。`;

export function buildDecreeUserPrompt(decree: string) {
  return `宗主谕令：${decree}`;
}

export const REPORT_SYSTEM_PROMPT = `你是宗门年报撰写者。你只能根据给定事实写本年大事。
不得写出事实中没有授权的重大变化，例如弟子死亡、获得神器、新设施落成、外敌入侵。
输出 JSON，包含 title、events、executiveSummary。events 需要 2 到 4 条。`;

export function buildReportUserPrompt(facts: TurnFacts) {
  return JSON.stringify(
    {
      decree: facts.decree,
      parsed: facts.parsed,
      deltas: facts.deltas,
      eventSeeds: facts.eventSeeds,
      warnings: facts.warnings
    },
    null,
    2
  );
}
```

- [ ] **Step 5: Implement deterministic test-mode fallback**

Create `server/ai/fallback.ts`:

```ts
import type { AnnualReport, ParsedDecree, TurnFacts } from "../../src/domain/types";

export function parseDecreeFallback(decree: string): ParsedDecree {
  if (decree.includes("灵石") || decree.includes("账") || decree.includes("财")) {
    return { axis: "财", stance: decree.includes("搜") ? "搜刮" : "开源", intensity: 0.7, summary: "整顿宗门财计。" };
  }
  if (decree.includes("修") || decree.includes("阵") || decree.includes("建")) {
    return { axis: "物", stance: decree.includes("防") || decree.includes("阵") ? "防御" : "升级", intensity: 0.7, summary: "调整宗门设施。" };
  }
  if (decree.includes("名") || decree.includes("盟") || decree.includes("封山")) {
    return { axis: "势", stance: decree.includes("封山") ? "避世" : "扬名", intensity: 0.7, summary: "调整宗门对外姿态。" };
  }
  return { axis: "人", stance: decree.includes("严") ? "严训" : "广招", intensity: 0.7, summary: "调整弟子事务。" };
}

export function draftReportFallback(facts: TurnFacts): Omit<AnnualReport, "decree" | "consequences" | "warnings"> {
  const deltaText = facts.deltas
    .slice(0, 3)
    .map((delta) => `${delta.label}${delta.change > 0 ? "+" : ""}${delta.change}`)
    .join("，");

  return {
    title: `第${facts.parsed.axis}策年报`,
    events: [
      `执事长老奉命推行“${facts.parsed.stance}”，宗门上下以${facts.eventSeeds[0]}为本年要务。`,
      deltaText ? `年终清点可见：${deltaText}。` : "年终清点未见显著波动。"
    ],
    executiveSummary: facts.parsed.summary
  };
}
```

- [ ] **Step 6: Implement OpenAI boundary**

Create `server/ai/openaiClient.ts`:

```ts
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { TurnFacts } from "../../src/domain/types";
import { ParsedDecreeSchema, ReportDraftSchema } from "./schemas";
import { buildDecreeUserPrompt, buildReportUserPrompt, DECREE_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./prompts";
import { draftReportFallback, parseDecreeFallback } from "./fallback";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export async function parseDecreeWithAI(decree: string) {
  if (process.env.AI_TEST_MODE === "true") {
    return parseDecreeFallback(decree);
  }

  const client = getClient();
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: DECREE_SYSTEM_PROMPT },
      { role: "user", content: buildDecreeUserPrompt(decree) }
    ],
    text: {
      format: zodTextFormat(ParsedDecreeSchema, "parsed_decree")
    }
  });

  return ParsedDecreeSchema.parse(response.output_parsed);
}

export async function draftReportWithAI(facts: TurnFacts) {
  if (process.env.AI_TEST_MODE === "true") {
    return draftReportFallback(facts);
  }

  const client = getClient();
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: buildReportUserPrompt(facts) }
    ],
    text: {
      format: zodTextFormat(ReportDraftSchema, "report_draft")
    }
  });

  return ReportDraftSchema.parse(response.output_parsed);
}
```

- [ ] **Step 7: Run schema tests**

Run:

```bash
npm test -- server/__tests__/schemas.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit AI boundary**

Run:

```bash
git add server/ai/schemas.ts server/ai/prompts.ts server/ai/fallback.ts server/ai/openaiClient.ts server/__tests__/schemas.test.ts
git commit -m "feat: add ai parsing and narration boundary"
```

## Task 6: Add API Endpoint With Atomic Turn Advance

**Files:**
- Create: `server/index.ts`
- Create: `src/services/apiClient.ts`

- [ ] **Step 1: Add the Express server**

Create `server/index.ts`:

```ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createInitialState } from "../src/domain/initialState";
import { rateSect } from "../src/domain/rating";
import { resolveTurn } from "../src/domain/resolveTurn";
import type { AnnualReport, SectState } from "../src/domain/types";
import { draftReportWithAI, parseDecreeWithAI } from "./ai/openaiClient";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));

app.get("/api/new-game", (_req, res) => {
  res.json({ state: createInitialState() });
});

app.post("/api/turn", async (req, res) => {
  try {
    const { state, decree } = req.body as { state?: SectState; decree?: string };
    if (!state || typeof decree !== "string" || decree.trim().length < 2) {
      res.status(400).json({ error: "请输入至少两个字的宗主谕令。" });
      return;
    }

    const parsed = await parseDecreeWithAI(decree);
    const resolved = resolveTurn(state, decree, parsed);
    const reportDraft = await draftReportWithAI(resolved.facts);

    const rating = resolved.nextState.year === 11 ? rateSect(resolved.nextState) : undefined;
    const report: AnnualReport = {
      ...reportDraft,
      decree,
      consequences: resolved.facts.deltas,
      warnings: resolved.facts.warnings,
      rating
    };

    const nextState: SectState = {
      ...resolved.nextState,
      lastReport: report
    };

    res.json({ state: nextState, facts: resolved.facts, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    res.status(message.includes("OPENAI_API_KEY") ? 503 : 500).json({
      error: message.includes("OPENAI_API_KEY")
        ? "缺少服务端 OPENAI_API_KEY，无法进行联网 AI 试玩。"
        : `本回合演算失败：${message}`
    });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../dist")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

if (process.env.NODE_ENV === "production") {
  app.use((_req, res) => {
    res.sendFile(path.resolve(__dirname, "../dist/index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Sect simulator listening at http://127.0.0.1:${port}`);
});
```

- [ ] **Step 2: Add browser API client**

Create `src/services/apiClient.ts`:

```ts
import type { AnnualReport, SectState, TurnFacts } from "../domain/types";

export interface TurnResponse {
  state: SectState;
  facts: TurnFacts;
  report: AnnualReport;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "请求失败");
  }
  return body as T;
}

export async function fetchNewGame(): Promise<SectState> {
  const response = await fetch("/api/new-game");
  const body = await parseResponse<{ state: SectState }>(response);
  return body.state;
}

export async function submitTurn(state: SectState, decree: string): Promise<TurnResponse> {
  const response = await fetch("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, decree })
  });

  return parseResponse<TurnResponse>(response);
}
```

- [ ] **Step 3: Verify API in test mode**

Run:

```bash
AI_TEST_MODE=true npm run dev
```

Expected: server logs `Sect simulator listening at http://127.0.0.1:8787`.

In a second terminal, run:

```bash
curl -s http://127.0.0.1:8787/api/new-game
```

Expected: response JSON contains `"spiritStones":500`.

Then run:

```bash
curl -s -X POST http://127.0.0.1:8787/api/turn \
  -H 'Content-Type: application/json' \
  -d '{"state":{"year":1,"disciples":{"total":10,"elite":3,"morale":62,"loyalty":66,"combat":44},"finance":{"spiritStones":500,"yearlyIncome":140,"yearlyExpense":110},"facilities":{"trainingGround":0,"scripturePavilion":0,"spiritField":0,"alchemyRoom":0},"influence":{"reputation":20,"luck":0,"threat":18},"history":["旧封印渐松，宗主闭关前留下十年整顿之期。"]},"decree":"广开山门，凡有灵根者皆可入我宗。"}'
```

Expected: response JSON contains `"year":2`, `"stance":"广招"`, and `"report"`.

- [ ] **Step 4: Commit API**

Run:

```bash
git add server/index.ts src/services/apiClient.ts
git commit -m "feat: add turn api endpoint"
```

## Task 7: Build The Playable Report UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/services/saveStore.ts`

- [ ] **Step 1: Add save store**

Create `src/services/saveStore.ts`:

```ts
import type { SectState } from "../domain/types";

const SAVE_KEY = "sect-simulator-save-v1";

export function loadSavedState(): SectState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SectState;
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function saveState(state: SectState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearSavedState() {
  localStorage.removeItem(SAVE_KEY);
}
```

- [ ] **Step 2: Replace the app shell with the game UI**

Replace `src/App.tsx` with:

```tsx
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
      fetchNewGame().then(setState).catch((err) => setError(err.message));
    }
  }, [state]);

  const canSubmit = useMemo(() => decree.trim().length >= 2 && !!state && !isLoading && !state.gameOver, [decree, isLoading, state]);

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
    return <main className="app-shell"><section className="report-panel">正在铺开宗门卷宗...</section></main>;
  }

  const report = state.lastReport;

  return (
    <main className="app-shell">
      <section className="report-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">闭关宗主案前卷宗</p>
            <h1>宗门模拟器</h1>
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
```

- [ ] **Step 3: Replace CSS with full UI styles**

Keep the existing base styles in `src/styles.css` and append:

```css
.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.ghost-button,
.primary-button,
.samples button {
  border: 1px solid rgba(91, 54, 32, 0.28);
  border-radius: 6px;
  background: #fff8e8;
  color: #442718;
  cursor: pointer;
}

.ghost-button {
  padding: 9px 12px;
}

.primary-button {
  width: 100%;
  margin-top: 14px;
  padding: 12px 16px;
  background: #7b2f1d;
  color: #fffaf0;
  font-weight: 700;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0;
}

.stat,
.annual-report,
.decree-box,
.game-over {
  border: 1px solid rgba(91, 54, 32, 0.18);
  border-radius: 8px;
  background: rgba(255, 250, 238, 0.72);
}

.stat {
  padding: 12px;
}

.stat span {
  display: block;
  margin-bottom: 6px;
  color: #7c6b5c;
  font-size: 0.84rem;
}

.stat strong {
  font-size: 1.05rem;
}

.annual-report,
.decree-box,
.game-over {
  margin-top: 16px;
  padding: 18px;
}

.annual-report h2,
.decree-box h2,
.game-over h2 {
  margin: 18px 0 10px;
  font-size: 1.12rem;
}

blockquote {
  margin: 0;
  padding: 12px 14px;
  border-left: 4px solid #7b2f1d;
  background: rgba(123, 47, 29, 0.08);
  line-height: 1.7;
}

.event-list {
  margin: 0;
  padding-left: 22px;
  line-height: 1.8;
}

.delta-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.delta-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(77, 57, 38, 0.07);
}

.positive strong {
  color: #1d6b45;
}

.negative strong {
  color: #9a3325;
}

.summary,
.muted {
  color: #67584b;
  line-height: 1.7;
}

textarea {
  width: 100%;
  min-height: 104px;
  resize: vertical;
  padding: 12px;
  border: 1px solid rgba(91, 54, 32, 0.28);
  border-radius: 6px;
  background: #fffdf6;
  color: #241b14;
  line-height: 1.6;
}

.samples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.samples button {
  padding: 8px 10px;
  text-align: left;
}

.error {
  color: #a6261d;
  line-height: 1.6;
}

.rating {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed rgba(91, 54, 32, 0.28);
}

@media (max-width: 720px) {
  .topbar {
    flex-direction: column;
  }

  .stat-grid,
  .delta-list {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run typecheck and build**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 5: Manual browser verification in test mode**

Run:

```bash
AI_TEST_MODE=true npm run dev
```

Open `http://127.0.0.1:8787`.

Expected:
- The app loads a starting sect state.
- Clicking a sample decree fills the textarea.
- Submitting advances from year 1 to year 2.
- The annual report shows 宗主谕令、本年大事、执行后果.
- Refresh keeps the saved state.
- 重开 clears the save and starts from year 1.

- [ ] **Step 6: Commit UI**

Run:

```bash
git add src/App.tsx src/styles.css src/services/saveStore.ts
git commit -m "feat: build playable annual report ui"
```

## Task 8: Verify Real AI Path And Document Runtime Setup

**Files:**
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Add environment example**

Create `.env.example`:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
PORT=8787
```

- [ ] **Step 2: Add README**

Create `README.md`:

```md
# 宗门模拟器网页试玩原型

这是一个 AI-native 纯数值驱动宗门模拟游戏原型。玩家每年输入一条宗主谕令，AI 将其解析为隐藏姿态，规则系统结算数值，AI 再根据事实边界生成年报。

## 本地运行

```bash
npm install
cp .env.example .env
```

在 `.env` 中填入服务端 `OPENAI_API_KEY`。不要把 `.env` 提交到仓库。

```bash
npm run dev
```

打开 `http://127.0.0.1:8787`。

## 测试模式

没有 AI Key 时，可以用测试模式验证界面和规则闭环：

```bash
AI_TEST_MODE=true npm run dev
```

测试模式只用于开发验证，不代表正式联网 AI 体验。

## 验证

```bash
npm test
npm run typecheck
npm run build
```

## 密钥安全

`OPENAI_API_KEY` 只允许保存在 `.env` 或部署平台密钥配置中。前端代码、提交历史、年报文本和调试输出都不得包含 API Key。
```

- [ ] **Step 3: Verify `.env` is ignored**

Run:

```bash
test -f .gitignore && cat .gitignore
```

If `.gitignore` does not exist, create it with:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
.superpowers/
```

If `.gitignore` exists, ensure it contains the same six patterns.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all three commands exit with code 0.

- [ ] **Step 5: Verify real AI path**

Run with a real key present in `.env`:

```bash
npm run dev
```

Open `http://127.0.0.1:8787`, submit:

```text
闭门清修，先稳住弟子心气，不要争一时虚名。
```

Expected:
- The request succeeds without `AI_TEST_MODE=true`.
- The year advances by 1.
- The report events stay within listed numeric consequences.
- No API Key appears in browser HTML, network JSON response, console logs, or committed files.

- [ ] **Step 6: Commit docs and runtime setup**

Run:

```bash
git add .env.example .gitignore README.md
git commit -m "docs: add prototype runtime setup"
```

## Task 9: Final Review Checklist

**Files:**
- Inspect: all files changed in the branch.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Inspect git status**

Run:

```bash
git status --short
```

Expected: no uncommitted tracked source files. Untracked local `.env` may exist and must remain uncommitted.

- [ ] **Step 3: Scan for leaked secrets**

Run:

```bash
git grep -n "sk-" -- .
```

Expected: no matches.

Run:

```bash
git grep -n "OPENAI_API_KEY" -- . ':!.env.example' ':!README.md'
```

Expected: references only in server-side code or documentation; no actual key values.

- [ ] **Step 4: Manual gameplay smoke test**

Run:

```bash
AI_TEST_MODE=true npm run dev
```

Open `http://127.0.0.1:8787` and submit 10 sample decrees.

Expected:
- The app reaches the 10-year rating report after the 10th submitted decree.
- The UI remains responsive.
- Every report contains 宗主谕令、本年大事、执行后果.
- The rating section appears once the state reaches year 11.

- [ ] **Step 5: Summarize completion**

Write a final implementation summary that includes:

- What was built.
- Verification commands and results.
- Whether real AI path was tested or only `AI_TEST_MODE=true`.
- Any remaining product questions, especially hidden stance tuning and rating balance.

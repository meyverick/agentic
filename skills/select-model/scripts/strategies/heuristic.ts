import {
  THINKING_LEVEL_ORDER,
  type ThinkingLevel,
  type ModelCatalog,
  type SelectionInput,
  type SelectionResult,
  type SelectorStrategy,
} from "./types.js";

export function clampThinkingLevel(
  target: ThinkingLevel,
  allowedLevels: ThinkingLevel[]
): ThinkingLevel {
  if (allowedLevels.length === 0) return "off";
  if (allowedLevels.includes(target)) return target;

  const targetIdx = THINKING_LEVEL_ORDER.indexOf(target);
  let closest = allowedLevels[0];
  let minDiff = Infinity;

  for (const lvl of allowedLevels) {
    const idx = THINKING_LEVEL_ORDER.indexOf(lvl);
    const diff = Math.abs(idx - targetIdx);
    if (diff < minDiff) {
      minDiff = diff;
      closest = lvl;
    }
  }

  return closest;
}

const HEAVY_KEYWORDS = [
  "architecture",
  "architect",
  "distributed",
  "concurrency",
  "race condition",
  "deadlock",
  "memory leak",
  "protocol",
  "migration",
  "refactor",
  "redesign",
  "state machine",
  "soundness",
  "invariants",
];

const MODERATE_KEYWORDS = [
  "feature",
  "implement",
  "endpoint",
  "handler",
  "parser",
  "database",
  "schema",
  "optimize",
  "performance",
  "async",
  "module",
  "adapter",
];

const LIGHT_KEYWORDS = [
  "typo",
  "comment",
  "docs",
  "documentation",
  "readme",
  "formatting",
  "lint",
  "rename",
  "bump",
  "spelling",
];

export function computeComplexityScore(input: SelectionInput): {
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;
  const promptLower = input.prompt.toLowerCase();

  for (const kw of HEAVY_KEYWORDS) {
    if (promptLower.includes(kw)) {
      score += 5;
      factors.push(`heavy keyword "${kw}" (+5)`);
      break;
    }
  }

  for (const kw of MODERATE_KEYWORDS) {
    if (promptLower.includes(kw)) {
      score += 3;
      factors.push(`moderate keyword "${kw}" (+3)`);
      break;
    }
  }

  for (const kw of LIGHT_KEYWORDS) {
    if (promptLower.includes(kw)) {
      score -= 3;
      factors.push(`light keyword "${kw}" (-3)`);
      break;
    }
  }

  if (input.prompt.length > 500) {
    score += 2;
    factors.push("prompt length > 500 chars (+2)");
  }
  if (input.prompt.includes("```")) {
    score += 2;
    factors.push("prompt contains code blocks (+2)");
  }

  const { context } = input;
  if (context.totalFiles > 5) {
    score += 5;
    factors.push(`reference file count (${context.totalFiles}) > 5 (+5)`);
  } else if (context.totalFiles > 1) {
    score += 2;
    factors.push(`reference file count (${context.totalFiles}) > 1 (+2)`);
  }

  if (context.totalLines > 500) {
    score += 3;
    factors.push(`reference total lines (${context.totalLines}) > 500 (+3)`);
  }

  return { score, factors };
}

function resolveModelForTier(
  tier: "light" | "standard" | "heavy",
  catalog: ModelCatalog
): { model: string; provider: string; defaultLevel: ThinkingLevel } {
  const models = catalog.models;

  const candidatePriorities: Record<"light" | "standard" | "heavy", string[]> = {
    light: [
      "gemini-3.5-flash-lite",
      "poolside/laguna-s-2.1-free",
      "inclusionai/ling-3.0-flash-sante:free",
      "step-5-preview-free",
      "deepseek-v4.1-flash",
    ],
    standard: [
      "deepseek-v4.1-flash",
      "gemini-3.8-flash",
      "mimo-v2.6-flash",
      "inclusionai/ling-3.1-flash:free",
      "longcat-2.5-preview-free",
    ],
    heavy: [
      "gpt-6-luna",
      "gemini-4-argon",
      "muse-spark-1.3-contributor",
      "mimo-v2.6-pro",
      "stealth/glyph-cluster:free",
    ],
  };

  const priorityList = candidatePriorities[tier];

  for (const candidate of priorityList) {
    if (models[candidate]) {
      return {
        model: candidate,
        provider: models[candidate].provider,
        defaultLevel: tier === "heavy" ? "high" : tier === "standard" ? "medium" : "off",
      };
    }
  }

  // Fallback if specific named models are not in catalog
  const allModelKeys = Object.keys(models);
  if (allModelKeys.length === 0) {
    throw new Error("Model catalog is empty; cannot select model.");
  }

  if (tier === "heavy") {
    // Pick model with highest available thinking level
    for (const key of allModelKeys) {
      const levels = models[key].levels;
      if (levels.includes("max") || levels.includes("xhigh") || levels.includes("high")) {
        return { model: key, provider: models[key].provider, defaultLevel: "high" };
      }
    }
  }

  if (tier === "light") {
    // Pick model with lowest available thinking level or 'off'
    for (const key of allModelKeys) {
      const levels = models[key].levels;
      if (levels.includes("off") || levels.includes("minimal")) {
        return { model: key, provider: models[key].provider, defaultLevel: "off" };
      }
    }
  }

  const defaultKey = allModelKeys[0];
  return {
    model: defaultKey,
    provider: models[defaultKey].provider,
    defaultLevel: "medium",
  };
}

export class HeuristicStrategy implements SelectorStrategy {
  readonly name = "heuristic" as const;

  async select(input: SelectionInput): Promise<SelectionResult> {
    const { score, factors } = computeComplexityScore(input);

    let tier: "light" | "standard" | "heavy";
    let confidence: number;

    if (score >= 8) {
      tier = "heavy";
      confidence = 0.94;
    } else if (score >= 3) {
      tier = "standard";
      confidence = 0.90;
    } else {
      tier = "light";
      confidence = 0.88;
    }

    const { model, provider, defaultLevel } = resolveModelForTier(tier, input.catalog);
    const entry = input.catalog.models[model];
    const clampedLevel = clampThinkingLevel(defaultLevel, entry.levels);

    const reasoning = `Heuristic evaluation classified task as ${tier} (score: ${score}). Factors: ${
      factors.length > 0 ? factors.join("; ") : "default baseline"
    }. Clamped thinking level to "${clampedLevel}" supported by ${model}.`;

    return {
      model,
      provider,
      thinking_level: clampedLevel,
      strategy_used: "heuristic",
      confidence,
      reasoning,
    };
  }
}

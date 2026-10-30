export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export const THINKING_LEVEL_ORDER: readonly ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export interface ModelCatalogEntry {
  provider: string;
  description: string;
  levels: ThinkingLevel[];
}

export interface ModelCatalog {
  models: Record<string, ModelCatalogEntry>;
}

export interface ScannedFile {
  path: string;
  content: string;
  lineCount: number;
  byteSize: number;
}

export interface ScannedContext {
  files: ScannedFile[];
  totalFiles: number;
  totalBytes: number;
  totalLines: number;
  truncated: boolean;
  excludedPaths: string[];
}

export interface SelectionInput {
  prompt: string;
  context: ScannedContext;
  catalog: ModelCatalog;
}

export interface SelectionResult {
  model: string;
  provider: string;
  thinking_level: ThinkingLevel;
  strategy_used: "jev" | "heuristic";
  confidence: number;
  reasoning: string;
}

export interface SelectorStrategy {
  readonly name: "jev" | "heuristic";
  select(input: SelectionInput): Promise<SelectionResult>;
}

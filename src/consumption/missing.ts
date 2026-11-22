import type { Agent, Catalog, FamilyMember, Run } from "../types";

export type Period = 7 | 30;
export type Grouping = "function" | "agent" | "model";

export interface DailyTokenUsage {
  date: string;
  segments: { key: string; label: string; tokens: number }[];
}

export interface TokenUsage {
  input?: number;
  output?: number;
  cache?: number;
  total?: number;
}

export interface ProviderLimits {
  plan?: string;
  windows: { label: string; percent: number }[];
}

export interface MonthlyPlatformUsage {
  platformCents: number;
  currency: string;
  month: string;
}

// Unique point de branchement des champs absents de l’API actuelle.
// Les jetons éventuellement annoncés par un agent ne sont pas des mesures.
// Ne jamais remplir ces fonctions avec des estimations ou des exemples.
export function getDailyTokenUsage(
  _runs: Run[],
  _period: Period,
  _grouping: Grouping,
): DailyTokenUsage[] {
  return [];
}

export function getRunTokens(_run: Run | FamilyMember): TokenUsage | undefined {
  return undefined;
}

export function getProviderLimits(_agent: Agent): ProviderLimits | undefined {
  return undefined;
}

export function getOverviewTokens(
  _runs: Run[],
  _period: Period,
): TokenUsage | undefined {
  return undefined;
}

export function getRunPeriodTokens(
  _run: Run,
  _period: Period,
): number | undefined {
  return undefined;
}

export function getMonthlyPlatformUsage(
  _catalog: Catalog,
): MonthlyPlatformUsage | undefined {
  return undefined;
}

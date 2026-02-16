import * as fs from "node:fs";
import * as path from "node:path";
import type { EvoClaudeConfig } from "./types";

const DEFAULT_CONFIG: EvoClaudeConfig = {
  skillLanguage: "auto",
  skillsOutputDir: "project",
};

/**
 * Get Anthropic API key from environment
 * Claude Code plugins can access the configured API key via environment variable
 */
export function getAnthropicApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || "";
}

const EVOLA_UDE_DIR = path.join(process.env.HOME || "", ".evoclaude");
const SESSIONS_DIR = path.join(EVOLA_UDE_DIR, "sessions");
const GENERATED_DIR = path.join(EVOLA_UDE_DIR, "generated");

export async function loadConfig(): Promise<EvoClaudeConfig> {
  const configPath = path.join(EVOLA_UDE_DIR, "config.json");

  try {
    const content = await fs.promises.readFile(configPath, "utf-8");
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    // Config file doesn't exist, create default config
    await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
}

export async function ensureDirectories(): Promise<void> {
  await fs.promises.mkdir(EVOLA_UDE_DIR, { recursive: true });
  await fs.promises.mkdir(SESSIONS_DIR, { recursive: true });
  await fs.promises.mkdir(GENERATED_DIR, { recursive: true });
}

/**
 * Get the EvoClaude data directory
 */
export function getEvoClaudeDir(): string {
  return EVOLA_UDE_DIR;
}

/**
 * Get the sessions directory
 */
export function getSessionsDir(): string {
  return SESSIONS_DIR;
}

/**
 * Get the generated skills temp directory
 */
export function getGeneratedDir(): string {
  return GENERATED_DIR;
}

/**
 * Resolve the skills output directory
 * - "project" → ./project/.claude/skills (project-specific)
 * - "global" → ~/.claude/skills (shared across projects)
 */
export function resolveSkillsOutputDir(
  skillsOutputDir: "project" | "global",
  projectPath: string
): string {
  if (skillsOutputDir === "global") {
    return path.join(process.env.HOME || "", ".claude", "skills");
  }
  // "project" (default)
  return path.join(projectPath, ".claude", "skills");
}

export function getDateDir(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

import * as fs from "node:fs";
import * as path from "node:path";
import { ensureDirectories, getDateDir, getSessionsDir, loadConfig } from "./config";
import type { DailySession, Event } from "./types";

let currentSession: DailySession | null = null;
let events: Event[] = [];

/**
 * Initialize session collection
 */
export async function initSession(projectPath: string): Promise<void> {
  await ensureDirectories();

  const now = new Date();
  const dateStr = getDateDir(now);

  // Try to load existing daily session
  const sessionsDir = getSessionsDir();
  const dailyFile = path.join(sessionsDir, `${dateStr}.json`);

  try {
    const content = await fs.promises.readFile(dailyFile, "utf-8");
    currentSession = JSON.parse(content) as DailySession;
    events = currentSession.events;
  } catch {
    // Create new daily session
    currentSession = {
      date: dateStr,
      projectPath,
      startTime: now.toISOString(),
      endTime: "",
      events: [],
    };
    events = [];
  }
}

/**
 * Record a user prompt
 */
export function recordPrompt(prompt: string): void {
  if (!currentSession) {
    return;
  }

  events.push({
    timestamp: new Date().toISOString(),
    type: "prompt",
    prompt,
  });
}

/**
 * Record a tool use
 */
export function recordToolUse(toolName: string, toolInput: any, success: boolean): void {
  if (!currentSession) {
    return;
  }

  events.push({
    timestamp: new Date().toISOString(),
    type: "tool_use",
    toolName,
    toolInput,
    success,
  });
}

/**
 * Save session to daily file
 */
export async function saveSession(): Promise<void> {
  if (!currentSession) {
    return;
  }

  const sessionsDir = getSessionsDir();
  await fs.promises.mkdir(sessionsDir, { recursive: true });

  currentSession.events = events;
  currentSession.endTime = new Date().toISOString();

  const dailyFile = path.join(sessionsDir, `${currentSession.date}.json`);
  await fs.promises.writeFile(dailyFile, JSON.stringify(currentSession, null, 2));

  // Reset session
  currentSession = null;
  events = [];
}

/**
 * Get today's daily session
 */
export async function getTodaySession(): Promise<DailySession | null> {
  const sessionsDir = getSessionsDir();
  const dailyFile = path.join(sessionsDir, `${getDateDir()}.json`);

  try {
    const content = await fs.promises.readFile(dailyFile, "utf-8");
    return JSON.parse(content) as DailySession;
  } catch {
    return null;
  }
}

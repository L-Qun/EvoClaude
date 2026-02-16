// Hook for Stop event - collects session data and triggers skill generation
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ensureDirectories, getDateDir, getSessionsDir, loadConfig } from "./config.js";
import { getTodaySession } from "./session-collector.js";
import { mergeSkills } from "./skill-merger.js";
import { generateSkillsWithAnthropic } from "./anthropic-client.js";

async function main() {
  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputData = Buffer.concat(chunks).toString("utf-8");

  let data: any;
  try {
    data = JSON.parse(inputData);
  } catch {
    // No input, just exit silently
    process.exit(0);
    return;
  }

  const projectPath = data.cwd ?? process.cwd();

  // Load config
  await loadConfig();

  // Ensure directories exist
  await ensureDirectories();

  // Collect session data from logs
  const sessionEvents = await collectSessionFromLogs(projectPath);

  if (!sessionEvents || sessionEvents.length === 0) {
    console.log(JSON.stringify({ systemMessage: "EvoClaude: No session data to collect" }));
    process.exit(0);
    return;
  }

  // Save to daily file
  await appendToDailySession(sessionEvents, projectPath);

  const promptCount = sessionEvents.filter((e) => e.type === "prompt").length;
  const toolUseCount = sessionEvents.filter((e) => e.type === "tool_use").length;

  console.error("[EvoClaude] Session collected successfully");
  console.error(`[EvoClaude] Prompts: ${promptCount}`);
  console.error(`[EvoClaude] Tool uses: ${toolUseCount}`);

  // Get today's session
  const todaySession = await getTodaySession();

  if (todaySession) {
    console.error("[EvoClaude] Analyzing patterns and generating skills...");

    // Generate skills using Anthropic API
    const skills = await generateSkillsWithAnthropic(todaySession, projectPath);

    if (skills.length > 0) {
      // Merge skills with existing ones
      await mergeSkills(skills, projectPath);
      console.error(`[EvoClaude] Generated ${skills.length} new skills`);
    } else {
      console.error("[EvoClaude] No clear patterns found for skill generation");
    }
  }

  const output = {
    systemMessage: `EvoClaude: Session collected. Today's total: ${todaySession?.events.length || 0} events`,
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Collect session events from log files
 */
async function collectSessionFromLogs(projectPath: string): Promise<any[]> {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  const logDir = path.join(pluginRoot, "logs");

  try {
    const files = await fs.readdir(logDir);
    const events: any[] = [];

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const content = await fs.readFile(path.join(logDir, file), "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          if (entry.hook_event_name === "UserPromptSubmit" && entry.prompt) {
            events.push({
              timestamp: entry.timestamp || new Date().toISOString(),
              type: "prompt",
              prompt: entry.prompt,
            });
          } else if (entry.hook_event_name === "PostToolUse" && entry.tool_name) {
            events.push({
              timestamp: entry.timestamp || new Date().toISOString(),
              type: "tool_use",
              toolName: entry.tool_name,
              toolInput: entry.tool_input || {},
              success: true,
            });
          }
        } catch {
          // Skip invalid lines
        }
      }
    }

    // Sort by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch {
    return [];
  }
}

/**
 * Append events to daily session file
 */
async function appendToDailySession(events: any[], projectPath: string): Promise<void> {
  const sessionsDir = getSessionsDir();
  const dateStr = getDateDir();
  const dailyFile = path.join(sessionsDir, `${dateStr}.json`);

  let dailySession: any = {
    date: dateStr,
    projectPath,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    events: [],
  };

  // Load existing session if exists
  try {
    const content = await fs.readFile(dailyFile, "utf-8");
    dailySession = JSON.parse(content);
  } catch {
    // File doesn't exist, use new session
  }

  // Append new events
  dailySession.events = [...dailySession.events, ...events];

  // Sort all events by timestamp
  dailySession.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Update end time
  dailySession.endTime = new Date().toISOString();

  // Save
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.writeFile(dailyFile, JSON.stringify(dailySession, null, 2));
}


main().catch((error) => {
  console.error("[EvoClaude] Error during collection:", error);
  process.exit(1);
});

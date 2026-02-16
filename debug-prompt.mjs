#!/usr/bin/env node

/**
 * 调试 prompt 生成
 */

import fs from "node:fs";
import path from "node:path";

async function main() {
  const sessionsDir = path.join(process.env.HOME, ".evoclaude", "sessions");
  const today = new Date().toISOString().split("T")[0];
  const dailyFile = path.join(sessionsDir, `${today}.json`);

  const content = fs.readFileSync(dailyFile, "utf-8");
  const dailySession = JSON.parse(content);

  const promptEvents = dailySession.events.filter((e) => e.type === "prompt");
  const toolUseEvents = dailySession.events.filter((e) => e.type === "tool_use");

  console.error(`Total events: ${dailySession.events.length}`);
  console.error(`Prompts: ${promptEvents.length}`);
  console.error(`Tool uses: ${toolUseEvents.length}`);

  console.error("\n=== First 5 prompts ===");
  for (let i = 0; i < Math.min(5, promptEvents.length); i++) {
    console.error(`${i + 1}. ${promptEvents[i].prompt}`);
  }

  const sessionSummary = {
    date: dailySession.date,
    project: dailySession.projectPath,
    totalEvents: dailySession.events.length,
    prompts: promptEvents.map((e) => e.prompt),
    tools: toolUseEvents.map((e) => ({
      name: e.toolName,
      success: e.success,
    })),
  };

  console.error("\n=== Session Summary ===");
  console.error(JSON.stringify(sessionSummary, null, 2).substring(0, 1000));
}

main().catch(console.error);

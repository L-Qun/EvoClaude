// Hook for UserPromptSubmit event - captures user prompts
import * as fs from "node:fs/promises";
import * as path from "node:path";

async function main() {
  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputData = Buffer.concat(chunks).toString("utf-8");
  const data = JSON.parse(inputData);

  const sessionId = data.session_id ?? "unknown";
  const cwd = data.cwd ?? "unknown";
  const prompt = data.prompt ?? "";

  // Log to plugin/logs directory
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  const logDir = path.join(pluginRoot, "logs");
  await fs.mkdir(logDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logFile = `${logDir}/user-prompt-submit_${timestamp}.jsonl`;

  const logEntry = {
    timestamp: new Date().toISOString(),
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    cwd,
    prompt,
  };

  await fs.writeFile(logFile, `${JSON.stringify(logEntry)}\n`);

  console.error("[EvoClaude] UserPromptSubmit captured");
  console.error(`[EvoClaude] Session: ${sessionId}`);
  console.error(`[EvoClaude] Prompt length: ${prompt.length} chars`);
  console.error(`[EvoClaude] Logged to: ${logFile}`);

  const output = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `EvoClaude captured user prompt (${prompt.length} chars). Log: ${logFile}`,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("[EvoClaude] Error:", error);
  process.exit(1);
});

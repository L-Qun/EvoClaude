// src/post-tool-use.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputData = Buffer.concat(chunks).toString("utf-8");
  const data = JSON.parse(inputData);
  const sessionId = data.session_id ?? "unknown";
  const cwd = data.cwd ?? "unknown";
  const toolName = data.tool_name ?? "unknown";
  const toolInput = data.tool_input ?? {};
  const toolResponse = data.tool_response ?? {};
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  const logDir = path.join(pluginRoot, "logs");
  await fs.mkdir(logDir, { recursive: true });
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logFile = `${logDir}/post-tool-use_${timestamp}.jsonl`;
  const responseSize = JSON.stringify(toolResponse).length;
  const logEntry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    hook_event_name: "PostToolUse",
    session_id: sessionId,
    cwd,
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: toolResponse,
    response_size_bytes: responseSize
  };
  await fs.writeFile(logFile, `${JSON.stringify(logEntry)}
`);
  console.error("[EvoClaude] PostToolUse captured");
  console.error(`[EvoClaude] Tool: ${toolName}`);
  console.error(`[EvoClaude] Response size: ${responseSize} bytes`);
  console.error(`[EvoClaude] Logged to: ${logFile}`);
  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `EvoClaude logged ${toolName} execution (${responseSize} bytes). Log: ${logFile}`
    }
  };
  console.log(JSON.stringify(output, null, 2));
}
main().catch((error) => {
  console.error("[EvoClaude] Error:", error);
  process.exit(1);
});

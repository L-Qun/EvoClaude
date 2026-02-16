import { execSync } from "node:child_process";
import type { DailySession, GeneratedSkill } from "./types";

// Import Agent SDK (assumes it's installed)
// @ts-ignore - Agent SDK types may not be available
import { query } from "@anthropic-ai/claude-agent-sdk";

/**
 * Generate skills from daily session using Agent SDK
 * Uses Claude Code CLI subscription billing (no API key required)
 */
export async function generateSkillsWithAnthropic(
  dailySession: DailySession,
  projectPath: string
): Promise<GeneratedSkill[]> {
  try {
    // Find Claude executable
    const claudePath = findClaudeExecutable();

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(dailySession, projectPath);

    console.error("[EvoClaude] Calling Agent SDK to generate skills...");
    console.error("[EvoClaude] Using Claude Code CLI (subscription billing)");

    // Create async generator for prompt
    async function* promptGenerator() {
      yield {
        type: "user",
        message: {
          role: "user",
          content: prompt,
        },
        session_id: null,
        parent_tool_use_id: null,
        isSynthetic: true,
      };
    }

    // Run Agent SDK query
    const queryResult = query({
      prompt: promptGenerator(),
      options: {
        model: "claude-sonnet-4-5-20250929",
        maxTokens: 8192,  // Increase max tokens for longer responses
        cwd: projectPath,
        pathToClaudeCodeExecutable: claudePath,
        disallowedTools: [
          "Bash",
          "Read",
          "Write",
          "Edit",
          "Grep",
          "Glob",
          "WebFetch",
          "WebSearch",
          "Task",
          "NotebookEdit",
          "AskUserQuestion",
          "TodoWrite",
        ],
      },
    });

    // Process SDK messages
    let fullText = "";
    let resultText = "";

    for await (const message of queryResult) {
      if (message.type === "assistant") {
        const content = message.message.content;
        const textContent =
          Array.isArray(content) && content[0]?.type === "text"
            ? content[0].text
            : typeof content === "string"
              ? content
              : "";

        fullText += textContent;
      } else if (message.type === "result") {
        // SDK may return result directly
        // @ts-ignore - result field exists but not in types
        if (message.result) {
          // @ts-ignore
          resultText = message.result;
        }
      }
    }

    // Use result text if available, otherwise use accumulated text
    const textToParse = resultText || fullText;

    if (!textToParse || textToParse.trim() === "[]" || textToParse.trim() === "") {
      console.error("[EvoClaude] No skills generated (empty response)");
      return [];
    }

    console.error("[EvoClaude] Response length:", textToParse.length);
    console.error("[EvoClaude] First 200 chars:", textToParse.substring(0, 200));
    console.error("[EvoClaude] Last 200 chars:", textToParse.substring(textToParse.length - 200));

    // Extract JSON array from response
    return parseSkillsFromText(textToParse);
  } catch (error) {
    console.error("[EvoClaude] Error calling Agent SDK:", error);

    // Try to extract result from error message
    const errorMessage = String(error);

    // Extract the "result":"..." part from error message
    // The result field contains the actual response from Claude
    // Use a more comprehensive regex to handle truncated output
    const resultMatch = errorMessage.match(/"result":"(\\[\s\S]*?)"/s);
    if (resultMatch) {
      try {
        // The result is JSON-encoded, with escaped newlines and quotes
        let result = resultMatch[1];
        // Decode escape sequences
        result = result.replace(/\\n/g, "\n");
        result = result.replace(/\\"/g, '"');
        result = result.replace(/\\\\/g, "\\");

        console.error("[EvoClaude] Found result in error output, length:", result.length);
        return parseSkillsFromText(result);
      } catch (parseError) {
        console.error("[EvoClaude] Failed to parse result from error:", parseError);
      }
    }

    // Also try to find the complete JSON array in the error message
    const jsonArrayMatch = errorMessage.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonArrayMatch) {
      try {
        console.error("[EvoClaude] Found JSON array in error message");
        return parseSkillsFromText(jsonArrayMatch[0]);
      } catch (parseError) {
        console.error("[EvoClaude] Failed to parse JSON array from error:", parseError);
      }
    }

    return [];
  }
}

/**
 * Parse skills from text response
 */
function parseSkillsFromText(fullText: string): GeneratedSkill[] {
  console.error("[EvoClaude] Parsing skills from response (length:", fullText.length, ")");

  // Remove markdown code blocks if present
  let cleanedText = fullText;
  const codeBlockMatch = fullText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) {
    cleanedText = codeBlockMatch[1];
    console.error("[EvoClaude] Removed markdown code block");
  } else {
    // If no trailing ```, try to match from ```json to end
    const jsonMatch = fullText.match(/```json\s*\n?([\s\S]*)$/);
    if (jsonMatch) {
      cleanedText = jsonMatch[1];
      console.error("[EvoClaude] Extracted JSON content (no closing ```)");
    }
  }

  console.error("[EvoClaude] Cleaned text length:", cleanedText.length);
  console.error("[EvoClaude] First 100 chars:", cleanedText.substring(0, 100));
  console.error("[EvoClaude] Last 100 chars:", cleanedText.substring(cleanedText.length - 100));

  // Find and extract the complete JSON array
  // Look for the outermost [ and matching ]
  let bracketDepth = 0;
  let inString = false;
  let escapeNext = false;
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "[") {
        if (bracketDepth === 0) {
          startIndex = i;
        }
        bracketDepth++;
      } else if (char === "]") {
        bracketDepth--;
        if (bracketDepth === 0 && startIndex !== -1) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  console.error("[EvoClaude] Bracket extraction - startIndex:", startIndex, "endIndex:", endIndex, "bracketDepth:", bracketDepth);

  if (startIndex !== -1 && endIndex !== -1) {
    const jsonStr = cleanedText.substring(startIndex, endIndex);
    console.error("[EvoClaude] Extracted JSON array, length:", jsonStr.length);
    console.error("[EvoClaude] JSON starts with:", jsonStr.substring(0, 100));
    console.error("[EvoClaude] JSON ends with:", jsonStr.substring(jsonStr.length - 100));

    try {
      const skills = JSON.parse(jsonStr) as GeneratedSkill[];
      console.error(`[EvoClaude] Generated ${skills.length} skills`);
      return skills;
    } catch (parseError) {
      console.error("[EvoClaude] JSON parse failed:", parseError);
      console.error("[EvoClaude] Parse error at position:", (parseError as any).position);

      // Try to fix common issues
      try {
        // Remove any trailing commas
        const fixedJson = jsonStr.replace(/,(\s*[}\]])/g, "$1");
        const skills = JSON.parse(fixedJson) as GeneratedSkill[];
        console.error(`[EvoClaude] Generated ${skills.length} skills (after fixing)`);
        return skills;
      } catch (fixError) {
        console.error("[EvoClaude] Fix attempt failed:", fixError);
      }
    }
  }

  console.error("[EvoClaude] No valid JSON array found");
  console.error("[EvoClaude] Cleaned response (first 500):", cleanedText.substring(0, 500));
  return [];
}

/**
 * Find Claude executable
 */
function findClaudeExecutable(): string {
  try {
    const claudePath = execSync(
      process.platform === "win32" ? "where claude" : "which claude",
      {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
      }
    )
      .trim()
      .split("\n")[0]
      .trim();

    if (claudePath) return claudePath;
  } catch (error) {
    console.error("[EvoClaude] Claude executable not found");
    throw new Error(
      "Claude executable not found. Please add 'claude' to your system PATH."
    );
  }

  throw new Error(
    "Claude executable not found. Please add 'claude' to your system PATH."
  );
}

/**
 * Build the analysis prompt for skill generation
 */
function buildAnalysisPrompt(
  dailySession: DailySession,
  _projectPath: string
): string {
  // Extract prompts and tool uses from events
  const promptEvents = dailySession.events.filter((e) => e.type === "prompt");
  const toolUseEvents = dailySession.events.filter((e) => e.type === "tool_use");

  const sessionSummary = {
    date: dailySession.date,
    project: dailySession.projectPath,
    totalEvents: dailySession.events.length,
    prompts: promptEvents.map((e) => (e as any).prompt),
    tools: toolUseEvents.map((e) => ({
      name: (e as any).toolName,
      success: (e as any).success,
    })),
  };

  return `You are analyzing Claude Code session events to generate reusable skills. Review the following chronological events and identify patterns that should become skills.

## Today's Session Data

\`\`\`json
${JSON.stringify(sessionSummary, null, 2)}
\`\`\`

## Task

Analyze these session events and generate skills following the official Claude Skills format. Focus on:

1. **Reusable workflows** that appeared multiple times
2. **Common task patterns** (error handling, component creation, etc.)
3. **Domain-specific knowledge** specific to this project
4. **Tool usage patterns** (combinations of tools used together)
5. **Avoid duplicates** - Do not generate multiple skills with similar purposes or overlapping functionality. Merge semantically related patterns into a single, comprehensive skill.

## For Each Skill, Provide:

1. **name**: Short, kebab-case name (e.g., "error-handler", "component-creator")
2. **description**: Clear description of when to use this skill (trigger phrases)
3. **content**: Full SKILL.md content with:
   - YAML frontmatter (name, description)
   - Body with instructions
   - Code examples if applicable
4. **triggers**: Array of trigger phrases

## Skill Format Example:

\`\`\`markdown
---
name: error-handler
description: Add error handling to functions. Use when user asks to "add error handling", "wrap in try-catch", or "handle errors" in code.
---

# Error Handler

This skill adds error handling to functions following best practices.

## Quick Start

For TypeScript functions:
\`\`\`typescript
try {
  {{originalCode}}
} catch (error) {
  logger.error(error);
  throw error;
}
\`\`\`

## Patterns

- **Network errors**: Wrap in try-catch with retry logic
- **Validation errors**: Return early with error message
- **Unknown errors**: Log and re-throw
\`\`\`

## Output Format

Return ONLY a JSON array (no markdown, no explanation):

\`\`\`json
[
  {
    "name": "skill-name",
    "description": "When to use this skill",
    "content": "Full SKILL.md content with YAML frontmatter",
    "triggers": ["trigger phrase 1", "trigger phrase 2"]
  }
]
\`\`\`

Generate 1-3 skills maximum. Only generate skills for clear, reusable patterns. If no clear patterns exist, return an empty array: \`[]\`;
`;
}

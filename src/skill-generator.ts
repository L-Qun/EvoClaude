import * as fs from "node:fs";
import * as path from "node:path";
import { getDateDir, getGeneratedDir, getSessionsDir, loadConfig } from "./config";
import type { DailySession, Event, GeneratedSkill } from "./types";

/**
 * Generate skills from today's sessions
 */
export async function generateSkillsFromToday(projectPath: string): Promise<GeneratedSkill[]> {
  const sessionsDir = getSessionsDir();
  const dailyFile = path.join(sessionsDir, `${getDateDir()}.json`);

  // Read today's daily session
  let dailySession: DailySession | null = null;
  try {
    const content = await fs.promises.readFile(dailyFile, "utf-8");
    dailySession = JSON.parse(content) as DailySession;
  } catch {
    return [];
  }

  if (!dailySession || dailySession.events.length === 0) {
    return [];
  }

  // Build prompt for Claude to analyze sessions and generate skills
  const _analysisPrompt = await buildAnalysisPrompt(dailySession, projectPath);

  // This would be called by Claude through the skill system
  // For now, return the prompt so it can be used
  return []; // Actual generation happens when Claude processes this
}

/**
 * Build the analysis prompt for skill generation
 */
export async function buildAnalysisPrompt(
  dailySession: DailySession,
  _projectPath: string
): Promise<string> {
  const config = await loadConfig();
  const language = config.skillLanguage;

  // Detect language if set to auto
  let targetLanguage = language;
  if (language === "auto") {
    targetLanguage = detectLanguage(dailySession);
  }

  // Extract prompts and tool uses from events
  const promptEvents = dailySession.events.filter((e) => e.type === "prompt");
  const toolUseEvents = dailySession.events.filter((e) => e.type === "tool_use");

  const sessionSummary = {
    project: dailySession.projectPath,
    prompts: promptEvents.map((e) => (e as any).prompt),
    tools: toolUseEvents.map((e) => ({
      name: (e as any).toolName,
      success: (e as any).success,
    })),
  };

  const languageInstructions = getLanguageInstructions(targetLanguage);

  return `# Generate Skills from Today's Session

You are analyzing Claude Code session events to generate reusable skills. Review the following chronological events and identify patterns that should become skills.

## Today's Session Events

${JSON.stringify(sessionSummary, null, 2)}

## Task

${languageInstructions}

Analyze these sessions and generate skills following the official Claude Skills format.

For each skill:

1. **Name**: Short, kebab-case name (e.g., "error-handler", "component-creator")
2. **Description**: Clear description of when to use this skill (triggers)
3. **Content**: Full SKILL.md content with:
   - YAML frontmatter (name, description)
   - Body with instructions
   - Optional references to scripts/references/assets

## Skill Format Example

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

See [references/error-patterns.md](references/error-patterns.md) for complete patterns.
\`\`\`

## Output Format

Return a JSON array of skills:

\`\`\`json
[
  {
    "name": "skill-name",
    "description": "When to use this skill",
    "content": "Full SKILL.md content",
    "triggers": ["trigger phrase 1", "trigger phrase 2"]
  }
]
\`\`\`

Focus on:
- Reusable workflows that appeared multiple times
- Common task patterns
- Domain-specific knowledge
- Tool usage patterns
`;
}

/**
 * Save generated skills to temporary directory
 */
export async function saveGeneratedSkills(skills: GeneratedSkill[]): Promise<void> {
  const tempDir = path.join(getGeneratedDir(), "temp");

  await fs.promises.mkdir(tempDir, { recursive: true });

  for (const skill of skills) {
    const skillDir = path.join(tempDir, skill.name);
    await fs.promises.mkdir(skillDir, { recursive: true });

    // Write SKILL.md
    await fs.promises.writeFile(path.join(skillDir, "SKILL.md"), skill.content);

    // Write metadata
    await fs.promises.writeFile(
      path.join(skillDir, "metadata.json"),
      JSON.stringify(
        {
          name: skill.name,
          description: skill.description,
          triggers: skill.triggers,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }
}

/**
 * Get generated skills from temp directory
 */
export async function getGeneratedSkills(): Promise<GeneratedSkill[]> {
  const tempDir = path.join(getGeneratedDir(), "temp");

  try {
    const skillDirs = await fs.promises.readdir(tempDir);
    const skills: GeneratedSkill[] = [];

    for (const dir of skillDirs) {
      const skillDirPath = path.join(tempDir, dir);
      const stat = await fs.promises.stat(skillDirPath);

      if (stat.isDirectory()) {
        const skillContent = await fs.promises.readFile(
          path.join(skillDirPath, "SKILL.md"),
          "utf-8"
        );
        const metadata = JSON.parse(
          await fs.promises.readFile(path.join(skillDirPath, "metadata.json"), "utf-8")
        );

        skills.push({
          name: metadata.name,
          description: metadata.description,
          content: skillContent,
          triggers: metadata.triggers,
        });
      }
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * Detect language from session events
 */
function detectLanguage(dailySession: DailySession): "en" | "zh" {
  let chineseCount = 0;
  let englishCount = 0;

  for (const event of dailySession.events) {
    if (event.type === "prompt") {
      const text = event.prompt;
      // Simple heuristic: check for Chinese characters
      if (/[\u4e00-\u9fa5]/.test(text)) {
        chineseCount++;
      } else if (/[a-zA-Z]/.test(text)) {
        englishCount++;
      }
    }
  }

  return chineseCount > englishCount ? "zh" : "en";
}

/**
 * Get language-specific instructions
 */
function getLanguageInstructions(language: "en" | "zh"): string {
  if (language === "zh") {
    return `**请使用中文生成所有技能内容**

分析这些会话并生成可复用的技能。对于每个技能，确保：
- 技能名称使用 kebab-case（如 "error-handler"）
- 描述用中文，清晰说明何时使用此技能
- 技能内容（SKILL.md）全部使用中文
- 代码示例和注释也使用中文`;
  }

  return `**Generate all skill content in English**

Analyze these sessions and generate reusable skills. For each skill, ensure:
- Skill name uses kebab-case (e.g., "error-handler")
- Description is in English, clearly stating when to use this skill
- All skill content (SKILL.md) is in English
- Code examples and comments are in English`;
}

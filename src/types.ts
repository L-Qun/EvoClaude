// Type definitions for EvoClaude self-evolution system

export type EventType = "prompt" | "tool_use";

export interface BaseEvent {
  timestamp: string;
  type: EventType;
}

export interface PromptEvent extends BaseEvent {
  type: "prompt";
  prompt: string;
}

export interface ToolUseEvent extends BaseEvent {
  type: "tool_use";
  toolName: string;
  toolInput: any;
  success: boolean;
}

export type Event = PromptEvent | ToolUseEvent;

export interface DailySession {
  date: string; // YYYY-MM-DD
  projectPath: string;
  startTime: string;
  endTime: string;
  events: Event[];
}

export interface SkillMetadata {
  name: string;
  description: string;
}

export interface SkillContent {
  metadata: SkillMetadata;
  body: string;
}

export interface GeneratedSkill {
  name: string;
  description: string;
  content: string;
  triggers: string[];
}

export type SkillLanguage = "auto" | "en" | "zh";

export type SkillsOutputDir = "project" | "global";

export interface EvoClaudeConfig {
  skillLanguage: SkillLanguage;
  skillsOutputDir: SkillsOutputDir;
}

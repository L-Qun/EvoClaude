#!/usr/bin/env node

/**
 * 用模拟数据测试 Agent SDK
 */

import { generateSkillsWithAnthropic } from "./plugin/scripts/anthropic-client.mjs";

const mockSession = {
  date: "2026-02-17",
  projectPath: "/Users/linqun/Desktop/前端/EvoClaude",
  startTime: "2026-02-17T10:00:00.000Z",
  endTime: "2026-02-17T11:00:00.000Z",
  events: [
    {
      timestamp: "2026-02-17T10:05:00.000Z",
      type: "prompt",
      prompt: "帮我读取 package.json 文件"
    },
    {
      timestamp: "2026-02-17T10:05:01.000Z",
      type: "tool_use",
      toolName: "Read",
      toolInput: { file_path: "/Users/linqun/Desktop/前端/EvoClaude/package.json" },
      success: true
    },
    {
      timestamp: "2026-02-17T10:10:00.000Z",
      type: "prompt",
      prompt: "读取 package.json 文件"
    },
    {
      timestamp: "2026-02-17T10:10:01.000Z",
      type: "tool_use",
      toolName: "Read",
      toolInput: { file_path: "/Users/linqun/Desktop/前端/EvoClaude/package.json" },
      success: true
    },
    {
      timestamp: "2026-02-17T10:15:00.000Z",
      type: "prompt",
      prompt: "查看 package.json 的内容"
    },
    {
      timestamp: "2026-02-17T10:15:01.000Z",
      type: "tool_use",
      toolName: "Read",
      toolInput: { file_path: "/Users/linqun/Desktop/前端/EvoClaude/package.json" },
      success: true
    },
    {
      timestamp: "2026-02-17T10:20:00.000Z",
      type: "prompt",
      prompt: "帮我添加错误处理到这个函数"
    },
    {
      timestamp: "2026-02-17T10:20:01.000Z",
      type: "tool_use",
      toolName: "Edit",
      toolInput: { file_path: "/Users/linqun/Desktop/前端/EvoClaude/src/test.ts" },
      success: true
    },
    {
      timestamp: "2026-02-17T10:25:00.000Z",
      type: "prompt",
      prompt: "给这个函数添加错误处理"
    },
    {
      timestamp: "2026-02-17T10:25:01.000Z",
      type: "tool_use",
      toolName: "Edit",
      toolInput: { file_path: "/Users/linqun/Desktop/前端/EvoClaude/src/utils.ts" },
      success: true
    },
  ],
};

async function main() {
  console.error("🧪 测试 Agent SDK（模拟数据）\n");

  try {
    const skills = await generateSkillsWithAnthropic(mockSession, mockSession.projectPath);

    console.error(`\n✅ 生成了 ${skills.length} 个 skills:\n`);

    if (skills.length > 0) {
      for (const skill of skills) {
        console.error(`   📦 ${skill.name}`);
        console.error(`      描述: ${skill.description.substring(0, 80)}...`);
        console.error(`      触发词: ${skill.triggers.join(", ")}`);
        console.error("");
      }
    } else {
      console.error("⚠️  没有生成任何 skills");
    }
  } catch (error) {
    console.error("❌ 错误:", error);
  }

  console.error("✨ 测试完成！");
}

main().catch(console.error);

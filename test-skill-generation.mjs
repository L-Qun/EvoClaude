#!/usr/bin/env node

/**
 * 测试 skill 生成链路
 * 使用模拟数据测试整个流程，不调用真实 API
 */

import { generateSkillsWithAnthropic } from "./src/anthropic-client.ts";
import { saveGeneratedSkills } from "./src/skill-generator.ts";

// 模拟的 DailySession 数据
const mockDailySession = {
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
  ],
};

async function main() {
  console.error("🧪 开始测试 skill 生成链路...\n");

  // 1. 检查 API key
  const hasApiKey = process.env.ANTHROPIC_API_KEY;
  console.error(`1️⃣ API Key 检查: ${hasApiKey ? "✅ 存在" : "❌ 不存在"}`);

  if (!hasApiKey) {
    console.error("\n⚠️  没有设置 ANTHROPIC_API_KEY 环境变量");
    console.error("   请先设置: export ANTHROPIC_API_KEY='your-key-here'\n");

    console.error("2️⃣ 使用模拟数据测试 prompt 构建逻辑...\n");

    // 测试 prompt 构建（不需要 API key）
    const { buildAnalysisPrompt } = await import("./src/anthropic-client.ts");
    const prompt = buildAnalysisPrompt(mockDailySession, mockDailySession.projectPath);

    console.error("📋 生成的 prompt 预览（前 500 字符）:");
    console.error("─".repeat(60));
    console.error(prompt.substring(0, 500) + "...\n");
    console.error("─".repeat(60));
    console.error(`✅ Prompt 构建成功，长度: ${prompt.length} 字符\n`);

    console.error("3️⃣ 测试保存 skills 逻辑...\n");

    // 测试保存模拟的 skills
    const mockSkills = [
      {
        name: "test-skill",
        description: "测试技能",
        content: "---\nname: test-skill\ndescription: 测试技能\n---\n\n# Test Skill\n\nThis is a test skill.",
        triggers: ["test", "测试"],
      },
    ];

    await saveGeneratedSkills(mockSkills);
    console.error("✅ Skills 保存成功\n");

    console.error("4️⃣ 检查保存的 skills...\n");
    const { getGeneratedSkills } = await import("./src/skill-generator.ts");
    const savedSkills = await getGeneratedSkills();
    console.error(`✅ 找到 ${savedSkills.length} 个保存的 skills:`);
    for (const skill of savedSkills) {
      console.error(`   - ${skill.name}: ${skill.description}`);
    }

    console.error("\n✨ 基础逻辑测试完成！");
    console.error("\n📝 要测试完整的 API 调用，请:");
    console.error("   1. 设置 ANTHROPIC_API_KEY 环境变量");
    console.error("   2. 重新运行此脚本\n");

    return;
  }

  // 有 API key，进行完整测试
  console.error("\n2️⃣ 调用 Anthropic API 生成 skills...\n");

  const skills = await generateSkillsWithAnthropic(
    mockDailySession,
    mockDailySession.projectPath
  );

  console.error(`\n3️⃣ API 返回了 ${skills.length} 个 skills:\n`);

  if (skills.length > 0) {
    for (const skill of skills) {
      console.error(`   📦 ${skill.name}`);
      console.error(`      描述: ${skill.description}`);
      console.error(`      触发词: ${skill.triggers.join(", ")}`);
      console.error("");
    }

    console.error("4️⃣ 保存 skills...\n");
    await saveGeneratedSkills(skills);
    console.error("✅ Skills 保存到 ~/.evoclaude/generated/temp/\n");
  } else {
    console.error("⚠️  没有生成任何 skills\n");
  }

  console.error("✨ 测试完成！");
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exit(1);
});

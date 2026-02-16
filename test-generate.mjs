#!/usr/bin/env node

/**
 * 简单测试脚本：检查 skill 生成链路
 */

import fs from "node:fs";
import path from "node:path";

async function main() {
  console.error("🧪 测试 skill 生成链路\n");

  // 1. 检查 API key
  const hasApiKey = process.env.ANTHROPIC_API_KEY;
  console.error(`1️⃣ API Key: ${hasApiKey ? "✅ 存在" : "❌ 不存在"}\n`);

  if (!hasApiKey) {
    console.error("⚠️  需要设置 ANTHROPIC_API_KEY 环境变量");
    console.error("   设置方法:\n");
    console.error("   export ANTHROPIC_API_KEY='sk-ant-api...'\n");
    console.error("   或者在 Claude Code 的配置中设置 API key\n");
    return;
  }

  // 2. 检查 session 数据
  const sessionsDir = path.join(process.env.HOME, ".evoclaude", "sessions");
  const today = new Date().toISOString().split("T")[0];
  const dailyFile = path.join(sessionsDir, `${today}.json`);

  console.error(`2️⃣ 检查 session 数据: ${dailyFile}`);

  let dailySession;
  try {
    const content = fs.readFileSync(dailyFile, "utf-8");
    dailySession = JSON.parse(content);
    console.error(`   ✅ 找到 ${dailySession.events.length} 个事件\n`);
  } catch (error) {
    console.error(`   ❌ 无法读取 session 数据: ${error.message}\n`);
    return;
  }

  // 3. 检查 prompt 事件
  const prompts = dailySession.events.filter((e) => e.type === "prompt");
  const toolUses = dailySession.events.filter((e) => e.type === "tool_use");

  console.error(`3️⃣ 事件统计:`);
  console.error(`   - Prompts: ${prompts.length}`);
  console.error(`   - Tool uses: ${toolUses.length}\n`);

  if (prompts.length === 0) {
    console.error("⚠️  没有找到 prompt 事件，无法生成 skills");
    console.error("   prompt 事件由 UserPromptSubmit hook 收集\n");
    return;
  }

  // 4. 测试调用 Anthropic API
  console.error(`4️⃣ 测试调用 Anthropic API...\n`);

  try {
    // 导入构建后的函数
    const { generateSkillsWithAnthropic } = await import("./plugin/scripts/collect.mjs");

    const skills = await generateSkillsWithAnthropic(dailySession, dailySession.projectPath);

    console.error(`\n✅ 生成了 ${skills.length} 个 skills:\n`);

    if (skills.length > 0) {
      for (const skill of skills) {
        console.error(`   📦 ${skill.name}`);
        console.error(`      描述: ${skill.description.substring(0, 60)}...`);
        console.error(`      触发词: ${skill.triggers.join(", ")}`);
        console.error("");
      }

      // 5. 保存 skills
      console.error(`5️⃣ 保存 skills 到项目目录...\n`);

      const { mergeSkills } = await import("./plugin/scripts/collect.mjs");
      await mergeSkills(skills, dailySession.projectPath);

      console.error("✅ Skills 已保存到 .claude/skills/\n");
    } else {
      console.error("⚠️  没有生成任何 skills");
      console.error("   可能原因:");
      console.error("   - 没有找到足够清晰的模式");
      console.error("   - Prompt 数量不足");
      console.error("   - API 返回了空数组\n");
    }
  } catch (error) {
    console.error("❌ 调用失败:", error.message);
    console.error(error.stack);
  }

  console.error("✨ 测试完成！");
}

main().catch((error) => {
  console.error("❌ 错误:", error);
  process.exit(1);
});

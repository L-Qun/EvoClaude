#!/usr/bin/env node

/**
 * 测试 Agent SDK 调用
 */

import fs from "node:fs";
import path from "node:path";

async function main() {
  console.error("🧪 测试 Agent SDK skill 生成\n");

  // 1. 检查 claude 可执行文件
  console.error(`1️⃣ Claude 可执行文件: ${process.platform === "win32" ? "where" : "which"} claude`);
  try {
    const { execSync } = await import("node:child_process");
    const claudePath = execSync(
      process.platform === "win32" ? "where claude" : "which claude",
      { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }
    ).trim().split("\n")[0].trim();
    console.error(`   ✅ 找到: ${claudePath}\n`);
  } catch (error) {
    console.error(`   ❌ 未找到 claude 可执行文件\n`);
    return;
  }

  // 2. 加载 session 数据
  const sessionsDir = path.join(process.env.HOME, ".evoclaude", "sessions");
  const today = new Date().toISOString().split("T")[0];
  const dailyFile = path.join(sessionsDir, `${today}.json`);

  console.error(`2️⃣ 加载 session 数据: ${dailyFile}`);

  let dailySession;
  try {
    const content = fs.readFileSync(dailyFile, "utf-8");
    dailySession = JSON.parse(content);
    console.error(`   ✅ 找到 ${dailySession.events.length} 个事件\n`);
  } catch (error) {
    console.error(`   ❌ 无法读取 session 数据: ${error.message}\n`);
    return;
  }

  // 3. 导入并测试生成函数
  console.error(`3️⃣ 测试 Agent SDK 生成 skills...\n`);

  try {
    const { generateSkillsWithAnthropic } = await import("./plugin/scripts/anthropic-client.mjs");

    console.error("   调用 generateSkillsWithAnthropic...");
    const skills = await generateSkillsWithAnthropic(dailySession, dailySession.projectPath);

    console.error(`\n✅ 生成了 ${skills.length} 个 skills:\n`);

    if (skills.length > 0) {
      for (const skill of skills) {
        console.error(`   📦 ${skill.name}`);
        console.error(`      描述: ${skill.description.substring(0, 60)}...`);
        console.error(`      触发词: ${skill.triggers.join(", ")}`);
        console.error("");
      }

      // 4. 保存 skills
      console.error(`4️⃣ 保存 skills 到项目目录...\n`);

      const { mergeSkills } = await import("./plugin/scripts/skill-merger.mjs");
      await mergeSkills(skills, dailySession.projectPath);

      console.error("✅ Skills 已保存到 .claude/skills/\n");
    } else {
      console.error("⚠️  没有生成任何 skills");
      console.error("   可能原因:");
      console.error("   - 没有找到足够清晰的模式");
      console.error("   - Prompt 数量不足");
      console.error("   - Agent SDK 返回了空数组\n");
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

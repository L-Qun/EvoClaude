import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig, resolveSkillsOutputDir } from "./config";
import type { GeneratedSkill } from "./types";

/**
 * Merge and deduplicate skills
 */
export async function mergeSkills(newSkills: GeneratedSkill[], projectPath: string): Promise<void> {
  const config = await loadConfig();
  const skillsDir = resolveSkillsOutputDir(config.skillsOutputDir, projectPath);

  // Get existing skills
  const existingSkills = await getExistingSkills(skillsDir);

  // Merge and deduplicate
  const mergedSkills = deduplicateSkills(existingSkills, newSkills);

  // Write merged skills
  for (const skill of mergedSkills) {
    const skillDir = path.join(skillsDir, skill.name);
    await fs.promises.mkdir(skillDir, { recursive: true });

    await fs.promises.writeFile(path.join(skillDir, "SKILL.md"), skill.content);
  }

  console.log(`Merged ${mergedSkills.length} skills`);
}

/**
 * Get existing skills from skills directory
 */
async function getExistingSkills(skillsDir: string): Promise<GeneratedSkill[]> {
  const skills: GeneratedSkill[] = [];

  try {
    const skillDirs = await fs.promises.readdir(skillsDir);

    for (const dir of skillDirs) {
      const skillDirPath = path.join(skillsDir, dir);
      const stat = await fs.promises.stat(skillDirPath);

      if (stat.isDirectory()) {
        const skillFile = path.join(skillDirPath, "SKILL.md");

        try {
          const content = await fs.promises.readFile(skillFile, "utf-8");
          const { name, description } = parseSkillFrontmatter(content);

          skills.push({
            name,
            description,
            content,
            triggers: extractTriggers(description),
          });
        } catch {
          // Skip invalid skills
        }
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  return skills;
}

/**
 * Parse YAML frontmatter from SKILL.md
 */
function parseSkillFrontmatter(content: string): { name: string; description: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);

  if (!frontmatterMatch) {
    return { name: "unknown", description: "" };
  }

  const frontmatter = frontmatterMatch[1];
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  const descMatch = frontmatter.match(/description:\s*(.+)/);

  return {
    name: nameMatch ? nameMatch[1].trim() : "unknown",
    description: descMatch ? descMatch[1].trim() : "",
  };
}

/**
 * Extract trigger phrases from description
 */
function extractTriggers(description: string): string[] {
  // Extract phrases in quotes from description
  const matches = description.match(/"([^"]+)"/g);
  return matches ? matches.map((m) => m.replace(/"/g, "")) : [];
}

/**
 * Deduplicate skills based on similarity
 */
function deduplicateSkills(
  existing: GeneratedSkill[],
  newSkills: GeneratedSkill[]
): GeneratedSkill[] {
  const merged: GeneratedSkill[] = [...existing];
  const addedNames = new Set(existing.map((s) => s.name));

  for (const newSkill of newSkills) {
    // Check for duplicate by name
    if (addedNames.has(newSkill.name)) {
      // Merge with existing skill
      const existingIndex = merged.findIndex((s) => s.name === newSkill.name);
      if (existingIndex >= 0) {
        merged[existingIndex] = mergeSkillContent(merged[existingIndex], newSkill);
      }
      continue;
    }

    // Check for similar skills
    const similarIndex = merged.findIndex((s) => areSkillsSimilar(s, newSkill));

    if (similarIndex >= 0) {
      // Merge with similar skill
      merged[similarIndex] = mergeSkillContent(merged[similarIndex], newSkill);
      continue;
    }

    // Add new skill
    merged.push(newSkill);
    addedNames.add(newSkill.name);
  }

  return merged;
}

/**
 * Check if two skills are similar
 */
function areSkillsSimilar(skill1: GeneratedSkill, skill2: GeneratedSkill): boolean {
  // Check description similarity
  const desc1 = skill1.description.toLowerCase();
  const desc2 = skill2.description.toLowerCase();

  // Check for overlapping keywords
  const words1 = new Set(desc1.split(/\s+/));
  const words2 = new Set(desc2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const similarity = intersection.size / union.size;

  return similarity > 0.5; // 50% similarity threshold
}

/**
 * Merge two skills into one
 */
function mergeSkillContent(skill1: GeneratedSkill, skill2: GeneratedSkill): GeneratedSkill {
  // Keep the more detailed content
  const content = skill1.content.length > skill2.content.length ? skill1.content : skill2.content;

  // Merge triggers
  const triggers = [...new Set([...skill1.triggers, ...skill2.triggers])];

  // Update description to include both
  const description = skill1.description;

  return {
    name: skill1.name,
    description,
    content,
    triggers,
  };
}

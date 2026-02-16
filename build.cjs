const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const files = [
  "src/user-prompt-submit.ts",
  "src/post-tool-use.ts",
  "src/collect.ts"
];

const outDir = "plugin/scripts";

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

// Build each file with esbuild
for (const file of files) {
  const basename = path.basename(file, ".ts");
  const outFile = path.join(outDir, `${basename}.mjs`);

  console.log(`Building ${file}...`);

  try {
    execSync(`npx esbuild ${file} --bundle --platform=node --format=esm --external:@anthropic-ai/sdk --outfile=${outFile}`, {
      stdio: "pipe",
    });

    // Remove shebang from .mjs files (not compatible with ESM)
    let content = fs.readFileSync(outFile, "utf-8");
    if (content.startsWith("#!/usr/bin/env node\n")) {
      content = content.slice("#!/usr/bin/env node\n".length);
      fs.writeFileSync(outFile, content, "utf-8");
    }

    // Make executable
    fs.chmodSync(outFile, 0o755);

    console.log(`✅ ${basename}.mjs`);
  } catch (error) {
    console.error(`❌ Error building ${file}:`, error.message);
    console.error(error.stderr.toString());
    process.exit(1);
  }
}

console.log("\n✅ Build complete!");

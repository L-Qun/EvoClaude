<h1 align="center">
  <a href="https://github.com/L-Qun/EvoClaude">
    <img src="img/logo.png" alt="EvoClaude" width="400">
  </a>
</h1>

<h4 align="center">Agent self-evolution plugin for <a href="https://claude.com/claude-code" target="_blank">Claude Code</a>.</h4>

<p align="center">
  <a href="README.zh.md">🇨🇳 中文</a>
</p>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  </a>
  <a href="package.json">
    <img src="https://img.shields.io/badge/version-0.1.0-green.svg" alt="Version">
  </a>
  <a href="package.json">
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  </a>
</p>

<p align="center">
  <a href="#why-evoclaude">Why EvoClaude</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a> •
  <a href="#license">License</a>
</p>

---

## Why EvoClaude?

After using Claude Code for a while, you might notice that past experiences cannot be reused in the next task, and Claude Code continues to make the same mistakes. EvoClaude enables Claude Code agents to learn from their experiences and continuously improve through Agent Skills technology. We believe Agent Skills is the right answer to Agent self-evolution!

---

<p align="center">
  EvoClaude enables Claude Code agents to learn from their experiences and automatically generate reusable skills from patterns in your workflow. The more you use it, the smarter it gets.
</p>

---

## Quick Start

Start a new Claude Code session in the terminal and enter the following commands:

```
/plugin marketplace add L-Qun/EvoClaude

/plugin install evoclaude
```

Restart Claude Code. EvoClaude will automatically start learning from your sessions.

**Key Features:**

- 🧠 **Automatic Learning** - Captures patterns from your Claude Code sessions
- 🛠️ **Skill Generation** - Automatically creates reusable skills from discovered patterns
- 📈 **Progressive Improvement** - Gets smarter as it accumulates more experience
- 🔍 **Pattern Discovery** - Identifies recurring workflows and tool combinations
- ⚙️ **Fully Configurable** - Fine-grained control over learning behavior
- 🚀 **Zero Configuration** - Works out of the box with sensible defaults

---

## How It Works

EvoClaude learns from your sessions in two simple phases:

### 1. Collection Phase

Each session, EvoClaude captures and stores daily session data:

- Your prompts and instructions
- Tools used (Read, Edit, Grep, Bash, etc.)
- The sequence of operations
- Results and outcomes

Sessions are organized by date: `~/.evoclaude/sessions/YYYY-MM-DD.json`

### 2. Skill Generation Phase

When triggered (daily or manually):

1. **Analyze** today's sessions for reusable patterns
2. **Generate** skills following the official Claude Skills format (avoiding semantically duplicates)
3. **Merge** with existing skills, removing duplicates
4. **Package** skills into `.skill` files ready for use

### Example Workflow

If you worked on error handling today, EvoClaude will:

1. **Collect** all your error handling related tasks from today's sessions
2. **Analyze** the approaches and patterns you used
3. **Generate** an `error-handler` skill following the official format
4. **Merge** it with your existing skills (avoiding duplicates)
5. **Make it available** in all future sessions

---

## Configuration

### Settings File

Edit `~/.evoclaude/config.json` to customize behavior:

```json
{
  "skillLanguage": "auto",
  "skillsOutputDir": "project"
}
```

### Configuration Options

#### `skillLanguage` (enum)
- Language for generated skill content
- **Default**: `"auto"`
- **Options**:
  - `"auto"` - Automatically detect language from session prompts
  - `"en"` - Always generate skills in English
  - `"zh"` - Always generate skills in Chinese

#### `skillsOutputDir` (enum)
- Where to save generated skills
- **Default**: `"project"`
- **Options**:
  - `"project"` - Save skills in the project directory (`./project/.claude/skills`)
    - Recommended for: Project-specific skills, team-specific workflows
  - `"global"` - Save skills globally in your home directory (`~/.claude/skills`)
    - Recommended for: Personal skills shared across all projects

### Data Location

```
~/.evoclaude/
├── config.json           # Your settings
├── sessions/
│   ├── 2026-02-17.json   # Today's session data
│   └── 2026-02-16.json   # Previous day's session data
└── generated/
    └── temp/             # Temporary generated skills

# Skills output (based on skillsOutputDir setting):
./.claude/skills/         # Project-specific skills (default)
~/.claude/skills/         # Global skills (alternative)
```

---

## System Requirements

- **Node.js**: 18.0.0 or higher
- **Claude Code**: Latest version with plugin support
- **Operating System**: macOS, Linux, or Windows

---

## Development

### Getting Started

If you want to contribute or modify the plugin:

```bash
# Clone the repository
git clone https://github.com/L-Qun/EvoClaude.git
cd EvoClaude

# Install dependencies
npm install

# Build the plugin
npm run build

# Create symlink to Claude plugins directory
ln -s $(pwd) ~/.claude/plugins/evoclaude
```

### Available Scripts

- `npm run build` - Build the plugin
- `npm run lint` - Check code with Biome
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Biome
- `npm run check` - Run all checks (lint + format)

### Project Structure

```
EvoClaude/
├── .claude-plugin/         # Plugin manifest
├── plugin/                 # Plugin entry point
├── src/                    # Source code
│   ├── anthropic-client.ts     # Agent SDK integration
│   ├── collect.ts              # Collect hook
│   ├── config.ts               # Configuration management
│   ├── post-tool-use.ts        # Post-tool-use hook
│   ├── session-collector.ts    # Session collection
│   ├── skill-generator.ts      # Skill generation
│   ├── skill-merger.ts         # Skill merging
│   ├── types.ts                # Type definitions
│   └── user-prompt-submit.ts   # User prompt submit hook
├── package.json
└── tsconfig.json
```

---

## Troubleshooting

### Skills not appearing?

**Possible causes:**

- Not enough session data collected yet
- No clear patterns detected in today's sessions
- Skill generation prompt returned empty results

**Solutions:**

- Verify you've had enough sessions (check `~/.evoclaude/sessions/`)
- Review `plugin/logs/` for any errors
- Skills are generated only when clear reusable patterns are detected

### Plugin not loading?

**Solutions:**

- Ensure Node.js >= 18.0.0 is installed
- Verify the plugin is properly linked in `~/.claude/plugins/`
- Check Claude Code is up to date
- Review `plugin/logs/` for error messages

---

## Architecture

### Core Components

1. **Session Collector** - Captures and stores daily session data in `~/.evoclaude/sessions/YYYY-MM-DD.json`
2. **Skill Generator** - Analyzes daily sessions and generates skills using prompt engineering
3. **Skill Merger** - Merges new skills with existing ones, removing duplicates
4. **Skill Packager** - Packages skills into `.skill` files for distribution

### Data Flow

```
Session → Collector → Daily Sessions (2025-02-16/)
                                ↓
                         Skill Generation (triggered)
                                ↓
                    Generate Skills → temp/
                                ↓
                    Merge & Deduplicate → Skills Output Directory
                                ↓
                    Package → .skill files
```

### Directory Structure

```
~/.evoclaude/
├── config.json           # Your settings
├── sessions/
│   ├── 2026-02-17.json   # Today's session data
│   └── 2026-02-16.json   # Previous day's session data
└── generated/
    └── temp/             # Temporary generated skills
        ├── skill-1/
        │   └── SKILL.md
        └── skill-2/
            └── SKILL.md

# Skills output directory (based on skillsOutputDir config):
./.claude/skills/         # Project mode (default)
├── error-handler/
│   └── SKILL.md
└── component-creator/
    └── SKILL.md

# Or

~/.claude/skills/         # Global mode
├── error-handler/
│   └── SKILL.md
└── component-creator/
    └── SKILL.md
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure code passes linting (`npm run check`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep changes focused and atomic

---

## License

This project is licensed under the **MIT License**.

Copyright (c) 2025 Lincoln. All rights reserved.

See the [LICENSE](LICENSE) file for full details.

**What This Means:**

- You can use, modify, and distribute this software freely
- You may use it in commercial projects
- The license includes a warranty disclaimer
- Attribution is appreciated but not required

---

## Support

- **Documentation**: [README](README.md) | [中文文档](README.zh.md)
- **Issues**: [GitHub Issues](https://github.com/L-Qun/EvoClaude/issues)
- **Repository**: [github.com/L-Qun/EvoClaude](https://github.com/L-Qun/EvoClaude)
- **Author**: Lincoln ([@L-Qun](https://github.com/L-Qun))

---

**Built with love** | **Powered by Claude Code** | **Made with TypeScript**

# Configuration Guide

EvoClaude uses a configuration file at `~/.evoclaude/config.json`.

## Default Configuration

```json
{
  "skillLanguage": "auto",
  "skillsOutputDir": "project"
}
```

## Configuration Options

### `skillLanguage` (enum)
- Language for generated skill content
- **Default**: `"auto"`
- **Options**:
  - `"auto"` - Automatically detect language from session prompts
  - `"en"` - Always generate skills in English
  - `"zh"` - Always generate skills in Chinese

### `skillsOutputDir` (enum)
- Where to save generated skills
- **Default**: `"project"`
- **Options**:
  - `"project"` - Save skills in the project directory (`./.claude/skills`)
    - Recommended for: Project-specific skills, team-specific workflows
  - `"global"` - Save skills globally in your home directory (`~/.claude/skills`)
    - Recommended for: Personal skills shared across all projects

**Note**: Skills are automatically generated after each session when collection is enabled.

## API Key Setup

EvoClaude uses your existing Claude Code API key. No additional configuration needed!

The API key is automatically read from the `ANTHROPIC_API_KEY` environment variable that Claude Code uses.

## Example Configurations

### Project-Specific Skills
```json
{
  "skillLanguage": "auto",
  "skillsOutputDir": "project"
}
```

### Global Skills (Shared Across Projects)
```json
{
  "skillLanguage": "en",
  "skillsOutputDir": "global"
}
```

## Data Location

```
~/.evoclaude/
├── config.json           # Your settings
├── sessions/
│   ├── 2025-02-16.json   # Today's session data
│   └── 2025-02-15.json   # Previous days
└── generated/
    └── temp/             # Temporary generated skills
```

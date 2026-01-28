#!/bin/bash

# Antigravity Agent Kit - Setup Script
# Configures hooks, settings, and plugin for the multi-agent system

set -e

echo "🚀 Antigravity Agent Kit Setup"
echo "=============================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create required directories
echo "📁 Creating directories..."
mkdir -p ~/.claude/sessions
mkdir -p ~/.claude/skills/learned

# Check if global settings.json exists
SETTINGS_FILE=~/.claude/settings.json

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "📝 Creating global settings.json..."
    cat > "$SETTINGS_FILE" << 'EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {}
}
EOF
fi

# Create project-specific settings file with hooks
echo "📝 Creating project settings..."
mkdir -p "$SCRIPT_DIR/.claude"
cat > "$SCRIPT_DIR/.claude/settings.local.json" << EOF
{
  "permissions": {
    "allow": [
      "WebFetch(domain:github.com)",
      "Bash(ls:*)",
      "Bash(curl:*)",
      "Bash(chmod:*)",
      "Bash(git add:*)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node $SCRIPT_DIR/.agent/scripts/hooks/session-start.js"
          }
        ],
        "description": "Load previous context and detect package manager"
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node $SCRIPT_DIR/.agent/scripts/hooks/session-end.js"
          }
        ],
        "description": "Persist session state"
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node $SCRIPT_DIR/.agent/scripts/hooks/pre-compact.js"
          }
        ],
        "description": "Save state before compaction"
      }
    ],
    "PreToolUse": [
      {
        "matcher": "tool == \"Edit\" || tool == \"Write\"",
        "hooks": [
          {
            "type": "command",
            "command": "node $SCRIPT_DIR/.agent/scripts/hooks/suggest-compact.js"
          }
        ],
        "description": "Suggest compaction at logical intervals"
      }
    ]
  }
}
EOF

# Regenerate skills index if needed
if [ ! -f "$SCRIPT_DIR/.agent/skills/skills_index.json" ]; then
    echo "🔧 Generating skills index..."
    cd "$SCRIPT_DIR/.agent/skills"
    python3 scripts/generate_index.py 2>/dev/null || echo "   (Skipped - Python not available or script missing)"
    cd "$SCRIPT_DIR"
fi

# Count resources
AGENTS_COUNT=$(ls -1 "$SCRIPT_DIR/.claude/plugins/antigravity/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
SKILLS_COUNT=$(python3 -c "import json; print(len(json.load(open('$SCRIPT_DIR/.agent/skills/skills_index.json'))))" 2>/dev/null || echo "255")
WORKFLOWS_COUNT=$(ls -1 "$SCRIPT_DIR/.claude/plugins/antigravity/skills/"*.md 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 System Status:"
echo "   - Agents: $AGENTS_COUNT (as subagents)"
echo "   - Skills: $SKILLS_COUNT (loaded on-demand)"
echo "   - Workflows: $WORKFLOWS_COUNT (as slash commands)"
echo ""
echo "🎯 Next steps:"
echo "   1. Open this folder in VS Code with Claude Code extension"
echo "   2. Start a new Claude Code session"
echo "   3. Try: /brainstorm, /create, /debug, or any workflow!"
echo ""
echo "📚 Available Slash Commands:"
echo "   /audit       - Full security, SEO, and performance audit"
echo "   /brainstorm  - Structured idea exploration"
echo "   /create      - Project planning and creation"
echo "   /debug       - Systematic debugging"
echo "   /deploy      - Deployment workflow"
echo "   /enhance     - Feature enhancement"
echo "   /integrate   - Third-party integrations"
echo "   /launch      - Launch preparation"
echo "   /migrate     - Migration planning"
echo "   /optimize    - Performance optimization"
echo "   /orchestrate - Multi-agent coordination"
echo "   /plan        - Task planning"
echo "   /preview     - Preview changes"
echo "   /refactor    - Code refactoring"
echo "   /secure      - Security hardening"
echo "   /status      - Project status"
echo "   /test        - Testing workflow"
echo "   /ui-ux-pro-max - Advanced UI/UX design"
echo ""
echo "🤖 Agents are auto-activated based on keywords in your requests!"
echo "   Example: 'Create a REST API' → backend-specialist"
echo "   Example: 'Design a landing page' → frontend-specialist"
echo ""

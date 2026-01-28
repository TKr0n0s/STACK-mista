#!/bin/bash

# STACK-mista Setup Script
# Configures hooks and settings for the multi-agent system

set -e

echo "🚀 STACK-mista Setup"
echo "===================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create required directories
echo "📁 Creating directories..."
mkdir -p ~/.claude/sessions
mkdir -p ~/.claude/skills/learned

# Check if settings.json exists
SETTINGS_FILE=~/.claude/settings.json

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "📝 Creating settings.json..."
    cat > "$SETTINGS_FILE" << EOF
{
  "\$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {}
}
EOF
fi

# Create a project-specific settings file
echo "📝 Creating project settings..."
mkdir -p "$SCRIPT_DIR/.claude"
cat > "$SCRIPT_DIR/.claude/settings.local.json" << EOF
{
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
    python3 scripts/generate_index.py
    cd "$SCRIPT_DIR"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 System Status:"
echo "   - Agents: $(ls -1 $SCRIPT_DIR/.agent/agents/*.md 2>/dev/null | wc -l | tr -d ' ')"
echo "   - Skills: $(python3 -c "import json; print(len(json.load(open('$SCRIPT_DIR/.agent/skills/skills_index.json'))))" 2>/dev/null || echo "?")"
echo "   - Workflows: $(ls -1 $SCRIPT_DIR/.agent/workflows/*.md 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "🎯 Next steps:"
echo "   1. Open this folder in VS Code with Claude extension"
echo "   2. Start chatting! Agents activate automatically based on keywords"
echo ""
echo "📚 Available workflows:"
echo "   /create, /debug, /test, /deploy, /secure, /optimize"
echo "   /refactor, /audit, /integrate, /launch, /orchestrate"
echo ""

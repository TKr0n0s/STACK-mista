# STACK-mista - Multi-Agent System for Claude Code

A complete multi-agent ecosystem with 20 specialized agents, 255 skills, and 18 workflows.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/TKr0n0s/STACK-mista.git
cd STACK-mista

# 2. Run setup (configures hooks and settings)
./setup.sh
```

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 20 | Specialized AI personas (backend, security, devops, etc.) |
| **Skills** | 255 | Domain knowledge packages |
| **Workflows** | 18 | Slash commands (/create, /debug, /secure, etc.) |
| **Bundles** | 12 | Curated skill collections |
| **Hooks** | 4 | Memory persistence scripts |

## Agents

| Agent | Focus | Core Skills |
|-------|-------|-------------|
| `backend-specialist` | APIs, Node, Python | 21 skills |
| `frontend-specialist` | React, Vue, CSS | 14 skills |
| `security-auditor` | Vulnerabilities, OWASP | 19 skills |
| `penetration-tester` | Ethical hacking | 22 skills |
| `devops-engineer` | Docker, AWS, CI/CD | 15 skills |
| `database-architect` | SQL, NoSQL, Prisma | 10 skills |
| `test-engineer` | Jest, Playwright | 11 skills |
| ... and 13 more | | |

## Workflows

```bash
/create      # Create app from scratch
/debug       # Investigate bugs
/test        # Generate/run tests
/deploy      # Production deployment
/secure      # Security hardening
/optimize    # Performance tuning
/refactor    # Modernize code
/audit       # Full audit (security, SEO, performance)
/integrate   # Third-party integrations (Stripe, Firebase, etc.)
/launch      # Pre-launch checklist
/orchestrate # Multi-agent coordination
```

## How It Works

1. **Automatic Agent Routing**: Based on keywords in your message, the right agent is activated
   - Say "API" or "backend" → `backend-specialist`
   - Say "security" or "vulnerability" → `security-auditor`
   - Say "test" or "jest" → `test-engineer`

2. **Skills Loading**: Agents load relevant skills on-demand via `@skill-name`

3. **Memory Hooks**: Session state is preserved in `~/.claude/sessions/`

## Manual Setup (if setup.sh doesn't work)

### 1. Copy hooks configuration

Add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "*",
      "hooks": [{"type": "command", "command": "node ${PROJECT_DIR}/.agent/scripts/hooks/session-start.js"}]
    }],
    "SessionEnd": [{
      "matcher": "*",
      "hooks": [{"type": "command", "command": "node ${PROJECT_DIR}/.agent/scripts/hooks/session-end.js"}]
    }]
  }
}
```

Replace `${PROJECT_DIR}` with your actual project path.

### 2. Create session directories

```bash
mkdir -p ~/.claude/sessions
mkdir -p ~/.claude/skills/learned
```

## Architecture

Based on industry best practices:
- **Skills Pattern**: On-demand capability loading
- **Supervisor Orchestration**: Central coordinator
- **Sequential Pipeline**: Chained workflows
- **Concurrent Execution**: Parallel agent dispatch

## Sources

- [Microsoft Azure AI Agent Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [LangChain Multi-Agent Architecture](https://www.blog.langchain.com/choosing-the-right-multi-agent-architecture/)
- [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)

## License

MIT

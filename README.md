# Antigravity Agent Kit - Multi-Agent System for Claude Code

A complete plug-and-play multi-agent ecosystem with 20 specialized agents, 255 skills, and 18 workflows.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/antigravity-agent-kit.git
cd antigravity-agent-kit

# 2. Run setup
./setup.sh

# 3. Open in VS Code with Claude Code extension
# 4. Start using! Try: /brainstorm, /create, /debug
```

That's it! Everything works out of the box.

## What's Included

| Component | Count | Description |
|-----------|-------|-------------|
| **Agents** | 20 | Specialized AI personas (backend, security, devops, etc.) |
| **Skills** | 255 | Domain knowledge packages |
| **Workflows** | 18 | Slash commands (/create, /debug, /secure, etc.) |
| **Bundles** | 12 | Curated skill collections |
| **Hooks** | 4 | Session persistence scripts |

## Available Slash Commands

| Command | Description |
|---------|-------------|
| `/audit` | Full security, SEO, and performance audit |
| `/brainstorm` | Structured idea exploration with pros/cons |
| `/create` | Create apps and features from scratch |
| `/debug` | Systematic debugging workflow |
| `/deploy` | Production deployment with checks |
| `/enhance` | Feature enhancement |
| `/integrate` | Third-party integrations (Stripe, Firebase, etc.) |
| `/launch` | Pre-launch checklist |
| `/migrate` | Migration planning |
| `/optimize` | Performance optimization |
| `/orchestrate` | Multi-agent coordination |
| `/plan` | Task planning and breakdown |
| `/preview` | Preview changes before implementation |
| `/refactor` | Code refactoring |
| `/secure` | Security hardening |
| `/status` | Project status overview |
| `/test` | Testing workflow |
| `/ui-ux-pro-max` | Advanced UI/UX design |

## Agents

Agents are automatically activated based on keywords in your requests:

| Keywords | Agent | Focus |
|----------|-------|-------|
| api, backend, server, node, python | `backend-specialist` | APIs, Node, Python |
| frontend, ui, react, vue, css | `frontend-specialist` | React, Vue, CSS |
| database, sql, postgres, mongo | `database-architect` | SQL, NoSQL, Prisma |
| security, vulnerability, owasp | `security-auditor` | Security analysis |
| pentest, exploit, attack | `penetration-tester` | Ethical hacking |
| deploy, docker, aws, ci/cd | `devops-engineer` | Docker, AWS, CI/CD |
| test, jest, playwright | `test-engineer` | Testing |
| debug, error, fix | `debugger` | Debugging |
| performance, speed, optimize | `performance-optimizer` | Performance |
| seo, ranking, google | `seo-specialist` | SEO |
| mobile, ios, android | `mobile-developer` | Mobile apps |
| game, unity, godot | `game-developer` | Game development |
| plan, scope, requirements | `project-planner` | Planning |
| product, features, roadmap | `product-manager` | Product management |
| docs, readme, api-docs | `documentation-writer` | Documentation |
| refactor, legacy, debt | `code-archaeologist` | Code modernization |
| explore, analyze, understand | `explorer-agent` | Codebase analysis |
| orchestrate, coordinate | `orchestrator` | Multi-agent coordination |
| qa, e2e, automation | `qa-automation-engineer` | QA automation |
| backlog, stories, sprint | `product-owner` | Agile/Scrum |

## How It Works

1. **CLAUDE.md**: Loaded automatically, contains all routing rules
2. **Automatic Agent Routing**: Keywords trigger the right agent
3. **Skills Loading**: Agents load skills on-demand via `@skill-name`
4. **Plugin System**: Workflows registered as Claude Code skills
5. **Session Hooks**: State persisted between sessions

## Project Structure

```
.
├── CLAUDE.md                    # Main rules (auto-loaded)
├── setup.sh                     # One-time setup script
├── .agent/
│   ├── ARCHITECTURE.md         # System documentation
│   ├── agents/                 # 20 agent definitions
│   ├── skills/                 # 255 skill packages
│   ├── workflows/              # 18 workflow definitions
│   └── scripts/                # Validation & hooks
└── .claude/
    ├── settings.local.json     # Project settings (generated)
    └── plugins/antigravity/    # Plugin (registered with Claude Code)
        ├── plugin.json
        ├── skills/             # Workflows as slash commands
        └── agents/             # Agents as subagents
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

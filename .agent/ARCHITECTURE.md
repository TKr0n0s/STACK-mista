# Antigravity Kit Architecture

> Comprehensive AI Agent Capability Expansion Toolkit

---

## 📋 Overview

Antigravity Kit is a modular multi-agent system consisting of:

- **20 Specialist Agents** - Role-based AI personas
- **255 Skills** - Domain-specific knowledge modules
- **18 Workflows** - Slash command procedures
- **12 Bundles** - Curated skill packs by role

### Architecture Patterns
- **Skills Pattern**: On-demand capability loading via `@skill-name`
- **Supervisor Orchestration**: Central coordinator for multi-agent tasks
- **Sequential Pipeline**: Chained workflows for complex tasks
- **Concurrent Execution**: Parallel agent dispatch for performance

---

## 🏗️ Directory Structure

```plaintext
.agent/
├── ARCHITECTURE.md          # This file
├── agents/                  # 20 Specialist Agents
├── skills/                  # 255 Skills
│   ├── skills_index.json    # Complete skill registry
│   ├── docs/
│   │   ├── BUNDLES.md       # 12 curated bundles
│   │   └── SECURITY_GUARDRAILS.md  # Risk policy
│   └── scripts/             # Skill toolchain
├── workflows/               # 18 Slash Commands
├── rules/                   # Global Rules
└── scripts/                 # Master Validation Scripts
```

---

## 🤖 Agents (20)

Specialist AI personas for different domains.

| Agent | Focus | Core Skills |
| ----- | ----- | ----------- |
| `orchestrator` | Multi-agent coordination | parallel-agents, langgraph, agent-evaluation |
| `project-planner` | Discovery, task planning | plan-writing, concise-planning, executing-plans |
| `frontend-specialist` | Web UI/UX | react-patterns, tailwind-patterns, typescript-expert |
| `backend-specialist` | API, business logic | api-patterns, nestjs-expert, stripe-integration |
| `database-architect` | Schema, SQL | postgres-best-practices, prisma-expert, nosql-expert |
| `mobile-developer` | iOS, Android, RN | mobile-design, app-store-optimization, firebase |
| `game-developer` | Game logic, mechanics | game-development/* (12 skills) |
| `devops-engineer` | CI/CD, Docker | docker-expert, aws-serverless, github-workflow-automation |
| `security-auditor` | Security compliance | vulnerability-scanner, ethical-hacking-methodology |
| `penetration-tester` | Offensive security | pentest-checklist, metasploit-framework, burp-suite-testing |
| `test-engineer` | Testing strategies | testing-patterns, playwright-skill, tdd-workflow |
| `debugger` | Root cause analysis | systematic-debugging, test-fixing, performance-profiling |
| `performance-optimizer` | Speed, Web Vitals | performance-profiling, web-performance-optimization |
| `seo-specialist` | Ranking, visibility | seo-fundamentals, seo-audit, schema-markup |
| `documentation-writer` | Manuals, docs | api-documentation-generator, documentation-templates |
| `product-manager` | Requirements, user stories | product-manager-toolkit, launch-strategy |
| `product-owner` | Strategy, backlog, MVP | plan-writing, brainstorming |
| `qa-automation-engineer` | E2E testing, CI pipelines | playwright-skill, webapp-testing |
| `code-archaeologist` | Legacy code, refactoring | production-code-audit, clean-code, kaizen |
| `explorer-agent` | Codebase analysis | architecture, systematic-debugging |

---

## 🧩 Skills (255)

Modular knowledge domains that agents can load on-demand via `@skill-name` syntax.

> **Full Registry:** `.agent/skills/skills_index.json`
> **Curated Bundles:** `.agent/skills/docs/BUNDLES.md`

### Skill Categories

| Category | Count | Examples |
| -------- | ----- | -------- |
| **Frontend & UI** | 25+ | react-patterns, tailwind-patterns, 3d-web-experience |
| **Backend & API** | 20+ | api-patterns, nestjs-expert, graphql, stripe-integration |
| **Database** | 10+ | postgres-best-practices, prisma-expert, nosql-expert |
| **Security & Pentesting** | 30+ | vulnerability-scanner, burp-suite-testing, metasploit-framework |
| **DevOps & Cloud** | 15+ | docker-expert, aws-serverless, github-workflow-automation |
| **AI/LLM Agents** | 20+ | langgraph, crewai, rag-engineer, prompt-engineer |
| **Mobile** | 10+ | mobile-design, app-store-optimization |
| **Game Development** | 12 | game-development/* |
| **Testing & QA** | 10+ | playwright-skill, tdd-workflow, webapp-testing |
| **Marketing & Growth** | 15+ | seo-fundamentals, copywriting, pricing-strategy |
| **Integrations** | 25+ | stripe-integration, firebase, supabase, clerk-auth |
| **Productivity** | 20+ | brainstorming, plan-writing, documentation-templates |

### Skill Syntax

```markdown
Standard: @skill-name

Examples:
- @stripe-integration
- @ethical-hacking-methodology
- @react-patterns

DEPRECATED: @[skills/...] - DO NOT USE
```

---

## 🔄 Workflows (18)

Slash command procedures. Invoke with `/command`.

### Existing Workflows (11)

| Command | Description | Primary Agents |
| ------- | ----------- | -------------- |
| `/brainstorm` | Socratic discovery | - |
| `/create` | Create new application | project-planner, all specialists |
| `/debug` | Debug issues | debugger, explorer-agent |
| `/deploy` | Deploy application | devops-engineer |
| `/enhance` | Improve existing code | specialists |
| `/orchestrate` | Multi-agent coordination | orchestrator + 3+ agents |
| `/plan` | Task breakdown | project-planner |
| `/preview` | Preview changes | - |
| `/status` | Check project status | - |
| `/test` | Run tests | test-engineer |
| `/ui-ux-pro-max` | Design with 50 styles | frontend-specialist |

### New Workflows (7)

| Command | Description | Primary Agents |
| ------- | ----------- | -------------- |
| `/refactor` | Modernize legacy code | code-archaeologist, test-engineer |
| `/secure` | Security hardening | security-auditor, penetration-tester |
| `/optimize` | Performance tuning | performance-optimizer |
| `/migrate` | Framework migrations | code-archaeologist, specialists |
| `/audit` | Full audit (security, SEO, perf) | security-auditor, seo-specialist |
| `/integrate` | Third-party integrations | backend-specialist |
| `/launch` | Pre-launch checklist | product-manager, devops-engineer |

---

## 🛡️ Security Policy

> **Full Policy:** `.agent/skills/docs/SECURITY_GUARDRAILS.md`

### Risk Classification

| Risk | Meaning | Requires |
|------|---------|----------|
| `none` | Pure reasoning | Nothing |
| `safe` | Read-only operations | Nothing |
| `critical` | Modifies state | User awareness |
| `offensive` | Security testing | **EXPLICIT AUTHORIZATION** |

Skills with `risk: offensive` require explicit user authorization before execution.

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

---

## 📜 Scripts (2 Master)

Master validation scripts that orchestrate skill-level scripts.

| Script | Purpose | When to Use |
| ------ | ------- | ----------- |
| `checklist.py` | Priority-based validation (Core checks) | Development, pre-commit |
| `verify_all.py` | Comprehensive verification (All checks) | Pre-deployment, releases |

### Usage

```bash
# Quick validation during development
python3 .agent/scripts/checklist.py .

# Full verification before deployment
python3 .agent/scripts/verify_all.py . --url http://localhost:3000
```

---

## 📊 Statistics

| Metric | Value |
| ------ | ----- |
| **Total Agents** | 20 |
| **Total Skills** | 255 |
| **Total Workflows** | 18 |
| **Total Bundles** | 12 |
| **Total Scripts** | 2 (master) + 18 (skill-level) |

---

## 🔗 Quick Reference

| Need | Agent | Core Skills |
| ---- | ----- | ------ |
| Web App | `frontend-specialist` | react-patterns, tailwind-patterns |
| API | `backend-specialist` | api-patterns, nestjs-expert, stripe-integration |
| Mobile | `mobile-developer` | mobile-design, firebase |
| Database | `database-architect` | postgres-best-practices, prisma-expert |
| Security | `security-auditor` | vulnerability-scanner, ethical-hacking-methodology |
| Pentest | `penetration-tester` | pentest-checklist, metasploit-framework |
| Testing | `test-engineer` | testing-patterns, playwright-skill |
| Debug | `debugger` | systematic-debugging |
| Performance | `performance-optimizer` | performance-profiling |
| SEO | `seo-specialist` | seo-fundamentals, seo-audit |
| Plan | `project-planner` | plan-writing, brainstorming |
| Multi-Agent | `orchestrator` | parallel-agents, langgraph |

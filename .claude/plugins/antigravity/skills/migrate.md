---
name: migrate
description: Framework and stack migrations
---

# /migrate - Stack Migration

Safely migrate between frameworks, libraries, or architectural patterns.

## When to Use

- Framework upgrades (React 18→19, Vue 2→3)
- Library migrations (Redux→Zustand, REST→GraphQL)
- Database migrations
- Cloud provider changes
- Language/runtime upgrades

## Agents

- `code-archaeologist` (lead) - Analyze current state
- `backend-specialist` - Backend migrations
- `frontend-specialist` - Frontend migrations
- `test-engineer` - Regression test suite

## Skills

- @react-best-practices
- @nextjs-best-practices
- @typescript-expert
- @testing-patterns
- @production-code-audit

## Flow

```
1. INVENTORY
   └── Map current stack and dependencies
   └── Identify breaking changes

2. PLAN
   └── Define migration phases
   └── Identify risks and rollback points

3. TEST
   └── Create regression test suite
   └── Snapshot current behavior

4. MIGRATE
   └── Phase by phase with validation
   └── Codemods where available

5. VERIFY
   └── Full test pass
   └── Manual QA on critical paths
```

## Protocol

### Phase 1: Inventory

Document current state:
```markdown
## Current Stack
- Framework: Next.js 13.x
- State: Redux 4.x
- Styling: CSS Modules
- Testing: Jest + RTL

## Dependencies Analysis
- Total packages: X
- Direct dependencies: X
- Dev dependencies: X
- Outdated: X
- Deprecated: X
```

Identify breaking changes:
```bash
# Check for breaking changes
npx npm-check-updates --target latest
```

### Phase 2: Planning

Migration strategy options:

| Strategy | When to Use | Risk |
|----------|-------------|------|
| **Big Bang** | Small codebase, good test coverage | High |
| **Strangler Fig** | Large codebase, incremental | Low |
| **Parallel Run** | Critical systems, zero downtime | Medium |
| **Feature Toggle** | Gradual rollout needed | Low |

Create migration plan:
```markdown
## Migration Plan: React 18 → 19

### Phase 1: Preparation (1 week)
- [ ] Update build tools
- [ ] Create feature flags
- [ ] Snapshot tests

### Phase 2: Core Migration (2 weeks)
- [ ] Update React/ReactDOM
- [ ] Fix breaking changes
- [ ] Update hooks usage

### Phase 3: Cleanup (1 week)
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Performance testing

### Rollback Plan
- Feature flag: REACT_19_ENABLED
- Revert commit: [hash]
- Database rollback: N/A
```

### Phase 3: Test Suite

Create comprehensive tests:
```typescript
// Snapshot current behavior
describe('Critical User Flows', () => {
  it('login flow works', async () => {
    // Test current implementation
  });

  it('checkout flow works', async () => {
    // Test current implementation
  });
});
```

### Phase 4: Migration

Use codemods when available:
```bash
# React codemods
npx @react-codemod/cli <transform> <path>

# Next.js codemods
npx @next/codemod <transform> <path>
```

Manual migration checklist:
- [ ] Update package.json
- [ ] Run codemods
- [ ] Fix type errors
- [ ] Fix test failures
- [ ] Update imports
- [ ] Test in staging

### Phase 5: Verification

```bash
# Run all tests
npm test

# Run type check
npx tsc --noEmit

# Run lint
npm run lint

# Run e2e tests
npm run test:e2e
```

## Output Format

```markdown
## Migration Report

### Summary
- **From:** [old stack]
- **To:** [new stack]
- **Duration:** X days
- **Files Changed:** X

### Breaking Changes Resolved
| Change | Files Affected | Solution |
|--------|----------------|----------|
| ... | ... | ... |

### Test Results
- Unit tests: ✅ X passed
- Integration: ✅ X passed
- E2E: ✅ X passed

### Performance Comparison
| Metric | Before | After |
|--------|--------|-------|
| Bundle size | X | Y |
| Build time | X | Y |
| LCP | X | Y |

### Known Issues
- [list any remaining issues]

### Rollback Instructions
1. ...
2. ...
```

## Related Workflows

- `/refactor` - For code improvements during migration
- `/test` - For generating migration tests
- `/deploy` - For deploying migrated code

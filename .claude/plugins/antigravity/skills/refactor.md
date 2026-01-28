---
name: refactor
description: Modernize and refactor legacy code with safety nets
---

# /refactor - Code Modernization

Safely refactor code with characterization tests and incremental changes.

## When to Use

- Legacy code modernization
- Technical debt reduction
- Code quality improvements
- Architecture refactoring

## Agents

- `code-archaeologist` (lead) - Analyze and understand legacy code
- `backend-specialist` OR `frontend-specialist` - Implement changes
- `test-engineer` - Create characterization tests

## Skills

- @production-code-audit
- @clean-code
- @testing-patterns
- @kaizen
- @systematic-debugging

## Flow

```
1. ANALYZE
   └── Map dependencies, understand existing code
   └── Identify pain points and risks

2. CHARACTERIZE
   └── Create tests freezing current behavior
   └── Ensure test coverage before changes

3. REFACTOR
   └── Incremental changes with test validation
   └── One change at a time, verify after each

4. VERIFY
   └── Run full test suite
   └── Compare before/after metrics
```

## Protocol

### Phase 1: Understanding (MANDATORY)

Before any refactoring:
1. Read ALL affected files
2. Map dependencies (what uses this code?)
3. Identify side effects
4. Document current behavior

### Phase 2: Safety Net

Create characterization tests:
```typescript
// Example: Capture current behavior
describe('Legacy Function', () => {
  it('current behavior snapshot', () => {
    const result = legacyFunction(input);
    expect(result).toMatchSnapshot();
  });
});
```

### Phase 3: Incremental Changes

- **One change at a time**
- **Run tests after each change**
- **Commit frequently**
- **Keep old and new running in parallel if needed**

### Phase 4: Verification

Run validation:
```bash
python3 .agent/scripts/checklist.py .
```

## Output Format

```markdown
## Refactoring Report

### Files Analyzed
- [list of files]

### Changes Made
| File | Change | Risk |
|------|--------|------|
| ... | ... | ... |

### Test Coverage
- Before: X%
- After: Y%

### Risks Mitigated
- [list]

### Remaining Technical Debt
- [list if any]
```

## Anti-Patterns

- ❌ Big bang refactoring (changing everything at once)
- ❌ Refactoring without tests
- ❌ Changing behavior while refactoring structure
- ❌ Skipping code review

## Related Workflows

- `/debug` - For investigating issues found during refactoring
- `/test` - For generating additional tests
- `/audit` - For comprehensive code review

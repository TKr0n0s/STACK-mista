---
name: secure
description: Security hardening and vulnerability assessment
---

# /secure - Security Hardening

Comprehensive security audit and remediation workflow.

## When to Use

- Pre-deployment security check
- After adding authentication/authorization
- Periodic security audits
- After security incident
- Compliance requirements

## Agents

- `security-auditor` (lead) - Vulnerability assessment
- `penetration-tester` - Exploit verification
- `backend-specialist` - Remediation implementation

## Skills

- @vulnerability-scanner
- @ethical-hacking-methodology
- @pentest-checklist
- @api-security-best-practices
- @top-web-vulnerabilities
- @broken-authentication
- @sql-injection-testing
- @xss-html-injection

## Flow

```
1. SCAN
   └── Automated vulnerability detection
   └── Dependency audit (npm audit, pip audit)

2. ASSESS
   └── Manual review of findings
   └── Verify exploitability

3. PRIORITIZE
   └── CVSS scoring
   └── Risk matrix (likelihood × impact)

4. REMEDIATE
   └── Fix critical/high first
   └── Document changes

5. VERIFY
   └── Re-scan to confirm fixes
   └── Regression testing
```

## Protocol

### Phase 1: Automated Scanning

Run security scan:
```bash
python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py .
```

Check dependencies:
```bash
npm audit --audit-level=high
# or
pip audit
```

### Phase 2: Manual Assessment

Review OWASP Top 10:2025:
| # | Category | Check |
|---|----------|-------|
| A01 | Broken Access Control | Authorization gaps, IDOR |
| A02 | Security Misconfiguration | Headers, defaults |
| A03 | Supply Chain | Dependencies, CI/CD |
| A04 | Cryptographic Failures | Weak crypto, exposed secrets |
| A05 | Injection | SQL, XSS, command |
| A06 | Insecure Design | Architecture flaws |
| A07 | Authentication Failures | Sessions, MFA |
| A08 | Integrity Failures | Unsigned updates |
| A09 | Logging Failures | Blind spots |
| A10 | Exceptional Conditions | Error handling |

### Phase 3: Risk Prioritization

```
CRITICAL (Fix immediately):
- Remote code execution
- Authentication bypass
- SQL injection with data exposure

HIGH (Fix within 24h):
- XSS with session theft potential
- IDOR with sensitive data
- Weak cryptography

MEDIUM (Fix within 1 week):
- Information disclosure
- Missing security headers
- Verbose error messages

LOW (Fix in next sprint):
- Missing rate limiting
- Weak password policy
- Minor information leakage
```

### Phase 4: Remediation

For each vulnerability:
1. Understand the root cause
2. Implement fix
3. Add test to prevent regression
4. Document the change

### Phase 5: Verification

Re-run security scan:
```bash
python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py .
```

## Output Format

```markdown
## Security Audit Report

### Executive Summary
- Total vulnerabilities: X
- Critical: X | High: X | Medium: X | Low: X
- Security posture score: X/100

### Findings

#### [CRITICAL] Vulnerability Name
- **Location:** file:line
- **Description:** ...
- **Impact:** ...
- **Remediation:** ...
- **Status:** Fixed/Pending

### Remediation Summary
| Finding | Severity | Status | Fix |
|---------|----------|--------|-----|
| ... | ... | ... | ... |

### Recommendations
1. ...
2. ...
```

## Authorization Required

⚠️ **IMPORTANT**: Skills with `risk: offensive` require explicit user authorization.

Before running penetration tests:
```
⚠️ This workflow will use offensive security testing.
Do you have authorization to test this system? (yes/no)
```

## Related Workflows

- `/audit` - Full audit including SEO and performance
- `/deploy` - Pre-deployment checks include security
- `/test` - Security-focused test generation

---
name: audit
description: Comprehensive audit (security, SEO, performance, accessibility)
---

# /audit - Full Audit

Comprehensive multi-category audit covering security, SEO, performance, and accessibility.

## When to Use

- Pre-launch review
- Periodic health checks
- After major releases
- Compliance requirements
- Client deliverables

## Agents

- `security-auditor` - Security assessment
- `seo-specialist` - SEO and content audit
- `performance-optimizer` - Performance metrics
- `frontend-specialist` - Accessibility and UX

## Skills

- @vulnerability-scanner
- @seo-audit
- @performance-profiling
- @web-design-guidelines

## Flow

```
1. SECURITY AUDIT
   └── Vulnerability scan
   └── Dependency audit
   └── OWASP checklist

2. SEO AUDIT
   └── Technical SEO
   └── Content analysis
   └── Core Web Vitals impact

3. PERFORMANCE AUDIT
   └── Lighthouse metrics
   └── Bundle analysis
   └── Runtime performance

4. ACCESSIBILITY AUDIT
   └── WCAG compliance
   └── Screen reader testing
   └── Keyboard navigation

5. REPORT
   └── Consolidated findings
   └── Prioritized recommendations
```

## Protocol

### Category 1: Security

Run security checks:
```bash
python3 .agent/skills/vulnerability-scanner/scripts/security_scan.py .
npm audit --audit-level=moderate
```

Checklist:
- [ ] No hardcoded secrets
- [ ] Dependencies up to date
- [ ] Security headers present
- [ ] HTTPS enforced
- [ ] Input validation
- [ ] Output encoding
- [ ] Authentication secure
- [ ] Authorization proper

### Category 2: SEO

Run SEO checks:
```bash
python3 .agent/skills/seo-fundamentals/scripts/seo_checker.py .
```

Checklist:
- [ ] Meta tags present (title, description)
- [ ] Open Graph tags
- [ ] Canonical URLs
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Schema markup
- [ ] Mobile-friendly
- [ ] Page speed optimized

### Category 3: Performance

Run performance checks:
```bash
python3 .agent/skills/performance-profiling/scripts/lighthouse_audit.py --url <URL>
python3 .agent/skills/performance-profiling/scripts/bundle_analyzer.py .
```

Metrics to check:
| Metric | Target | Weight |
|--------|--------|--------|
| LCP | ≤2.5s | 25% |
| INP | ≤200ms | 30% |
| CLS | ≤0.1 | 25% |
| FCP | ≤1.8s | 10% |
| TTFB | ≤800ms | 10% |

### Category 4: Accessibility

Run accessibility checks:
```bash
python3 .agent/skills/frontend-design/scripts/accessibility_checker.py .
```

WCAG 2.1 checklist:
- [ ] Alt text for images
- [ ] Sufficient color contrast
- [ ] Keyboard navigable
- [ ] Focus indicators visible
- [ ] Form labels present
- [ ] Error messages clear
- [ ] Skip links available
- [ ] ARIA labels correct

## Output Format

```markdown
## Comprehensive Audit Report

### Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| Security | 85/100 | ⚠️ Needs attention |
| SEO | 92/100 | ✅ Good |
| Performance | 78/100 | ⚠️ Needs attention |
| Accessibility | 95/100 | ✅ Good |
| **Overall** | **87/100** | ⚠️ |

---

### Security Findings

#### Critical (0)
None

#### High (2)
1. **Outdated dependency** - lodash@4.17.20
   - Risk: Prototype pollution
   - Fix: Update to 4.17.21+

2. **Missing security header** - X-Content-Type-Options
   - Risk: MIME sniffing attacks
   - Fix: Add header to server config

#### Medium (3)
...

---

### SEO Findings

| Check | Status | Details |
|-------|--------|---------|
| Meta title | ✅ | Present on all pages |
| Meta description | ⚠️ | Missing on 3 pages |
| Canonical URLs | ✅ | Properly configured |
| Schema markup | ❌ | Not implemented |

Recommendations:
1. Add meta descriptions to: /about, /contact, /pricing
2. Implement JSON-LD schema markup
3. Create XML sitemap

---

### Performance Findings

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP | 2.8s | ≤2.5s | ⚠️ |
| INP | 150ms | ≤200ms | ✅ |
| CLS | 0.05 | ≤0.1 | ✅ |
| Bundle | 1.2MB | ≤500KB | ❌ |

Recommendations:
1. Optimize hero image (saves 0.3s LCP)
2. Code split large components
3. Enable compression

---

### Accessibility Findings

| Check | Status | WCAG |
|-------|--------|------|
| Alt text | ⚠️ 3 images missing | 1.1.1 |
| Color contrast | ✅ | 1.4.3 |
| Keyboard nav | ✅ | 2.1.1 |
| Focus visible | ⚠️ Custom focus styles | 2.4.7 |

---

### Action Items (Prioritized)

| Priority | Item | Category | Effort |
|----------|------|----------|--------|
| P0 | Update lodash | Security | 5 min |
| P0 | Add security headers | Security | 15 min |
| P1 | Optimize images | Performance | 1 hour |
| P1 | Add alt text | Accessibility | 30 min |
| P2 | Schema markup | SEO | 2 hours |
| P2 | Code splitting | Performance | 4 hours |
```

## Subcommands

- `/audit security` - Security only
- `/audit seo` - SEO only
- `/audit performance` - Performance only
- `/audit a11y` - Accessibility only
- `/audit` - Full audit (all categories)

## Related Workflows

- `/secure` - Deep security hardening
- `/optimize` - Detailed performance optimization
- `/deploy` - Pre-deployment checks

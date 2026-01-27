---
name: launch
description: Pre-launch checklist and go-to-market preparation
---

# /launch - Launch Preparation

Comprehensive pre-launch checklist and go-to-market preparation.

## When to Use

- Before initial product launch
- Before major feature releases
- Before marketing campaigns
- Startup launch preparation

## Agents

- `product-manager` (lead) - Launch coordination
- `devops-engineer` - Deployment readiness
- `seo-specialist` - SEO and visibility
- `security-auditor` - Security clearance

## Skills

- @deployment-procedures
- @seo-fundamentals
- @launch-strategy
- @vulnerability-scanner
- @analytics-tracking

## Flow

```
1. TECHNICAL READINESS
   └── Security scan
   └── Performance check
   └── Error monitoring

2. SEO & VISIBILITY
   └── Meta tags
   └── Sitemap
   └── Analytics

3. INFRASTRUCTURE
   └── Scaling plan
   └── Backup strategy
   └── Monitoring

4. DOCUMENTATION
   └── User docs
   └── API docs
   └── Support resources

5. GO/NO-GO
   └── Final checklist
   └── Rollback plan
   └── Launch!
```

## Protocol

### Phase 1: Technical Readiness

#### Security Checklist
```bash
python3 .agent/scripts/checklist.py .
```

- [ ] Security scan passed
- [ ] No critical vulnerabilities
- [ ] Dependencies up to date
- [ ] Secrets secured
- [ ] HTTPS enforced
- [ ] Security headers configured

#### Performance Checklist
- [ ] Core Web Vitals passing
- [ ] Load testing completed
- [ ] CDN configured
- [ ] Images optimized
- [ ] Caching strategy implemented

#### Error Handling
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Error pages (404, 500) customized
- [ ] Logging configured
- [ ] Alerts set up

### Phase 2: SEO & Visibility

#### Technical SEO
- [ ] Meta titles (50-60 chars)
- [ ] Meta descriptions (150-160 chars)
- [ ] Open Graph tags
- [ ] Twitter cards
- [ ] Canonical URLs
- [ ] Sitemap.xml submitted
- [ ] Robots.txt configured

#### Analytics
- [ ] Google Analytics / Plausible
- [ ] Search Console verified
- [ ] Conversion tracking
- [ ] Event tracking

#### Social Presence
- [ ] Social media accounts created
- [ ] Profile images/banners
- [ ] Bio/description written
- [ ] Links configured

### Phase 3: Infrastructure

#### Scaling
- [ ] Auto-scaling configured
- [ ] Database connection pooling
- [ ] Rate limiting in place
- [ ] Queue system for heavy tasks

#### Reliability
- [ ] Backup strategy documented
- [ ] Disaster recovery plan
- [ ] Health checks configured
- [ ] Uptime monitoring

#### Observability
- [ ] Application monitoring
- [ ] Infrastructure monitoring
- [ ] Log aggregation
- [ ] Alerting rules

### Phase 4: Documentation

#### User Documentation
- [ ] Getting started guide
- [ ] Feature documentation
- [ ] FAQ
- [ ] Video tutorials (optional)

#### Technical Documentation
- [ ] API reference
- [ ] Integration guides
- [ ] Changelog
- [ ] Status page

#### Support
- [ ] Support email configured
- [ ] Help desk / ticketing (optional)
- [ ] Community forum (optional)
- [ ] Knowledge base

### Phase 5: Go/No-Go Decision

#### Final Checklist

| Category | Status | Owner |
|----------|--------|-------|
| Security | ✅/❌ | Security |
| Performance | ✅/❌ | DevOps |
| SEO | ✅/❌ | Marketing |
| Docs | ✅/❌ | Product |
| Monitoring | ✅/❌ | DevOps |
| Legal | ✅/❌ | Legal |

#### Rollback Plan
```markdown
## Rollback Procedure

1. Trigger: [define failure conditions]
2. Decision maker: [name]
3. Steps:
   - Revert deployment
   - Restore database (if needed)
   - Notify users
   - Post-mortem
```

#### Launch Announcement
- [ ] Blog post ready
- [ ] Email announcement drafted
- [ ] Social posts scheduled
- [ ] Press release (if applicable)

## Output Format

```markdown
## Launch Readiness Report

### Summary

| Category | Score | Status |
|----------|-------|--------|
| Security | 95% | ✅ Ready |
| Performance | 88% | ✅ Ready |
| SEO | 100% | ✅ Ready |
| Infrastructure | 92% | ✅ Ready |
| Documentation | 85% | ⚠️ Minor gaps |
| **Overall** | **92%** | ✅ **GO** |

---

### Critical Items (Must Fix)

None

### Recommended Items (Should Fix)

1. Add FAQ section to docs
2. Increase test coverage to 80%

### Nice-to-Have (Future)

1. Video tutorials
2. Community forum

---

### Launch Checklist

#### Pre-Launch (T-24h)
- [ ] Final security scan
- [ ] Database backup
- [ ] Team briefing
- [ ] Support team ready

#### Launch (T-0)
- [ ] Deploy to production
- [ ] Verify deployment
- [ ] Enable features/flags
- [ ] Publish announcements

#### Post-Launch (T+1h)
- [ ] Monitor metrics
- [ ] Check error rates
- [ ] Respond to feedback
- [ ] Celebrate! 🎉

---

### Rollback Plan

**Trigger conditions:**
- Error rate > 5%
- Response time > 3s
- Critical bug discovered

**Procedure:**
1. Announce maintenance
2. Revert to previous version
3. Investigate and fix
4. Re-deploy when ready

---

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | Monitoring |
| Error rate | <1% | Sentry |
| Page load | <3s | Lighthouse |
| Signups | X/day | Analytics |
```

## Related Workflows

- `/secure` - Security hardening
- `/audit` - Full audit before launch
- `/deploy` - Deployment execution
- `/optimize` - Performance optimization

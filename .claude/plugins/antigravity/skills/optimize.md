---
name: optimize
description: Performance optimization and profiling
---

# /optimize - Performance Tuning

Profile, identify bottlenecks, and optimize application performance.

## When to Use

- Slow page loads
- High server response times
- Poor Core Web Vitals
- Database query performance issues
- Memory/CPU optimization
- Bundle size reduction

## Agents

- `performance-optimizer` (lead) - Profiling and optimization
- `frontend-specialist` - Frontend performance
- `database-architect` - Query optimization
- `backend-specialist` - API performance

## Skills

- @performance-profiling
- @web-performance-optimization
- @postgres-best-practices
- @analytics-tracking

## Flow

```
1. PROFILE
   └── Collect metrics (Lighthouse, DB queries, API latency)
   └── Establish baseline

2. ANALYZE
   └── Identify top 3 bottlenecks
   └── Root cause analysis

3. OPTIMIZE
   └── Apply targeted fixes
   └── One optimization at a time

4. MEASURE
   └── Compare before/after metrics
   └── Verify improvements
```

## Protocol

### Phase 1: Profiling

#### Frontend (Core Web Vitals)
```bash
# Run Lighthouse audit
python3 .agent/skills/performance-profiling/scripts/lighthouse_audit.py --url <URL>
```

Key metrics:
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | ≤4s | >4s |
| INP | ≤200ms | ≤500ms | >500ms |
| CLS | ≤0.1 | ≤0.25 | >0.25 |
| FCP | ≤1.8s | ≤3s | >3s |
| TTFB | ≤800ms | ≤1.8s | >1.8s |

#### Backend (API Performance)
- Response time percentiles (p50, p95, p99)
- Throughput (requests/second)
- Error rates

#### Database
- Slow query log
- Query execution plans (EXPLAIN ANALYZE)
- Connection pool utilization

### Phase 2: Analysis

Common bottlenecks:

**Frontend:**
- Large JavaScript bundles
- Unoptimized images
- Render-blocking resources
- Excessive re-renders

**Backend:**
- N+1 queries
- Missing indexes
- Synchronous I/O
- Memory leaks

**Database:**
- Full table scans
- Missing indexes
- Inefficient joins
- Lock contention

### Phase 3: Optimization

#### Frontend Optimizations
```typescript
// Code splitting
const Component = lazy(() => import('./Component'));

// Image optimization
<Image src={src} loading="lazy" />

// Memoization
const memoized = useMemo(() => expensive(), [deps]);
```

#### Backend Optimizations
```typescript
// Batch queries
const users = await prisma.user.findMany({
  where: { id: { in: ids } }
});

// Caching
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);
```

#### Database Optimizations
```sql
-- Add index
CREATE INDEX idx_users_email ON users(email);

-- Optimize query
EXPLAIN ANALYZE SELECT ...;
```

### Phase 4: Verification

Run benchmarks:
```bash
# Before: baseline
# After: optimized

# Compare metrics
python3 .agent/skills/performance-profiling/scripts/lighthouse_audit.py --url <URL>
```

## Output Format

```markdown
## Performance Optimization Report

### Baseline Metrics
| Metric | Value | Target |
|--------|-------|--------|
| LCP | 3.2s | ≤2.5s |
| ... | ... | ... |

### Bottlenecks Identified
1. **[Frontend]** Large bundle size (2.1MB)
2. **[Database]** N+1 query in /api/users
3. **[Backend]** Synchronous file I/O

### Optimizations Applied
| Issue | Fix | Impact |
|-------|-----|--------|
| Large bundle | Code splitting | -40% bundle size |
| N+1 query | Batch loading | -80% query time |
| Sync I/O | Async streams | -50% response time |

### Results
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| LCP | 3.2s | 2.1s | -34% |
| ... | ... | ... | ... |

### Recommendations
1. Enable CDN caching
2. Implement service worker
3. Add database read replicas
```

## Related Workflows

- `/audit` - Includes performance in full audit
- `/deploy` - Performance checks before deployment
- `/debug` - For investigating performance issues

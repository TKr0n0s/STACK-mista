---
name: integrate
description: Third-party service integration
---

# /integrate - Service Integration

Integrate third-party services and APIs into your application.

## When to Use

- Adding payment processing (Stripe)
- Adding authentication (Clerk, Auth0)
- Adding database services (Firebase, Supabase)
- Adding communication (Twilio, SendGrid)
- Adding analytics or monitoring

## Agents

- `backend-specialist` (lead) - API integration
- `frontend-specialist` - UI integration
- `security-auditor` - Security review

## Skills

- @stripe-integration
- @firebase
- @supabase
- @clerk-auth
- @twilio-communications
- @api-patterns
- @api-security-best-practices

## Supported Integrations

| Category | Services |
|----------|----------|
| **Payments** | Stripe, Plaid |
| **Auth** | Clerk, Firebase Auth, Supabase Auth, Auth0 |
| **Database** | Firebase, Supabase, Neon, PlanetScale |
| **Messaging** | Twilio, SendGrid, Resend |
| **Commerce** | Shopify, Stripe Billing |
| **Analytics** | Segment, Mixpanel, PostHog |
| **Search** | Algolia, Typesense |
| **Storage** | AWS S3, Cloudflare R2, Supabase Storage |
| **AI/ML** | OpenAI, Anthropic, Replicate |

## Flow

```
1. REQUIREMENTS
   └── Clarify integration needs
   └── Choose service/plan

2. SETUP
   └── Create accounts
   └── Configure environments

3. IMPLEMENT
   └── Install SDKs
   └── Create wrappers/services

4. SECURE
   └── Environment variables
   └── API key rotation
   └── Rate limiting

5. TEST
   └── Unit tests with mocks
   └── Integration tests
   └── Sandbox/test mode

6. DOCUMENT
   └── Setup instructions
   └── API reference
```

## Protocol

### Phase 1: Requirements Gathering

Questions to ask:
- What functionality do you need?
- What's your expected volume?
- Do you need webhooks?
- What environments (dev/staging/prod)?
- Any compliance requirements (PCI, HIPAA)?

### Phase 2: Setup

Environment variables structure:
```env
# .env.local (development)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# .env.production
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Phase 3: Implementation

Create service wrapper:
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

Create API routes:
```typescript
// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // Handle event...
}
```

### Phase 4: Security

Checklist:
- [ ] API keys in environment variables
- [ ] Different keys per environment
- [ ] Webhook signature verification
- [ ] Rate limiting implemented
- [ ] Error handling (no key leakage)
- [ ] Audit logging

### Phase 5: Testing

```typescript
// __tests__/stripe.test.ts
import { stripe } from '@/lib/stripe';

// Mock for unit tests
jest.mock('stripe');

describe('Stripe Integration', () => {
  it('creates payment intent', async () => {
    // Test implementation
  });
});
```

Test with sandbox:
```bash
# Stripe CLI for webhook testing
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Output Format

```markdown
## Integration Report: [Service Name]

### Configuration

| Setting | Value |
|---------|-------|
| SDK Version | X.X.X |
| API Version | YYYY-MM-DD |
| Environment | Development |

### Files Created/Modified

| File | Purpose |
|------|---------|
| lib/stripe.ts | Stripe client |
| app/api/stripe/webhook/route.ts | Webhook handler |
| components/PaymentForm.tsx | UI component |

### Environment Variables Required

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Endpoints Created

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/stripe/checkout | POST | Create checkout session |
| /api/stripe/webhook | POST | Handle webhooks |

### Testing

- [ ] Sandbox credentials configured
- [ ] Webhook testing setup
- [ ] Unit tests written
- [ ] Integration tests written

### Documentation

- [Link to service docs]
- [Link to SDK docs]

### Next Steps

1. Configure production credentials
2. Set up monitoring/alerts
3. Implement error handling edge cases
```

## Integration Templates

### Stripe Payment
```
/integrate stripe payments
```

### Firebase Auth
```
/integrate firebase auth
```

### Supabase Database
```
/integrate supabase database
```

### Twilio SMS
```
/integrate twilio sms
```

## Related Workflows

- `/secure` - Security review after integration
- `/test` - Generate integration tests
- `/deploy` - Deploy with new integrations

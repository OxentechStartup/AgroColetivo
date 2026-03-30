# AgroColetivo Production Readiness Audit Report
**Date:** March 27, 2026  
**Audit Level:** Comprehensive  
**Status:** CRITICAL ISSUES FOUND - NOT PRODUCTION READY

---

## Executive Summary

The AgroColetivo application has a solid authentication architecture using Supabase Auth with JWT tokens and bcrypt, but **has several CRITICAL security and design issues** that must be resolved before production deployment:

1. **Exposed Supabase credentials in .env file** (CRITICAL)
2. **RLS disabled on all tables** (CRITICAL)
3. **Hardcoded Supabase URL in source code** (HIGH)
4. **Missing input validation on many API endpoints** (HIGH)
5. **Plaintext storage of credentials in environment** (HIGH)
6. **No authentication checks on API endpoints** (HIGH)

---

## CRITICAL FINDINGS

### 1. EXPOSED CREDENTIALS IN .ENV FILE
**Severity: CRITICAL**  
**Files:** `.env`

The `.env` file contains exposed Supabase credentials:
```
VITE_SUPABASE_URL=https://iepgeibcwthilohdlfse.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcGdlaWJjd3RoaWxvaGRsZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTUyOTYsImV4cCI6MjA4ODM5MTI5Nn0.Vvie7aAlKRS9O-Gbf2gCfMTMuBgwJcBi0XMdPFIKGzQ
```

**Risks:**
- These are production credentials for the database
- Anyone with this key can access the entire database
- The JWT token is valid until 2088
- Database URL leaks infrastructure details

**Recommended Fixes:**
1. **Immediately revoke** the exposed ANON_KEY in Supabase dashboard
2. Generate new ANON_KEY
3. Add `.env` to `.gitignore` and remove from git history:
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   git commit -m "Remove .env from version control"
   git push --force-with-lease
   ```
4. Scan commit history for any other exposed keys:
   ```bash
   git log -p -- .env | head -100
   ```
5. Use different keys for dev/staging/production
6. Implement secret management (GitHub Secrets, Render environment variables, etc.)

---

### 2. ROW LEVEL SECURITY (RLS) DISABLED
**Severity: CRITICAL**  
**File:** `schema.sql` lines 356-370

All 12 tables have RLS disabled:
```sql
alter table public.users               disable row level security;
alter table public.vendors             disable row level security;
alter table public.campaigns           disable row level security;
-- ... (9 more tables)
```

**Risks:**
- Any authenticated user can read/write/delete ANY data
- No database-level access control
- Relies entirely on frontend authorization (can be bypassed)
- Bypassing authorization code gives access to entire database

**Recommended Fixes:**
1. **Enable RLS on all tables** immediately
2. Create specific policies for each table:

**Example policies to implement:**

```sql
-- Users: Only can read/update their own record
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Campaigns: Only creator (pivo) and admins can read/modify
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors see own campaigns"
  ON public.campaigns FOR SELECT
  USING (
    pivo_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Vendors: Only vendor users and gestors can read
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can read all vendors"
  ON public.vendors FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('gestor', 'admin'))
  );

-- Products: Vendors read all, create/update own
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Vendors create products"
  ON public.products FOR INSERT
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()
    )
  );

-- Orders: Gestors see own, anonymous buyers don't
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestors see campaign orders"
  ON public.orders FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE pivo_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: Only recipient can read
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (pivo_id = auth.uid());
```

3. Review and test all policies thoroughly
4. Add comprehensive RLS tests to CI/CD

---

### 3. NO AUTHENTICATION ON API ENDPOINTS
**Severity: CRITICAL**  
**Files:** 
- `server.mjs` lines 32-44
- `api/send-verification-email.js` line 148
- `api/send-notification-emails.js` lines 18-56

All API endpoints are **unprotected**:

```javascript
// server.mjs - NO AUTH CHECK
app.post("/api/send-verification-email", sendVerificationEmailHandler);
app.post("/api/send-order-email", handleSendOrderEmail);
app.post("/api/send-proposal-email", handleSendProposalEmail);

// api/send-notification-emails.js - NO VALIDATION
if (!managerEmail || !managerName || !orderData) {
  return res.status(400).json({ error: "Missing fields" });
}
// No auth token check!
```

**Risks:**
- Anyone can trigger emails
- Spamming attack vector
- Email enumeration (discovering user emails)
- Notification spoofing

**Recommended Fixes:**

```javascript
// Middleware to verify Supabase JWT
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Auth failed" });
  }
}

// Apply to all endpoints
app.post("/api/send-verification-email", verifyAuth, sendVerificationEmailHandler);
app.post("/api/send-order-email", verifyAuth, handleSendOrderEmail);
```

---

## HIGH SEVERITY ISSUES

### 4. HARDCODED SUPABASE URL IN SOURCE CODE
**Severity: HIGH**  
**Files:** 
- `vite.config.js` line 23
- `src/lib/supabase.js` lines 4-12

Supabase URL is hardcoded in production bundle:
```javascript
const SUPABASE_URL = "https://iepgeibcwthilohdlfse.supabase.co";
```

**Issue:** This leaks infrastructure details. While the ANON_KEY is what matters, the URL shouldn't be visible.

**Fix:** Already using environment variables correctly, but ensure build process doesn't expose URLs.

---

### 5. MISSING INPUT VALIDATION ON BUSINESS OPERATIONS
**Severity: HIGH**  
**Files:**
- `src/lib/campaigns.js` lines 75-127 (createCampaign)
- `src/lib/vendors.js` lines 31-66 (createVendor)
- `src/lib/offers.js` lines 38-76 (createOffer)
- `src/lib/buyers.js` lines 26-64 (findOrCreateBuyer)

**Issues:**
- No validation of numeric ranges (goal_qty, min_qty can be negative)
- No maximum length checks on text fields
- No sanitization of product names, notes, etc.
- No duplicate campaign slug prevention

**Examples:**

```javascript
// VULNERABLE - campaigns.js lines 104-105
const payload = {
  goal_qty: Number(c.goalQty),  // No validation: could be negative
  min_qty: Number(c.minQty),    // No validation: could be NaN
};

// VULNERABLE - offers.js lines 38-44
export async function createOffer(campaignId, vendorId, offer) {
  // No validation that vendorId belongs to authenticated user
  // No validation of price or qty ranges
  await supabase
    .from("vendor_campaign_offers")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("vendor_id", vendorId);  // Could delete another vendor's offers!
}
```


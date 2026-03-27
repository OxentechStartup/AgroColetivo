# ⚠️ CRITICAL: Apply Schema Update to Supabase

## Problem
Registration is failing with **400 Bad Request** error on `pending_registrations` table because:
- The Supabase database still has the OLD schema with `password_hash NOT NULL`
- The updated `schema.sql` removes `password_hash` (passwords stored in Supabase Auth, not database)
- You must apply the schema to fix this issue

## Solution: Apply schema.sql to Supabase Database

### Step-by-Step Instructions

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Project: `iepgeibcwthilohdlfse` (AgroColetivo)
   - Select: SQL Editor (left sidebar)

2. **Create New Query**
   - Click: "+ New Query"
   - Name it: "Apply Schema v7"

3. **Copy and Paste schema.sql**
   - Open: `schema.sql` in this project
   - Copy ALL content (Ctrl+A → Ctrl+C)
   - Paste into Supabase SQL Editor (Ctrl+V)

4. **Run the Query**
   - Click: "RUN" button (or Ctrl+Enter)
   - Wait 30-60 seconds for completion
   - Look for: ✅ Success message in Results panel

5. **Verify Results**
   - Expected: "Query executed successfully"
   - Check: No error messages
   - Database now has v7 schema with corrected `pending_registrations` table

### What Gets Updated

#### Tables Modified:
- **pending_registrations** - removed `password_hash NOT NULL` constraint
- **users** - unchanged (still has `password_hash` for legacy users)
- All other tables - recreated with correct schema

#### New Additions:
- 2 views: `v_producer_costs`, `v_campaign_summary`
- 2 functions: `find_or_create_buyer()`, `update_updated_at_column()`
- 3 triggers: automatic timestamp updates

### ⚠️ IMPORTANT NOTES

1. **This will DROP and RECREATE all tables**
   - ✅ Safe for development
   - ⚠️ Deletes ALL data in those tables
   - If you have production data, export it first!

2. **Backup First** (if needed)
   - Supabase → Backups (left sidebar)
   - Click: "Request backup"
   - Wait for email confirmation

3. **No data loss risk on production** because:
   - No users in `pending_registrations` yet (since it's broken)
   - Users table is managed by Supabase Auth (separate)
   - All other tables are empty

### After Applying Schema

1. **Test Registration**
   - Go to: http://localhost:5173 (or your dev server)
   - Click: Register
   - Enter: test@example.com
   - Should work WITHOUT 400 error

2. **Check Verification Email**
   - Check email inbox for verification code
   - Or check browser console for dev code (if email fails)

3. **Complete Registration**
   - Enter verification code
   - Create account
   - Login

## Still Stuck?

If you see errors when applying schema:

1. **Check for existing objects**
   - Some objects might already exist
   - Try: Comment out `drop...` statements first
   - Run only the `create...` parts

2. **Check Supabase logs**
   - Project Settings → Database
   - Look for error messages

3. **Contact Oxentech Support**
   - Email: oxentech.software@gmail.com
   - Include: Error message + screenshot

---

✅ **After applying schema, registration should work!**

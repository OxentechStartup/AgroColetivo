# AgroColetivo Authentication System - Complete Overview

## 📊 Project Structure Summary

```
C:\dev\oxentech\AgroColetivo/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx                 ← Login form (email/password)
│   │   ├── ConfirmEmailPage.jsx          ← Email verification (6-digit code)
│   │   ├── ForgotPasswordPage.jsx        ← Password recovery (email/phone)
│   │   ├── ResetPasswordPage.jsx         ← Password reset (after email link)
│   │   ├── VendorProfilePage.jsx         ← Vendor profile edit
│   │   ├── PivoProfilePage.jsx           ← Gestor (pivô) profile edit
│   │   └── [Other Pages...]              ← All require auth
│   │
│   ├── hooks/
│   │   ├── useAuth.js                    ← Main auth hook (state management)
│   │   ├── useCampaigns.js               ← Campaign data + vendor sync
│   │   ├── useAppData.js                 ← General app data
│   │   └── [Other Hooks...]
│   │
│   ├── context/
│   │   ├── AppProvider.jsx               ← Root context provider
│   │   ├── AppContext.jsx                ← Context definition
│   │   └── [Other Contexts...]
│   │
│   ├── lib/
│   │   ├── auth.js                       ← Core auth functions (login, register, etc)
│   │   ├── supabase.js                   ← Supabase client config
│   │   ├── authorization.js              ← Role-based access control
│   │   ├── email-client.js               ← Email verification service
│   │   ├── security-console.js           ← Security error handling
│   │   └── [Other Libraries...]
│   │
│   ├── utils/
│   │   ├── security.js                   ← Validation, rate limiting, XSS/SQL injection detection
│   │   └── masks.js                      ← Input masking (phone, etc)
│   │
│   ├── constants/
│   │   ├── roles.js                      ← Role definitions (admin, pivo, vendor)
│   │   └── [Other Constants...]
│   │
│   └── App.jsx                           ← Main app router & layout
│
├── api/
│   ├── send-verification-email.js        ← Serverless email function
│   ├── send-order-email.js
│   ├── send-proposal-email.js
│   └── [Other API Routes...]
│
├── supabase/
│   └── [Supabase config files]
│
├── schema.sql                            ← Database schema (complete)
├── package.json                          ← Dependencies
├── vite.config.js                        ← Vite configuration
├── .env                                  ← Environment variables
└── [Other Config Files...]
```

---

## 🔐 Authentication System Architecture

### **Overview**
AgroColetivo uses **Supabase Auth (native JWT + bcrypt)** combined with a **custom user profile system**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Authentication Flow               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REGISTER (New User)                                        │
│     └─> pending_registrations table (temp storage)             │
│     └─> Email verification (6-digit code)                      │
│     └─> supabase.auth.signUp() (creates in auth.users)         │
│     └─> Insert into users table (public.users)                 │
│     └─> Create vendors table if role=vendor                    │
│                                                                 │
│  2. LOGIN (Existing User)                                      │
│     └─> supabase.auth.signInWithPassword()                     │
│     └─> Fetch user profile from public.users table             │
│     └─> Save to localStorage & React state                     │
│     └─> Check legacy user migration if needed                  │
│                                                                 │
│  3. PASSWORD RECOVERY                                          │
│     └─> resetPasswordByEmail() or resetPassword() (phone)      │
│     └─> supabase.auth.resetPasswordForEmail()                  │
│     └─> User clicks link in email                              │
│     └─> ResetPasswordPage validates session                    │
│     └─> updatePassword() updates Supabase Auth                 │
│                                                                 │
│  4. EMAIL VERIFICATION                                         │
│     └─> verifyEmail(pendingId, code, password)                 │
│     └─> Validate code from pending_registrations               │
│     └─> Create auth.users entry via signUp()                   │
│     └─> Create public.users entry                              │
│                                                                 │
│  5. LOGOUT                                                     │
│     └─> supabase.auth.signOut()                                │
│     └─> Clear localStorage                                     │
│     └─> Clear React state                                      │
│                                                                 │
│  6. DELETE ACCOUNT                                             │
│     └─> Delete from public.users (cascades)                    │
│     └─> Delete vendors if exists                               │
│     └─> supabase.auth.signOut()                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Auth-Related Files Found

### **Core Authentication Files**

| File | Location | Purpose |
|------|----------|---------|
| **auth.js** | `src/lib/auth.js` (811 lines) | Main auth module with login, register, password reset, email verification |
| **useAuth.js** | `src/hooks/useAuth.js` (306 lines) | React hook for auth state management |
| **AppProvider.jsx** | `src/context/AppProvider.jsx` | Wraps app with centralized context |
| **AppContext.jsx** | `src/context/AppContext.jsx` | Context definition for auth + campaigns |

### **Page Components**

| File | Location | Purpose |
|------|----------|---------|
| **LoginPage.jsx** | `src/pages/LoginPage.jsx` (309 lines) | Email/password login + registration form |
| **ConfirmEmailPage.jsx** | `src/pages/ConfirmEmailPage.jsx` (230 lines) | Email verification with 6-digit code |
| **ForgotPasswordPage.jsx** | `src/pages/ForgotPasswordPage.jsx` (261 lines) | Password recovery by email or phone |
| **ResetPasswordPage.jsx** | `src/pages/ResetPasswordPage.jsx` (194 lines) | Reset password after email link |
| **VendorProfilePage.jsx** | `src/pages/VendorProfilePage.jsx` | Vendor profile management |
| **PivoProfilePage.jsx** | `src/pages/PivoProfilePage.jsx` | Gestor profile management |

### **Configuration & Support Files**

| File | Location | Purpose |
|------|----------|---------|
| **supabase.js** | `src/lib/supabase.js` (39 lines) | Supabase client initialization |
| **authorization.js** | `src/lib/authorization.js` (179 lines) | Role-based access control (RBAC) |
| **security.js** | `src/utils/security.js` (511 lines) | Validation, rate limiting, XSS/SQL injection detection |
| **roles.js** | `src/constants/roles.js` (28 lines) | Role definitions (admin, pivo, vendor, buyer) |
| **email-client.js** | `src/lib/email-client.js` | Email verification service |
| **App.jsx** | `src/App.jsx` (355 lines) | Main router and layout with auth checks |

### **API/Serverless Functions**

| File | Location | Purpose |
|------|----------|---------|
| **send-verification-email.js** | `api/send-verification-email.js` | Send email verification code |
| **send-order-email.js** | `api/send-order-email.js` | Send order notifications |
| **send-proposal-email.js** | `api/send-proposal-email.js` | Send vendor proposals |
| **send-notification-emails.js** | `api/send-notification-emails.js` | Send general notifications |

---

## 🔄 Authentication Flow - Step by Step

### **1️⃣ REGISTRATION FLOW**

```javascript
// LoginPage.jsx → handleRegister()
↓
auth.js → register(email, password, role, extra)
├─ Validate email, password, role
├─ Check security (SQL injection, XSS)
├─ Rate limiting check (registerLimiter: 3 per hour)
├─ Check if email already exists
├─ Generate 6-digi

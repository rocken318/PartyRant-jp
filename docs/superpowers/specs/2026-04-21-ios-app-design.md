# PartyRant iOS App Design Spec
**Date:** 2026-04-21

## Overview

Expo (React Native) iOS app for PartyRant hosts. Guests continue to join via browser (no app required). Monetized via Apple In-App Purchase (auto-renewable subscription) managed through RevenueCat.

---

## Scope

This spec covers:
1. The iOS host app (Expo / React Native)
2. Apple IAP subscription via RevenueCat
3. Server-side plan enforcement (Next.js API changes)
4. DB changes (new `profiles` table)

Guest experience (browser-based) is unchanged.

---

## Plan Model

| Feature | Free | Pro |
|---|---|---|
| Custom games | Up to 2 | Unlimited |
| AI generation | 3 times/month | Unlimited |
| Preset games | Unlimited | Unlimited |

**Apple IAP product:** `partyrant_pro_monthly` — monthly auto-renewable subscription  
**RevenueCat Entitlement:** `pro`

---

## Architecture

```
┌──────────────────────────┐        HTTPS         ┌──────────────────────┐
│   iOS App (Expo / RN)    │ ──────────────────► │  Next.js API Routes  │
│                          │                      │  (partyrant.jp/api)  │
│  react-native-purchases  │                      │                      │
│  @supabase/supabase-js   │                      │  Supabase DB (shared)│
└──────────────────────────┘                      └──────────────────────┘
                                                            ▲
                                                            │ Webhook
                                                   ┌────────────────┐
                                                   │  RevenueCat    │
                                                   └────────────────┘
```

- Expo app calls existing Next.js API routes over HTTPS — same backend as the web app
- Auth: Supabase Auth (email/password) via `@supabase/supabase-js`; JWT passed in `Authorization` header on every API request
- Subscription state managed by RevenueCat → webhook → Supabase `profiles` table
- Real-time game updates use existing SSE endpoint `/api/stream/[gameId]` via `EventSource` (expo-modules or polyfill)
- Types can be shared with the Next.js codebase (same TypeScript)
- Built and submitted to App Store via **Expo EAS Build** — no Mac required

---

## Database Changes

New table added to Supabase:

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  plan text not null default 'free',       -- 'free' | 'pro'
  ai_gen_count int not null default 0,     -- usage count for current month
  ai_gen_reset_at timestamptz not null     -- when the count next resets (start of next month)
);
```

A `profiles` row is created automatically when a user signs up (Supabase trigger or on first API call).

---

## Server-Side Changes (Next.js)

### Modified routes

**`POST /api/games`**
- Count the user's non-preset games (`is_preset = false, host_id = user.id`)
- If `plan = 'free'` and count ≥ 2, return:
  ```json
  { "error": "game_limit_reached", "message": "無料プランはゲームを2本まで作成できます。Proにアップグレードしてください。" }
  ```
  with HTTP 403

**`POST /api/ai/generate`**
- Require auth (currently unauthenticated — add auth check)
- If `plan = 'free'`, check `ai_gen_count`:
  - If `now() > ai_gen_reset_at`: reset `ai_gen_count = 0`, set `ai_gen_reset_at = start of next month`
  - If `ai_gen_count ≥ 3`, return:
    ```json
    { "error": "ai_limit_reached", "message": "無料プランのAI生成は月3回までです。Proにアップグレードしてください。" }
    ```
    with HTTP 403
  - On success: increment `ai_gen_count`

### New route

**`POST /api/webhook/revenuecat`**
- Verify request using RevenueCat webhook secret (header `X-RevenueCat-Signature`)
- On `INITIAL_PURCHASE` or `RENEWAL`: set `profiles.plan = 'pro'` for the app_user_id
- On `CANCELLATION` or `EXPIRATION`: set `profiles.plan = 'free'`

---

## App — Screen Structure

```
Launch
  └─ Auth (not logged in)
       ├─ Login
       └─ Sign Up

TabBar (logged in)
  ├─ Home (event list)
  │    └─ Event Detail (game list)
  │         ├─ Create Game
  │         │    ├─ Manual input (Free: up to 2 games)
  │         │    └─ AI generation (Free: 3/month)
  │         └─ Host Game
  │              ├─ Lobby (QR code display)
  │              ├─ Question flow
  │              └─ Results screen
  └─ Settings
       ├─ Plan status (Free / Pro)
       ├─ Upgrade to Pro (Free only)
       └─ Manage subscription (Pro only → Apple subscription management)
```

---

## Limit UX

When a user hits a limit:
- The API returns HTTP 403 with `error: "game_limit_reached"` or `error: "ai_limit_reached"`
- App shows a modal with a clear explanation and an "Upgrade to Pro" button
- Tapping upgrade opens the RevenueCat paywall sheet (StoreKit 2 purchase flow)

---

## RevenueCat Integration Flow

**Purchase:**
```
User taps "Upgrade to Pro"
  → react-native-purchases shows paywall (StoreKit 2)
  → User confirms purchase
  → RevenueCat validates with Apple servers
  → RevenueCat sends webhook to /api/webhook/revenuecat
  → Server sets profiles.plan = 'pro'
  → App refreshes customerInfo → UI updates
```

**App launch:**
- Fetch `Purchases.getCustomerInfo()` to check `pro` entitlement
- If either RevenueCat or `profiles.plan` shows `pro`, user is Pro (belt-and-suspenders)

**Cancellation / expiry:**
- Apple notifies RevenueCat → webhook fires → `profiles.plan = 'free'`
- Next API call enforces limits automatically

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `expo` | App framework, EAS Build |
| `expo-router` | File-based navigation |
| `@supabase/supabase-js` | Auth + shared DB types |
| `react-native-purchases` | RevenueCat SDK (StoreKit 2) |
| `react-native-qrcode-svg` | QR code display in lobby |
| `nativewind` | Tailwind-style styling |

---

## Out of Scope

- Android app
- Web-based payment (Stripe, etc.) — web users remain on free tier for now
- Guest-side app
- Family Sharing / group plans

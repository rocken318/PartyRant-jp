# Expo App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a production-ready Expo (React Native) iOS app for PartyRant hosts with auth, navigation, API client, RevenueCat, and the core host game flow.

**Architecture:** Expo SDK 52 with expo-router (file-based navigation). Auth via `@supabase/supabase-js` storing JWT in `expo-secure-store`. All API calls go to `partyrant.jp/api/*` with Bearer JWT header. RevenueCat (`react-native-purchases`) handles IAP. NativeWind v4 for Tailwind-style styling. Built and submitted via Expo EAS Build.

**Tech Stack:** Expo SDK 52, expo-router v4, TypeScript, NativeWind v4, @supabase/supabase-js, react-native-purchases (RevenueCat), expo-secure-store, react-native-qrcode-svg, EAS Build

---

## Project Location

Create the Expo project at the same level as `PartyRant-jp`:

```
Y:\webwork\
  PartyRant-jp\       ← existing Next.js
  PartyRant-fam\      ← existing Next.js
  PartyRant-app\      ← NEW Expo project (this plan)
```

---

## File Map

```
PartyRant-app/
  app/
    _layout.tsx              # Root layout — auth guard, Purchases.configure
    (auth)/
      _layout.tsx            # Stack navigator for auth screens
      login.tsx              # Login screen
      signup.tsx             # Sign up screen
    (tabs)/
      _layout.tsx            # Bottom tab bar (Home, Settings)
      index.tsx              # Home — events list
      settings.tsx           # Plan status + upgrade / manage subscription
    events/
      [id].tsx               # Event detail — games list
    games/
      [gameId]/
        new.tsx              # Create game (manual + AI)
        host.tsx             # Host game — lobby → questions → results
  lib/
    supabase.ts              # Supabase client (anon key only)
    auth.tsx                 # AuthContext: session, user, signIn, signOut, signUp
    api.ts                   # Typed fetch wrapper — adds Bearer JWT, throws on error
  components/
    UpgradeModal.tsx         # Modal shown when API returns 403 game_limit_reached / ai_limit_reached
  constants/
    config.ts                # BASE_URL, REVENUECAT_API_KEY
```

---

## Task 1: Initialize Expo project

- [ ] **Run in `Y:\webwork\`:**

```bash
npx create-expo-app@latest PartyRant-app --template blank-typescript
cd PartyRant-app
```

- [ ] **Install core dependencies:**

```bash
npx expo install expo-router expo-secure-store expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens
```

- [ ] **Install app dependencies:**

```bash
npm install @supabase/supabase-js nativewind tailwindcss react-native-purchases react-native-qrcode-svg
npm install --save-dev @types/react-native-qrcode-svg
```

- [ ] **Set `main` entry in `package.json` to use expo-router:**

```json
{
  "main": "expo-router/entry"
}
```

- [ ] **Create `app.json`:**

```json
{
  "expo": {
    "name": "PartyRant",
    "slug": "partyrant-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "partyrant",
    "ios": {
      "bundleIdentifier": "jp.partyrant.app",
      "supportsTablet": false
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

- [ ] **Create `tailwind.config.js`:**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'pr-pink': '#FF0080',
        'pr-dark': '#111111',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Create `global.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Create `babel.config.js`:**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

- [ ] **Create `metro.config.js`:**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Create `nativewind-env.d.ts`:**

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Commit:**

```bash
git init && git add . && git commit -m "chore: initialize Expo project with expo-router and NativeWind"
```

---

## Task 2: Constants and API client

**Files:**
- Create: `constants/config.ts`
- Create: `lib/supabase.ts`
- Create: `lib/api.ts`

- [ ] **Create `constants/config.ts`:**

```typescript
export const BASE_URL = 'https://partyrant.jp';
export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
```

- [ ] **Create `.env.local`:**

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_apple_key_here
```

- [ ] **Create `lib/supabase.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Create `lib/api.ts`:**

```typescript
import { BASE_URL } from '@/constants/config';
import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error ?? 'unknown_error',
      json.message ?? json.error ?? 'Request failed'
    );
  }
  return json as T;
}
```

- [ ] **Commit:**

```bash
git add constants/ lib/supabase.ts lib/api.ts .env.local
git commit -m "feat: add Supabase client, API fetch helper, and config"
```

---

## Task 3: Auth context and screens

**Files:**
- Create: `lib/auth.tsx`
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/signup.tsx`

- [ ] **Create `lib/auth.tsx`:**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Create `app/_layout.tsx`:**

```typescript
import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/lib/auth';
import Purchases from 'react-native-purchases';
import { REVENUECAT_API_KEY } from '@/constants/config';

function RootGuard() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    if (REVENUECAT_API_KEY) {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    }
  }, []);

  return (
    <AuthProvider>
      <RootGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
```

- [ ] **Create `app/(auth)/_layout.tsx`:**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Create `app/(auth)/login.tsx`:**

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      Alert.alert('ログイン失敗', e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 px-6 justify-center gap-4">
        <Text className="text-4xl font-bold text-pr-dark" style={{ fontFamily: 'System' }}>
          PartyRant
        </Text>
        <Text className="text-base text-gray-500">ホストログイン</Text>

        <TextInput
          className="border-2 border-pr-dark rounded-lg px-4 py-3 text-base text-pr-dark"
          placeholder="メールアドレス"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="border-2 border-pr-dark rounded-lg px-4 py-3 text-base text-pr-dark"
          placeholder="パスワード"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          className="bg-pr-pink rounded-lg py-4 items-center border-2 border-pr-dark"
          style={{ shadowColor: '#111', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? 'ログイン中...' : 'ログイン →'}
          </Text>
        </TouchableOpacity>

        <Link href="/(auth)/signup" className="text-center text-pr-pink font-bold text-sm">
          アカウントをお持ちでない方は 新規登録
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Create `app/(auth)/signup.tsx`** (same structure as login but calls `signUp`):

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signUp(email, password);
    } catch (e) {
      Alert.alert('登録失敗', e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 px-6 justify-center gap-4">
        <Text className="text-4xl font-bold text-pr-dark">PartyRant</Text>
        <Text className="text-base text-gray-500">新規登録</Text>

        <TextInput
          className="border-2 border-pr-dark rounded-lg px-4 py-3 text-base text-pr-dark"
          placeholder="メールアドレス"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="border-2 border-pr-dark rounded-lg px-4 py-3 text-base text-pr-dark"
          placeholder="パスワード（6文字以上）"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          className="bg-pr-pink rounded-lg py-4 items-center border-2 border-pr-dark"
          style={{ shadowColor: '#111', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? '登録中...' : '登録する →'}
          </Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" className="text-center text-pr-pink font-bold text-sm">
          すでにアカウントをお持ちの方は ログイン
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Commit:**

```bash
git add app/ lib/auth.tsx
git commit -m "feat: add auth context, root layout with guard, login and signup screens"
```

---

## Task 4: Tab bar and Home screen (events list)

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/settings.tsx`

- [ ] **Create `app/(tabs)/_layout.tsx`:**

```typescript
import { Tabs } from 'expo-router';
import { Home, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF0080',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 2,
          borderTopColor: '#111',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

Note: install lucide-react-native: `npm install lucide-react-native react-native-svg`

- [ ] **Create `app/(tabs)/index.tsx`** — events list:

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Event {
  id: string;
  name: string;
  createdAt: number;
}

export default function HomeScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await apiFetch<Event[]>('/api/events');
      setEvents(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const event = await apiFetch<Event>('/api/events', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      });
      setEvents(prev => [event, ...prev]);
      setNewName('');
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : 'イベントの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">読み込み中...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-14 pb-4 bg-pr-dark flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">マイイベント</Text>
        <TouchableOpacity onPress={signOut}>
          <Text className="text-gray-400 text-sm">ログアウト</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 py-3 flex-row gap-2 border-b-2 border-pr-dark">
        <TextInput
          className="flex-1 border-2 border-pr-dark rounded-lg px-3 py-2 text-base"
          placeholder="イベント名..."
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity
          className="bg-pr-pink rounded-lg px-4 py-2 border-2 border-pr-dark items-center justify-center"
          onPress={handleCreate}
          disabled={creating}
        >
          <Text className="text-white font-bold">{creating ? '...' : '作成'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={e => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 mt-8">イベントがありません</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white border-2 border-pr-dark rounded-xl px-4 py-4"
            style={{ shadowColor: '#111', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}
            onPress={() => router.push(`/events/${item.id}`)}
          >
            <Text className="font-bold text-pr-dark text-base">{item.name}</Text>
            <Text className="text-gray-400 text-xs mt-1">開く →</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

- [ ] **Create `app/(tabs)/settings.tsx`** — plan status and upgrade:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Profile {
  plan: 'free' | 'pro';
  aiGenCount: number;
  aiGenResetAt: string;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    apiFetch<Profile>('/api/profile').then(setProfile).catch(() => {});
  }, []);

  async function handleUpgrade() {
    setPurchasing(true);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) { Alert.alert('エラー', '購入オプションが見つかりません'); return; }
      await Purchases.purchasePackage(pkg);
      setProfile(prev => prev ? { ...prev, plan: 'pro' } : prev);
      Alert.alert('完了', 'Proプランへのアップグレードが完了しました！');
    } catch {
      // User cancelled or error — do nothing
    } finally {
      setPurchasing(false);
    }
  }

  async function handleManageSubscription() {
    await Linking.openURL('https://apps.apple.com/account/subscriptions');
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-14 pb-4 bg-pr-dark">
        <Text className="text-white text-2xl font-bold">設定</Text>
      </View>

      <View className="px-4 py-6 gap-4">
        <Text className="text-gray-500 text-sm">{user?.email}</Text>

        <View className="border-2 border-pr-dark rounded-xl p-4 gap-2"
          style={{ shadowColor: '#111', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Text className="font-bold text-pr-dark text-base">現在のプラン</Text>
          <Text className="text-2xl font-bold text-pr-pink">
            {profile ? (profile.plan === 'pro' ? '✨ Pro' : '🆓 Free') : '読み込み中...'}
          </Text>
          {profile?.plan === 'free' && (
            <Text className="text-gray-500 text-sm">
              ゲーム: 2本まで　AI生成: 月3回まで
            </Text>
          )}
        </View>

        {profile?.plan === 'free' ? (
          <TouchableOpacity
            className="bg-pr-pink rounded-xl py-4 items-center border-2 border-pr-dark"
            style={{ shadowColor: '#111', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}
            onPress={handleUpgrade}
            disabled={purchasing}
          >
            <Text className="text-white font-bold text-lg">
              {purchasing ? '処理中...' : '✨ Proにアップグレード'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="border-2 border-pr-dark rounded-xl py-4 items-center"
            onPress={handleManageSubscription}
          >
            <Text className="text-pr-dark font-bold">サブスクリプションを管理</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
```

Note: This requires `GET /api/profile` route on the Next.js backend. Add to `src/app/api/profile/route.ts` in PartyRant-jp/-fam:

```typescript
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase/auth-server';
import { getOrCreateProfile } from '@/lib/supabase/profiles';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await getOrCreateProfile(user.id);
  return NextResponse.json({
    plan: profile.plan,
    aiGenCount: profile.aiGenCount,
    aiGenResetAt: profile.aiGenResetAt.toISOString(),
  });
}
```

- [ ] **Commit:**

```bash
git add app/(tabs)/
git commit -m "feat: add tab navigation, events list, and settings/plan screen"
```

---

## Task 5: UpgradeModal component

**Files:**
- Create: `components/UpgradeModal.tsx`

This modal is shown when an API call returns `403` with `error: "game_limit_reached"` or `error: "ai_limit_reached"`.

- [ ] **Create `components/UpgradeModal.tsx`:**

```typescript
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import Purchases from 'react-native-purchases';

interface Props {
  visible: boolean;
  reason: 'game_limit_reached' | 'ai_limit_reached' | null;
  onClose: () => void;
}

const MESSAGES = {
  game_limit_reached: {
    title: 'ゲームの上限に達しました',
    body: '無料プランはゲームを2本まで作成できます。Proにアップグレードすると無制限に作成できます。',
  },
  ai_limit_reached: {
    title: 'AI生成の上限に達しました',
    body: '無料プランはAI生成を月3回まで利用できます。Proにアップグレードすると無制限に使えます。',
  },
};

export function UpgradeModal({ visible, reason, onClose }: Props) {
  const content = reason ? MESSAGES[reason] : null;

  async function handleUpgrade() {
    onClose();
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (pkg) await Purchases.purchasePackage(pkg);
    } catch {
      // cancelled
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl border-2 border-pr-dark p-6 w-full gap-4"
          style={{ shadowColor: '#111', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0 }}>
          <Text className="text-xl font-bold text-pr-dark">{content?.title}</Text>
          <Text className="text-gray-600 text-sm leading-5">{content?.body}</Text>
          <TouchableOpacity
            className="bg-pr-pink rounded-xl py-4 items-center border-2 border-pr-dark"
            style={{ shadowColor: '#111', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}
            onPress={handleUpgrade}
          >
            <Text className="text-white font-bold text-base">✨ Proにアップグレード</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center py-2" onPress={onClose}>
            <Text className="text-gray-400 text-sm">キャンセル</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Commit:**

```bash
git add components/UpgradeModal.tsx
git commit -m "feat: add UpgradeModal for plan limit errors"
```

---

## Task 6: Event detail screen

**Files:**
- Create: `app/events/[id].tsx`

- [ ] **Create `app/events/[id].tsx`:**

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';
import { UpgradeModal } from '@/components/UpgradeModal';

interface Game {
  id: string;
  title: string;
  mode: string;
  status: string;
  questions: unknown[];
}

const MODE_LABEL: Record<string, string> = {
  trivia: '🧠 クイズ',
  polling: '📊 実態調査',
  opinion: '⚔️ 多数派/少数派',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'game_limit_reached' | 'ai_limit_reached' | null>(null);

  const loadGames = useCallback(async () => {
    try {
      const data = await apiFetch<Game[]>(`/api/events/${id}/games`);
      setGames(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadGames(); }, [loadGames]);

  function handleNewGame() {
    router.push(`/games/${id}/new`);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">読み込み中...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-14 pb-4 bg-pr-dark flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">← 戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-pr-pink rounded-lg px-4 py-2 border-2 border-white"
          onPress={handleNewGame}
        >
          <Text className="text-white font-bold text-sm">+ ゲームを追加</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={games}
        keyExtractor={g => g.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGames(); }} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text className="text-center text-gray-400 mt-8">ゲームがありません</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white border-2 border-pr-dark rounded-xl px-4 py-4"
            style={{ shadowColor: '#111', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }}
            onPress={() => router.push(`/games/${item.id}/host`)}
          >
            <Text className="font-bold text-pr-dark text-base">{item.title}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-gray-500 text-xs">{MODE_LABEL[item.mode] ?? item.mode}</Text>
              <Text className="text-gray-400 text-xs">{item.questions.length}問</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <UpgradeModal
        visible={upgradeReason !== null}
        reason={upgradeReason}
        onClose={() => setUpgradeReason(null)}
      />
    </View>
  );
}
```

- [ ] **Commit:**

```bash
git add app/events/
git commit -m "feat: add event detail screen with games list"
```

---

## Task 7: EAS Build setup

**Files:**
- Create: `eas.json`

- [ ] **Install EAS CLI:**

```bash
npm install -g eas-cli
eas login
```

- [ ] **Initialize EAS:**

```bash
eas build:configure
```

This creates `eas.json`. Verify it contains a `production` profile:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Create a development build to test on device:**

```bash
eas build --platform ios --profile development
```

Expected: EAS queues the build, sends an email when done with a link to install on device via QR code.

- [ ] **Commit:**

```bash
git add eas.json
git commit -m "chore: add EAS Build configuration"
```

---

## Remaining Screens (implement after scaffold is verified working)

The following screens complete the host game flow. They are listed here for reference but are not part of the initial scaffold task:

- `app/games/[eventId]/new.tsx` — create game form (manual input + AI generation with UpgradeModal)
- `app/games/[gameId]/host.tsx` — lobby (QR code via `react-native-qrcode-svg`), question flow, results

These screens call the same `/api/games`, `/api/ai/generate`, `/api/games/[gameId]/advance`, `/api/games/[gameId]/reset`, and `/api/stream/[gameId]` endpoints already in use by the web app. The SSE stream can be consumed via `EventSource` (install `react-native-event-source` polyfill if needed).

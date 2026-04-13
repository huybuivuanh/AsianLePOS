# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Asian Le POS** — a cross-platform (iOS, Android, Web) Point-of-Sale system for a restaurant, built with Expo. It handles dine-in table orders, take-out orders, menu management, kitchen routing, and payment tracking. Backend is entirely Firebase (Firestore + Auth + Cloud Functions).

## Commands

### Expo App (root)
```bash
npx expo start          # Start dev server
npm run android         # Run on Android emulator
npm run ios             # Run on iOS simulator
npm run web             # Run web build
npm run lint            # Run ESLint
```

### Firebase Cloud Functions (`/functions`)
```bash
npm run build           # Compile TypeScript → lib/index.js
npm run serve           # Build + start Firebase emulators locally
npm run deploy          # Deploy functions to Firebase
```

### Firebase Hosting
Deploy triggers `npm --prefix functions run build` automatically before upload. The web export goes to `dist/`.

## Architecture

### Routing & Screens
Expo Router (file-based) under `/app`. Main structure:
- `(login)/` — auth entry
- `(tabs)/` — 5-tab main UI (Take Out picker, Take Out orders list, Tables, Order history, Profile)
- Dynamic routes: `dinein/table/[tableNumber]`, `dinein/take-order/[tableNumber]/[orderId]`, `item/[itemId]`, `take-out-orders/[orderId]`

Firestore listeners for all tabs are set up and torn down in `app/(tabs)/_layout.tsx`.

### State Management
7 Zustand stores in `src/stores/`:
- `useOrderStore` — active cart + order submission logic
- `useMenuStore` — menu items, categories, option groups (with AsyncStorage caching)
- `useTableStore` — table status (Open/Occupied)
- `useDineInOrdersStore` / `useActiveDineInOrdersStore` — dine-in order list + filtered view
- `useTakeOutOrdersStore` — take-out order list
- `useCustomersStore` — customer autocomplete

All stores are cleared on logout to prevent data leaks.

### Menu Caching Strategy
`useMenuStore` checks a `menuVersion` doc in Firestore on load. If the version has changed since last fetch, it pulls all menu collections and writes to AsyncStorage. Otherwise it reads from cache. This avoids unnecessary Firestore reads on each app open.

### Order Model
- **`OrderDraft`** = in-cart, not yet persisted
- **`Order`** = submitted Firestore document
- Orders have a `groupItems` boolean controlling whether items of the same type are collapsed (dine-in) or shown per-item (take-out default)
- Split billing: individual items have a `paid: boolean` field
- Discounts apply before tax (type: `Amount` or `Percent`)
- Tax rates are hardcoded: **PST 6%, GST 5%** (BC, Canada)

### Kitchen Routing
`KitchenType` enum: `DeepFry | StirFry | Other | Both | Drink`. Each menu item carries a `kitchenType`. When an order is printed, items are filtered/routed to the appropriate kitchen print queue by type.

### Firestore Collections
```
dineInOrders       takeOutOrders      categories
menuItems          optionGroups       options
menuVersion        tables             customers
```

### Cloud Functions
Single scheduled function in `functions/src/index.ts` — runs daily at 4 AM UTC, deletes `dineInOrders` and `takeOutOrders` older than 30 days in batches of 500.

### Auth
- **Web:** `getAuth()` (default session storage)
- **Native:** `initializeAuth()` with `getReactNativePersistence(ReactNativeAsyncStorage)` for persistent login

## Key Config
- **Path alias:** `@/*` maps to `./src/*` (tsconfig)
- **Styling:** NativeWind 4.1 (Tailwind for React Native) — class names in JSX, configured via `tailwind.config.js` + `babel.config.js`
- **Global types:** declared in `src/types/global.d.ts` (no explicit imports needed)
- **Firebase project:** `asianlepos`
- **Environment:** Firebase config loaded from `.env` via `EXPO_PUBLIC_*` variables, validated in `src/lib/firebaseConfig.ts`

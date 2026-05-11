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
9 Zustand stores in `src/stores/`:
- `useOrderStore` — active cart + order submission logic
- `useMenuStore` — menu items, categories, option groups (with AsyncStorage caching)
- `useTableStore` — table status (Open/Occupied)
- `useDineInOrdersStore` / `useActiveDineInOrdersStore` — dine-in order list + filtered view
- `useTakeOutOrdersStore` — take-out order list
- `useCustomersStore` — customer autocomplete
- `useCreditsStore` — customer credits (how much the restaurant owes customers)
- `useMenuChangesStore` — item change prices (cost to substitute/modify a menu item)

All stores are cleared on logout to prevent data leaks.

### Menu Caching Strategy
`useMenuStore` checks a `menuVersion` doc in Firestore on load. If the version has changed since last fetch, it pulls all menu collections and writes to AsyncStorage. Otherwise it reads from cache. `loadCachedMenu()` is called from the root layout (`app/_layout.tsx`) immediately on app open — parallel to Firebase auth — so menu data is ready before auth resolves. This avoids blocking the UI on menu loading after login.

### Cache-First Pattern (customers, credits, menuChanges)
`useCustomersStore`, `useCreditsStore`, and `useMenuChangesStore` all follow the same cache-first pattern:
1. On subscribe/fetch: serve AsyncStorage cache immediately so UI is not blank
2. Fetch from Firestore in the background, update state + re-save cache on success
3. On writes: write-through to Firestore then update state + cache
4. `clearData()` wipes both in-memory state and AsyncStorage cache

### Menu Picker UX
When taking an order (all 3 flows: dine-in, take-out, add-item to existing order), the item picker screen:
- **Default view**: shows items from the first category only (sorted by category `order` field) — keeps the list short since staff use search
- **Search**: switches to all items across all categories, filtered by name (300ms debounce)
- **Keyboard**: auto-opens on every screen focus via `useFocusEffect` + a 100ms delay (lets the navigation transition settle)
- No category navigation level — items are shown directly

Key components in `src/features/takeout/components/`:
- `MenuPickerBody` — search bar + item list; `browseItems` prop for default view, `items` prop for search
- `SearchResults` — filtered `FlashList` of items

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
credits            menuChanges
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

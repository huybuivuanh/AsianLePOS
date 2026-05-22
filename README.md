# Asian Le POS

A cross-platform (iOS, Android, Web) Point-of-Sale system for a restaurant. Handles dine-in table orders, take-out orders, menu management, kitchen routing, and payment tracking.

Built with **Expo** (React Native) and **Firebase** (Firestore + Auth + Cloud Functions).

---

## Tech Stack

- **Frontend:** Expo 54, React 19, React Native 0.81.5, Expo Router 6 (file-based routing)
- **Styling:** NativeWind 4.x (Tailwind for React Native)
- **State:** Zustand 5
- **Backend:** Firebase 12 — Firestore, Auth, Cloud Functions
- **Language:** TypeScript

---

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Firebase CLI (`npm install -g firebase-tools`)
- Android Studio or Xcode for native simulators

---

## Setup

1. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. **Configure environment**

   Create a `.env` file in the project root with your Firebase config:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   EXPO_PUBLIC_FIREBASE_APP_ID=
   ```

3. **Start the dev server**
   ```bash
   npx expo start
   ```

---

## Commands

### Expo App

| Command | Description |
|---|---|
| `npx expo start` | Start dev server |
| `npm run android` | Run on Android emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run web build |
| `npm run lint` | Run ESLint |

### Firebase Cloud Functions (`/functions`)

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript → `lib/index.js` |
| `npm run serve` | Build + start Firebase emulators locally |
| `npm run deploy` | Deploy functions to Firebase |

---

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/               # Main 5-tab UI
  dinein/               # Dine-in flows (table, take-order, edit, review)
  takeout/              # Take-out flows (review-order)
  take-out-orders/      # Take-out order management screens
  item/                 # Menu item detail + customization
src/
  features/             # UI features grouped by domain
    dinein/             # Dine-in components and hooks
    takeout/            # Take-out components and hooks
    order/              # Shared order editing UI
  stores/               # Zustand stores (menu, orders, tables, cart, etc.)
  services/             # Firestore write operations (order, print, table, conversion)
  domain/               # Pure business logic (tax calc, item grouping, sorting)
  hooks/                # Shared hooks (useAsyncAction, useDisclosure, etc.)
  ui/                   # Shared UI components (Header, overlays, banners)
  providers/            # AuthProvider
  utils/                # Helpers, formatters, cache utilities
functions/
  src/index.ts          # Cloud Functions (scheduled purge jobs)
```

---

## Key Concepts

### Order Types
- **Dine-In** — tied to a table, grouped item display, split billing per line item
- **Take-Out** — customer name/phone, immediate or scheduled fulfillment

### Tax (BC, Canada)
- PST 6% + GST 5%, applied after discounts

### Navigation (Dine-In)
Use `router.dismiss(n)` or `router.back()` to return to the table page — never `router.replace()` into the table screen, as it causes slowness. The table page stays mounted and updates via its live Firestore listener.

### Menu Cache
Menu data is cached in AsyncStorage with version-based invalidation. The cache loads in parallel with Firebase Auth on app start so there's no menu flash on login.

### Background Reset
After 5 minutes in the background (lock screen or switched apps), the navigation resets to the home screen and Firestore network is re-enabled.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `dineInOrders` | Active and historical dine-in orders |
| `takeOutOrders` | Active and historical take-out orders |
| `tables` | Table status (Open/Occupied) and current order ID |
| `menuItems` | Menu items with pricing and kitchen routing |
| `categories` | Menu categories with sort order |
| `optionGroups` / `options` | Item option groups and their options |
| `menuVersion` | Version doc for cache invalidation |
| `customers` | Customer name/phone records |
| `printQueue` | Orders queued for kitchen printing |
| `credits` | Store credit records |
| `menuChanges` | Item name substitution reference |

---

## Cloud Functions

Two scheduled functions in `functions/src/index.ts`:

- **`purgeStaleOrders`** — Daily at 4 AM UTC: deletes orders older than ~30 days
- **`purgeStalePrintQueue`** — Daily at midnight (America/Regina): clears the print queue

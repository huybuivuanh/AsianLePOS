# Asian Le Rewards — Plan

Loyalty program for Asian Le. A separate customer app (this repo) with its own Firebase
project. Customers see their points and a personal QR code. The POS (`D:\Projects\AsianLePOS`)
scans the QR to collect and redeem points.

## Status (2026-10-28)

- [x] Repo renamed `asian-le-customers` → `asian-le-rewards` on GitHub; local `origin` updated
- [ ] Rename local folder `D:\Projects\asian-le-customers` → `D:\Projects\asian-le-rewards`
      (was locked by VS Code / expo — close both, then rename)
- [x] App renamed in `app.json` (name "Asian Le Rewards", slug `asian-le-rewards`, scheme `asianlerewards`)
- [x] NativeWind 4.2.7 + Tailwind 3 (same as POS)
- [x] Web "Metro error: This operation was aborted" — came from `web.output: "server"`; switched to `"single"` (plain single-page app, no API routes needed)
- [x] Light theme only
- [x] Firebase email + password auth (sign in, create account, forgot password) — JS SDK, same as POS
- [ ] Create the loyalty Firebase project, enable Email/Password + Google sign-in, fill `.env`
- [x] "Continue with Google" on sign-in and sign-up — code done (`src/services/googleSignIn.ts`
      native, `googleSignIn.web.ts` web, `src/ui/GoogleButton.tsx`, `app.config.ts` adds the iOS URL scheme)
- [ ] Google one-time setup (below), fill the `EXPO_PUBLIC_GOOGLE_*` values in `.env`, make a development build
- [x] Sign-up asks for name + phone and writes `members/{uid}` (rolled back if the save fails)
- [x] "Finish your profile" screen when signed in but the member doc is missing
- [x] `firestore.rules` written (paste into the console until the repo has `firebase.json`)
- [x] One phone number per account: `phoneNumbers/{phone}` reserved with the member (rules tested in the emulator)

## Decisions

| Topic | Decision |
|---|---|
| Projects | Separate Firebase project for loyalty (customers isolated from POS) |
| QR code | The member's uid (`members/{uid}` doc id). A uid isn't a secret (rules check the signed-in user), the QR is shown live in the app so it can change later, and staff can fall back to phone search |
| Member lookup at POS | Scan QR, or search by phone (members are separate from POS `customers`) |
| Earn rate | 1 point per $1 of pre-tax subtotal |
| Who earns | Dine-in and take-out |
| When to earn | Any time after the order, **once per order**; POS marks the order as collected |
| Redeem | Fixed steps: 100 pts = $5 off, applied as the POS's existing Amount discount |
| Cancelled order | Points automatically reversed (earned removed, redeemed refunded) |
| Customer sign-in | Google **or** email + password, same on iOS, Android and web. No Apple sign-in (it needs extra setup on web/Android); add it on iOS later only if App Store review asks |
| Member doc id | Firebase Auth uid (`members/{uid}`) — no lookup needed, simple rules |
| Creating the member | The app writes it directly; security rules check the fields. Not a function |
| Scanning | Device camera |
| Customer display | Shows "Scan your loyalty QR" and "+N points earned" |

## How POS and loyalty talk

One-way only: **POS → loyalty**. No callbacks.

```
Customer app ──reads own data──▶  Loyalty Firebase project  ◀──Cloud Functions── POS
(points, QR, history)              (members, ledger)            (lookup / earn / redeem)
```

- The POS calls loyalty Cloud Functions. The function's response **is** the confirmation
  (e.g. `{ pointsEarned: 42, newBalance: 292 }`).
- The customer app listens live to its own member doc, so points update on the phone
  the moment staff scan.

### POS connecting to two Firebase projects

The Firebase SDK can hold several connections, each with a name:

```ts
const app = initializeApp(posConfig);                       // existing
const loyaltyApp = initializeApp(loyaltyConfig, "loyalty");  // new
export const loyaltyAuth = getAuth(loyaltyApp);
export const loyaltyFunctions = getFunctions(loyaltyApp);
```

- Each connection has its own login. Staff keep using the normal POS login.
- Each POS device signs into loyalty **once** as `pos@asianle.com` from a
  **Loyalty section in the Profile tab**. The login is remembered.
- The password is **never** put in `.env` — the web POS is public and `EXPO_PUBLIC_*`
  values are visible in the bundle. The loyalty Firebase *config* is fine in `.env`.

### Security

- `pos@asianle.com` gets a custom claim `role: "pos"` via a one-time admin script.
  Only server code can set claims, so customers can't give it to themselves.
- Every POS-only function checks `request.auth.token.role === "pos"`.
- Rules are in `firestore.rules`. Anything not listed there is denied.
- Customers can **read** their own member doc and history.
- Customers can **create** their own member doc once (`id`, `name`, `email`, `phone`,
  `createdAt`, `points` only; `email` must match their login, `points` must be 0) and later change only `name`.
- **One phone per account:** the member doc and `phoneNumbers/{phone}` are written in one
  batch. Rules require both, and writing over an existing phone doc is denied, so a taken
  number fails ("This phone number is already used by another account."). Customers can't
  read `phoneNumbers`. Changing phone isn't supported yet (it would need to move the reservation).
- After sign-up, `points` and `transactions/` are written only by functions
  (the Admin SDK skips rules). Customers can't touch them.

## Google sign-in

- **Web:** Firebase JS SDK `signInWithPopup(auth, new GoogleAuthProvider())`.
- **iOS / Android:** `@react-native-google-signin/google-signin` gets a Google ID token →
  `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`. This is a native
  library, so it needs a **development build** (not Expo Go). Email sign-in still works in Expo Go.
- **First Google sign-in** creates the login but no member doc → `complete-profile` asks for
  phone, with the name filled in from the Google account.
- **Same email, one account:** Firebase keeps one login per email. Google sign-in with an
  email that already has a password account signs into that same account (same uid, same
  member doc). Email sign-up with an email already used by Google fails with
  "email already in use".

### One-time setup

- Firebase → Authentication → enable **Google**. This creates the **web OAuth client ID**
  (needed by the native library too, as `webClientId`).
- Add an **iOS app** and an **Android app** in Firebase project settings → iOS and Android
  OAuth client IDs.
- **Android SHA-1 fingerprints** (which signing key the app uses) → add to the Android app
  in Firebase: the dev build key (`eas credentials`) and the Play Store key (Play Console →
  App integrity).
- **iOS URL scheme** (lets Google hand the user back to the app): the reversed iOS client ID
  (`com.googleusercontent.apps.…`) in `app.json` via the google-signin config plugin.
- Client IDs go in `.env` as `EXPO_PUBLIC_*` (they're public, not secrets).

### App Store

Apple asks apps with Google login to offer another option; our own email + password is
usually accepted. If a reviewer asks for Sign in with Apple, add it **on iOS only**
(`expo-apple-authentication`, about an hour). Apple also requires an in-app
**Delete account** option for any app that creates accounts.

## Data model (loyalty project)

```
members/{uid}                      id (= uid), name, email, phone, createdAt,
                                   points (0 at sign-up)                       ← app (sign-up)
                                   points after that                           ← functions only
members/{uid}/transactions/{id}    type (earn | redeem | reverse), points, orderId, createdAt
phoneNumbers/{phone}               uid   (one phone per member + POS phone lookup) ← app (sign-up)
```

- Phones are stored as **10 digits, no formatting** (same digits-only style as POS);
  `src/utils/phone.ts` normalizes ("1-604-555-1234" → `6045551234`). North American numbers only.

- Transaction ids `earn_<orderId>` / `redeem_<orderId>` make every call safe to retry
  and enforce "once per order".
- Balance and transaction are written in one Firestore transaction.

## Cloud Functions (loyalty project)

| Function | Caller | Does |
|---|---|---|
| `deleteAccount()` | customer | Re-checks the caller, deletes `members/{uid}` + its `transactions`, `phoneNumbers/{phone}`, then the login. Runs on the server so it finishes even if the app closes, and the rules stay delete-free |
| `lookupMember(uid or phone)` | POS | Name, balance (QR → `members/{uid}`; phone → `phoneNumbers/{phone}` → member) |
| `earnPoints(uid, orderId, subtotal)` | POS | 1 pt/$1, once per order |
| `redeemPoints(uid, orderId, steps)` | POS | −100 pts per $5 step, returns $ amount |
| `reverseOrder(orderId)` | POS | Refund redeemed points, remove earned points |

## Phases

0. **Lock down the POS Firebase project** (do first)
   - Authentication → Settings → User actions → turn **off** "Enable create (sign-up)"
   - Review Firestore rules (no rules file in the POS repo yet) and track them in the repo
1. **Loyalty Firebase project**: create it, Blaze plan (needed for functions),
   Email/Password + Google auth (Google setup above), Firestore,
   `pos@asianle.com` + `role: pos` script, security rules
2. **Cloud Functions** (table above), tested with emulators
3. **Customer app** (this repo): email sign-in ✅ → name + phone at sign-up ✅
   (phone is for POS search, not verified) → Google sign-in (needs a development build)
   → home (points + QR) → history → Delete account.
   - The app listens live to `members/{uid}` (`AuthProvider`). Signed in with no member doc
     (first Google sign-in, or an interrupted email sign-up) → `complete-profile` screen.
4. **POS integration**
   - Second Firebase connection + Loyalty section in Profile
   - `src/services/loyaltyService.ts` wrapping the functions
   - Member panel on dine-in table page and take-out orders: scan / phone search →
     Collect points (once, saves `order.loyalty = { memberId, points, collectedAt }`)
     → Redeem $5 / $10 → Amount discount
   - Cancel → `reverseOrder`
   - Customer display prompts
5. **Test with emulators, then deploy**

## Answered questions

1. Order already has a staff discount → redemption is **blocked**.
2. Points are earned on the amount **after** redemption ($42 − $5 → 37 pts).
3. Points **never expire**.

## POS progress

- [x] "Rewards" button on take-out order cards (between Change Type and Cash payment) →
      `src/features/order/components/RewardsModal.tsx` with QR scan (device camera, `expo-camera`) or phone number entry.
      Lookup is not wired yet — the modal only shows what was scanned/entered.
- [x] Dine-in table page: Rewards button in the last row (Cancel · Paid · Rewards · Complete), opens the same modal.
- [x] Second Firebase connection (`src/lib/rewardsFirebase.ts`, app name `rewards`, config from
      `EXPO_PUBLIC_REWARDS_FIREBASE_*`; optional — POS runs without it).
      Device login in `useRewardsAuthStore` (remembered, not cleared on staff logout, checks `role: "pos"`).
      Profile tab → Rewards card to sign in/out. The Rewards modal asks to sign in first if needed.
- [ ] Rewards project: create `pos@asianle.com` + `role: pos` claim script
- [ ] Rewards functions: `lookupMember`, `earnPoints`, `redeemPoints`, `reverseOrder`
- [ ] POS `src/services/rewardsService.ts` calling them, wired into the modal

## Notes on this repo

- Expo SDK 58, routes in `src/app`, alias `@/*` → `src/*`
- Structure follows POS: `src/lib/firebaseConfig.ts`, `src/providers/AuthProvider.tsx`,
  `src/services/`, `src/ui/`, `src/utils/`.
- Auth: Firebase JS SDK email + password on all platforms (works in Expo Go), plus Google
  (popup on web, native library on iOS/Android — development build only).
  `src/lib/firebaseConfig.ts` (AsyncStorage persistence on native) →
  `src/services/authService.ts` (signIn / signUp / resetPassword / signOutUser) →
  `src/providers/AuthProvider.tsx` (user, member, loading, signUp, logout). Screens: `sign-in`, `sign-up`, `complete-profile`,
  guarded with `Stack.Protected`. Config: `EXPO_PUBLIC_FIREBASE_*` in `.env` (see `.env.example`).
- `tsconfig.json` maps `@firebase/auth` to its React Native types (same as POS) so
  `getReactNativePersistence` type-checks.
- Styling: NativeWind classes; brand color `brand` (#DA251D, logo red) in `tailwind.config.js`.
- Light theme only (`userInterfaceStyle: "light"`). Header/background colors come from the
  React Navigation theme in the root layout.
- After config changes, start with a cleared cache: `npx expo start -c`

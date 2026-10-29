# Asian Le Rewards — Plan

Loyalty program for Asian Le. A separate customer app (`D:\Projects\asian-le-rewards`) with its
own Firebase project. Customers see their points and a personal QR code. The POS
(`D:\Projects\AsianLePOS`) scans the QR to collect and redeem points.

## Status (2026-10-29)

### Rewards app + project

- [x] Repo renamed `asian-le-customers` → `asian-le-rewards` on GitHub; local `origin` updated
- [ ] Rename local folder `D:\Projects\asian-le-customers` → `D:\Projects\asian-le-rewards`
      (was locked by VS Code / expo — close both, then rename)
- [x] App renamed in `app.json` (name "Asian Le Rewards", slug `asian-le-rewards`, scheme `asianlerewards`)
- [x] NativeWind 4.2.7 + Tailwind 3 (same as POS)
- [x] Web "Metro error: This operation was aborted" — came from `web.output: "server"`; switched to `"single"` (plain single-page app, no API routes needed)
- [x] Light theme only
- [x] Firebase email + password auth (sign in, create account, forgot password) — JS SDK, same as POS
- [x] Loyalty Firebase project `asian-le-rewards` created, Email/Password sign-in, `.env` filled
- [ ] Enable Google sign-in in the project
- [x] "Continue with Google" on sign-in and sign-up — code done (`src/services/googleSignIn.ts`
      native, `googleSignIn.web.ts` web, `src/ui/GoogleButton.tsx`, `app.config.ts` adds the iOS URL scheme)
- [ ] Google one-time setup (below), fill the `EXPO_PUBLIC_GOOGLE_*` values in `.env`, make a development build
- [x] Sign-up asks for name + phone and writes `members/{uid}` (rolled back if the save fails)
- [x] "Finish your profile" screen when signed in but the member doc is missing
- [x] `firestore.rules` written (paste into the console until the repo has `firebase.json`)
- [x] One phone number per account: `phoneNumbers/{phone}` reserved with the member (rules tested in the emulator)
- [x] Tabs: Home (points + QR), Activity (points history, live), Profile (name, phone, email,
      sign out, delete account)
- [x] `functions/` + `firebase.json` + `.firebaserc` (project `asian-le-rewards`). `deleteAccount`
      written and tested in the emulators
- [x] Blaze on; `deleteAccount` deployed and working
- [x] POS functions written + tested in emulators: `lookupMember`, `earnPoints`, `redeemPoints`,
      `reverseOrder` (27 checks), plus `functions/scripts/set-pos-role.mjs`
- [x] All 5 functions deployed
- [x] POS login `pos@asianle.ca` created and given `role: pos` (2026-10-29)

### POS

- [x] Rewards button on take-out order cards (Change Type · Rewards · Cash payment) and on the
      dine-in table page (last row: Cancel · Paid · Rewards · Complete)
- [x] Rewards modal (`src/features/order/components/RewardsModal.tsx`): **QR code** (device
      camera, `expo-camera`) or **phone number** → opens the member page
- [x] Second Firebase connection `src/lib/rewardsFirebase.ts` (app name `rewards`, config from
      `EXPO_PUBLIC_REWARDS_FIREBASE_*`; optional — the POS runs without it)
- [x] Device login: `src/stores/useRewardsAuthStore.ts` (remembered, **not** cleared on staff
      logout, checks `role: "pos"`). Profile tab → **Rewards** card to sign in / out. The modal
      asks to sign in from Profile if the device isn't signed in
- [x] `src/services/rewardsService.ts`: wraps the functions and maps their names to the POS's
      (`uid` → `memberId`, `balance` → `newBalance`, `discount` → `discountAmount`), plus
      staff-facing error messages
- [x] Member page `app/rewards/member.tsx`: name, phone, balance, order totals,
      **Redeem** ($5 steps, stepper, max 20) and **Collect** (shows points first). Each action
      calls the function, saves the result on the order (`src/services/orderLoyaltyService.ts`),
      then `router.back()` to the table / take-out card and shows a confirmation
- [x] Rules in `src/domain/rewards/rewardsRules.ts`:
      Redeem blocked if the order has a discount, isn't in progress, was already redeemed or
      collected, or the member has < 100 pts. Collect once per order, not on cancelled orders.
      An order linked to one member can't be used by another
- [x] First redeem / collect saves `order.loyalty` → the Rewards button skips scanning next time.
      Dine-in ↔ take-out conversions keep `loyalty`
- [x] QR lookup fixed (POS sent `memberId`, functions expect `uid`)
- [x] Cancel → `reverseOrder` (dine-in and take-out, in `useOrderStore.cancelOrder` →
      `reverseCancelledOrderRewards`). Reads the order fresh, skips orders with no points,
      saves `loyalty.reversedAt` / `pointsReversed`. If the call fails the order stays cancelled,
      gets `loyalty.reversePending: true`, and staff see a warning naming the member
- [ ] Retry for `reversePending` orders (take-out: pressing Cancel again retries; dine-in has no way yet)
- [x] Redemption discount locked: the Discount button shows "Discount locked" on redeemed orders
      (summary reads "Rewards (N pts)"), and saving an edit / dine-in → take-out conversion always
      re-applies `loyalty.redeemedAmount` as the Amount discount (`redemptionDiscountInputs`).
      Uses the order the editor loaded (no extra read, so offline edits still queue); a redeem
      made on another device *while* an edit screen is open could still be overwritten (rare)
- [ ] Customer display prompts ("Scan your loyalty QR", "+N points earned")
- [ ] Add `EXPO_PUBLIC_REWARDS_FIREBASE_*` to EAS environment variables (cloud builds don't read `.env`)
- [ ] Native development build (camera is native code; Expo Go is now SDK 58, POS is SDK 57)

## Decisions

| Topic | Decision |
|---|---|
| Projects | Separate Firebase project for loyalty (customers isolated from POS) |
| QR code | The member's uid (`members/{uid}` doc id). A uid isn't a secret (rules check the signed-in user), the QR is shown live in the app so it can change later, and staff can fall back to phone search |
| Member lookup at POS | Scan QR, or search by phone (members are separate from POS `customers`) |
| Earn rate | 1 point per $1 of pre-tax subtotal, **after** any redemption ($42 − $5 → 37 pts) |
| Who earns | Dine-in and take-out |
| When to earn | Any time after the order, **once per order**; POS marks the order as collected |
| Redeem | Fixed steps: 100 pts = $5 off (max 20 steps), applied as the POS's existing Amount discount |
| Redeem + staff discount | **Blocked** — an order with a staff discount can't redeem |
| Points expiry | **Never** |
| Cancelled order | Points automatically reversed (earned removed, redeemed refunded) |
| Edited order | **Not** reversed. A reverse is final (later earn/redeem return `already…`), so the redemption discount simply stays on the order. Points collected before an edit stay as they were (rare: collect happens at payment); an adjust function can come later if needed |
| Customer sign-in | Google **or** email + password, same on iOS, Android and web. No Apple sign-in (it needs extra setup on web/Android); add it on iOS later only if App Store review asks |
| Member doc id | Firebase Auth uid (`members/{uid}`) — no lookup needed, simple rules |
| Creating the member | The app writes it directly; security rules check the fields. Not a function |
| Scanning | Device camera |
| POS screens | Rewards button → modal (QR / phone) → member page (Redeem / Collect) → back to the order |
| Customer display | Shows "Scan your loyalty QR" and "+N points earned" |

## How POS and loyalty talk

One-way only: **POS → loyalty**. No callbacks.

```
Customer app ──reads own data──▶  Loyalty Firebase project  ◀──Cloud Functions── POS
(points, QR, history)              (members, ledger)            (lookup / earn / redeem)
```

- The POS calls loyalty Cloud Functions. The function's response **is** the confirmation
  (e.g. `{ pointsEarned: 42, balance: 292 }`).
- The customer app listens live to its own member doc, so points update on the phone
  the moment staff scan.

### POS connecting to two Firebase projects

The Firebase SDK can hold several connections, each with a name
(`src/lib/rewardsFirebase.ts`):

```ts
const app = initializeApp(posConfig);                          // existing
const rewardsApp = initializeApp(rewardsConfig, "rewards");    // new
export const rewardsAuth = initializeAuth(rewardsApp, { persistence }); // getAuth on web
export const rewardsFunctions = getFunctions(rewardsApp);
```

- Each connection has its own login. Staff keep using the normal POS login.
- Each POS device signs into rewards **once** as `pos@asianle.ca` from the
  **Rewards card in the Profile tab**. The login is remembered.
- The password is **never** put in `.env` — the web POS is public and `EXPO_PUBLIC_*`
  values are visible in the bundle. The rewards Firebase *config* is fine in `.env`.

### Security

- `pos@asianle.ca` gets a custom claim `role: "pos"` via a one-time admin script.
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

## Data model

### Loyalty project

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

### POS orders (`dineInOrders` / `takeOutOrders`)

```
loyalty: {
  memberId, memberName,              ← set on the first redeem or collect
  pointsRedeemed?, redeemedAmount?,  ← redeem (the amount is also the order's Amount discount)
  pointsEarned?, collectedAt?,       ← collect
  reversedAt?, pointsReversed?,      ← cancel (reverseOrder succeeded)
  reversePending?                    ← cancel, but reverseOrder failed
}
```

## Cloud Functions (loyalty project)

All written and tested in the emulators (`functions/src/`). POS functions require the
`role: "pos"` claim; a customer calling them gets `permission-denied`.

| Function | Caller | Input → result |
|---|---|---|
| `deleteAccount` | customer | `{}` → `{ deleted }`. Deletes `members/{uid}` + `transactions`, frees `phoneNumbers/{phone}`, deletes the login. Safe to retry |
| `lookupMember` | POS | `{ uid }` (QR) or `{ phone }` (any format) → `{ member: { uid, name, phone, points } }`; `not-found` if none |
| `earnPoints` | POS | `{ uid, orderId, subtotal }` → `{ pointsEarned, balance, alreadyEarned }`. floor(subtotal) points, once per order; under $1 earns 0 and writes nothing |
| `redeemPoints` | POS | `{ uid, orderId, steps }` (1–20) → `{ pointsRedeemed, discount, balance, alreadyRedeemed }`. 100 pts = $5 per step, once per order; `failed-precondition` if not enough points |
| `reverseOrder` | POS | `{ uid, orderId }` → `{ pointsChanged, balance, alreadyReversed }`. Removes earned, refunds redeemed, once. A cancelled order can't earn again |

- Calling any of them twice for the same order changes nothing (`already…: true`), so the
  POS can safely retry after a network error. Two taps at the same time also count once.
- The POS saves `order.loyalty = { memberId, ... }` so `reverseOrder` knows the member.
- Balance **stops at 0**: if a cancelled order's earned points were already spent,
  `reverseOrder` only removes what's left, and the reverse record shows the amount applied.
- Transactions also store `subtotal` (earn) and `discount` (redeem), shown in the Activity tab.
- The POS uses its own names and maps them in `src/services/rewardsService.ts`
  (`memberId` ↔ `uid`, `newBalance` ↔ `balance`, `discountAmount` ↔ `discount`).

### POS login setup (once)

1. Firebase console → Authentication → **Add user** `pos@asianle.ca` + strong password.
2. Project settings → Service accounts → **Generate new private key**. Save it **outside the
   repo** (admin key; `.gitignore` also blocks common key file names).
3. `node functions/scripts/set-pos-role.mjs pos@asianle.ca C:\keys\asian-le-rewards-key.json`
4. Sign the POS in to rewards from Profile → Rewards (signing in again picks up the claim).

## Phases

0. **Lock down the POS Firebase project** (do first)
   - Authentication → Settings → User actions → turn **off** "Enable create (sign-up)"
   - Review Firestore rules (no rules file in the POS repo yet) and track them in the repo
1. ✅ **Loyalty Firebase project**: created, Blaze plan, Email/Password auth, Firestore,
   `pos@asianle.ca` + `role: pos`, security rules. Google sign-in still to enable
2. ✅ **Cloud Functions** (table above), tested with emulators and deployed
3. **Customer app**: email sign-in ✅ → name + phone at sign-up ✅
   (phone is for POS search, not verified) → home (points + QR) ✅ → history ✅ →
   Delete account ✅ → Google sign-in (needs a development build)
   - Delete account: Profile → confirm in place → `deleteAccount` function → sign out.
   - The app listens live to `members/{uid}` (`AuthProvider`). Signed in with no member doc
     (first Google sign-in, or an interrupted email sign-up) → `complete-profile` screen.
4. **POS integration** (see POS status above)
   - ✅ Second Firebase connection + Rewards card in Profile
   - ✅ `src/services/rewardsService.ts` wrapping the functions
   - ✅ Rewards button → modal (scan / phone) → member page → Redeem ($5 steps) / Collect
     (once, saves `order.loyalty`)
   - ✅ Cancel → `reverseOrder`
   - Customer display prompts
5. **Test end to end, then deploy**

## Notes on the rewards repo

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
- Cloud Functions: `functions/` (TypeScript, firebase-functions v7, Node 22). Build with
  `npm --prefix functions run build`. Emulators (`firebase emulators:start`) need **Java 21+**
  with the current Firebase CLI.

## Notes on the POS side

- Rewards config: `EXPO_PUBLIC_REWARDS_FIREBASE_*` in `.env` (see `.env.example`).
- The member page route is `/rewards/member?orderId&orderType=dinein|takeout&memberId|phone`
  (`src/features/rewards/rewardsNavigation.ts`).
- Dine-in: the member page is pushed on top of the table page and returns with `router.back()`
  (no `replace`, per the dine-in navigation rules).

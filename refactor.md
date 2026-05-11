# Refactoring Plan — Asian Le POS

> **Goal**: Transform this from a working prototype into a maintainable, scalable codebase.
> No changes are applied until each section is discussed and approved.

---

## Current State Summary

| Category | Problem | Severity |
|----------|---------|----------|
| `useOrderStore.ts` — 913 lines | Cart state + Firestore writes + cross-store reads all in one file | Critical |
| No service layer | Firestore ops scattered across 10 stores and multiple screens | Critical |
| Mega screens (628 / 600 / 582 lines) | Business logic, state, and UI mixed together | High |
| Store-to-store `.getState()` calls | 8 locations bypass React subscription semantics | High |
| No `/src/hooks/` directory | Reusable logic is either duplicated or buried in features | Medium |
| Navigation performance | Heavy screen components and no lazy data loading hurts smoothness | Medium |
| Scattered cache logic | 4 separate AsyncStorage implementations with no shared pattern | Low |

---

## 1. Introduce a Service Layer (`src/services/`)

### Problem
Every Firestore operation — reads, batch writes, multi-document transactions — lives directly inside Zustand store action functions. This means:
- You can't reuse a Firestore write without importing an entire store
- You can't unit-test a write without mocking Zustand
- Any change to Firestore structure requires hunting through store files

### Proposed Structure
```
src/services/
  orderService.ts        # submitOrder, updateOrder, cancelOrder, completeOrder, markPaid
  tableService.ts        # updateTableStatus, changeDineInTable (batch)
  conversionService.ts   # convertDineInToTakeOut, convertTakeOutToDineIn
  printService.ts        # submitToPrintQueue, submitSelectedItemsToPrintQueue
  customerService.ts     # syncCustomerFromCart, addCustomer, updateCustomer
```

### What moves where
- `useOrderStore.submitOrder` → `orderService.submitOrder(order, db)`
- `useOrderStore.updateOrderOnFirestore` → `orderService.updateOrder(...)`
- `useOrderStore.cancelOrder` → `orderService.cancelOrder(...)`
- `useOrderStore.completeOrder` → `orderService.completeOrder(...)`
- `useOrderStore.markOrderAsPaid` → `orderService.markPaid(...)`
- `useOrderStore.changeDineInOrderTable` → `tableService.changeDineInOrderTable(...)`
- `useOrderStore.convertDineInOrderToTakeOut` → `conversionService.toDineIn(...)`
- `useOrderStore.convertTakeOutOrderToDineIn` → `conversionService.toTakeOut(...)`
- `useOrderStore.submitToPrintQueue` → `printService.submitToPrintQueue(...)`
- `useCustomersStore.syncTakeOutCustomerFromCart` → `customerService.syncFromCart(...)`

### What stores become after this
Stores hold **state only**. Their actions call services and then update local state based on the result — no `writeBatch`, `setDoc`, `updateDoc`, `getDoc`, or `onSnapshot` inside store actions.

---

## 2. Split `useOrderStore` into Two Stores

### Problem
`useOrderStore.ts` is 913 lines doing two completely different jobs:
1. **Cart management** — adding items, clearing, updating quantities, tracking discount
2. **Order lifecycle** — submitting, editing, cancelling, converting, printing Firestore documents

These have different lifecycles: the cart resets after each order, but the order lifecycle actions operate on already-persisted orders.

### Proposed Split

**`useCartStore.ts`** (~200 lines) — in-memory cart only
```
state:   order (OrderDraft), dismissal flag
actions: addItem, removeItem, updateQuantity, updateOrderItem,
         clearOrder, setOrder, updateOrder, getTotalItems, getTaxBreakdown,
         dismissTakeOutCustomerNameSuggestion
```

**`useOrderStore.ts`** (~150 lines) — thin bridge, calls services
```
actions: submitOrder(draft)        → calls orderService, then clearCart
         updateOrder(order)        → calls orderService
         cancelOrder(order)        → calls orderService
         completeOrder(order)      → calls orderService
         markOrderAsPaid(order)    → calls orderService
         submitToPrintQueue(order) → calls printService
         changeDineInOrderTable    → calls tableService
         convertDineInToTakeOut    → calls conversionService
         convertTakeOutToDineIn    → calls conversionService
```

Screens that use the cart import `useCartStore`. Screens that submit/edit orders import `useOrderStore` (which internally uses services). The two never import each other.

---

## 3. Fix Store-to-Store `.getState()` Calls

### Problem
8 locations call `.getState()` on a foreign store inside async actions or event handlers. This bypasses React's subscription system and creates hidden dependencies.

```typescript
// useOrderStore.ts line 349 — store reading another store
const tableDocId = useTableStore.getState().getTableDocId(order.tableNumber);

// useCustomersStore.ts line 140 — store reading another store  
const { order } = useOrderStore.getState();

// app/(tabs)/_layout.tsx lines 80-81 — UI calling store action imperatively
void useMenuChangesStore.getState().fetchMenuChanges();
void useCreditsStore.getState().fetchCredits();
```

### Fix

**For store-to-store access in async actions**: pass the required data as a parameter to the service function instead of reading the other store. For example:
```typescript
// Before (in useOrderStore action):
const tableDocId = useTableStore.getState().getTableDocId(order.tableNumber);

// After (in orderService, called from screen with tableDocId resolved by hook):
orderService.submitOrder(order, tableDocId, db)
```

**For `_layout.tsx` imperative calls**: trigger data fetches from `useEffect` hooks within those stores' own subscription setup, or use a root-level app initialization service that's called once on mount.

**For `useCustomersStore` reading the order**: pass the order as a parameter to `syncFromCart(order)` instead of reading it imperatively.

---

## 4. Break Up Mega Screen Components

### `app/dinein/table/[tableNumber].tsx` — 628 lines

This screen does: data fetching, order display, item selection mode, cash payment modal, paid-toggle debouncing, print logic, and navigation. Split into:

```
app/dinein/table/[tableNumber].tsx        ← thin orchestrator (~120 lines)
src/features/dinein/
  hooks/
    useDineInTableData.ts                 ← data fetching + subscription hook
    useItemSelectionMode.ts               ← selection toggle state + callbacks
  components/
    DineInOrderActions.tsx                ← action buttons (Take Order, Print, etc.)
    DineInItemSelectionFooter.tsx         ← selection mode footer with print/paid buttons
    DineInOrderSummary.tsx                ← order total + paid status display
```

### `app/(tabs)/take-out-orders.tsx` — 600 lines

This screen does: order list display, expand/collapse state, selection mode, complete/cancel/print/edit handlers, cash modal, and an inline card sub-component. Split into:

```
app/(tabs)/take-out-orders.tsx            ← thin list screen (~80 lines)
src/features/takeout/
  components/
    TakeOutOrderCard.tsx                  ← the card component (currently inline)
    TakeOutOrderActions.tsx               ← complete/cancel/print/edit buttons
    TakeOutSelectionFooter.tsx            ← selection mode footer
  hooks/
    useTakeOutOrderActions.ts             ← complete, cancel, markPaid callbacks
```

### `app/item/[itemId].tsx` — 582 lines

This screen manages: quantity state, instructions state, option selection state, extras state, changes state, option group loading, form serialization for navigation, and add/update logic. Split into:

```
app/item/[itemId].tsx                     ← thin entry screen (~80 lines)
src/features/order/
  hooks/
    useItemCustomizer.ts                  ← all form state + derived values (~150 lines)
  components/
    ItemOptionGroup.tsx                   ← renders one option group
    ItemQuantitySelector.tsx              ← +/- quantity control
    ItemInstructionsInput.tsx             ← text input for instructions
    ItemExtrasSection.tsx                 ← extras/changes editors
```

---

## 5. Centralize Custom Hooks in `src/hooks/`

Currently only one custom hook exists (`useDebouncedMenuSearch`) and it lives inside a feature folder. Complex state logic in components (`ItemChangeEditor`, `AddExtraEditor`) uses manual ref-based sync instead of proper hooks.

### Create `src/hooks/`

```
src/hooks/
  useDebouncedValue.ts          ← generic debounce (extract from useDebouncedMenuSearch)
  useOptimisticUpdate.ts        ← debounced paid-toggle pattern used in multiple screens
  useDisclosure.ts              ← open/close/toggle boolean (replace scattered useState modal flags)
  useAsyncAction.ts             ← loading + error state for async handlers (replaces submitting useState)
```

**`useAsyncAction`** example — replaces the repeated pattern across every screen:
```typescript
// Current pattern (repeated ~8 times across screens):
const [submitting, setSubmitting] = useState(false);
const handleX = async () => {
  try { setSubmitting(true); await doThing(); } 
  catch (e: any) { showAlert("Error", e.message); }
  finally { setSubmitting(false); }
};

// With hook:
const { execute: handleSubmit, loading: submitting } = useAsyncAction(doThing);
```

**`useDisclosure`** — replaces `useState(false)` for every modal:
```typescript
const cashModal = useDisclosure();
// cashModal.isOpen, cashModal.open(), cashModal.close(), cashModal.toggle()
```

---

## 6. Create a Domain Layer for Business Logic (`src/domain/`)

### Problem
Core business rules are scattered:
- Tax calculation → `src/utils/helpers.ts`
- Order item grouping/ungrouping → `src/utils/groupOrderItems.ts` (492 lines)
- Item preprocessing (bake options into name) → `src/utils/preprocessOrderItems.ts`
- Order item normalization for DB → `src/utils/normalizeOrderItemText.ts`

These are domain rules, not utilities. They change when business rules change, not when presentation changes.

### Proposed Structure
```
src/domain/
  order/
    orderItemGrouping.ts      ← groupOrderItemsBySignature, ungroupOrderItems (from groupOrderItems.ts)
    orderItemSections.ts      ← groupOrderItemsByDisplaySection (from features/order/)
    orderCalculations.ts      ← calculateTaxBreakdown, orderItemsSubtotal (from helpers.ts)
    orderItemMapper.ts        ← preprocessOrderItems + normalizeOrderItemTextForDb together
  menu/
    menuSorting.ts            ← getFirstCategoryItems, getVisibleMenuItemsInCategoryOrder (from menuOrdering.ts)
```

`src/utils/` becomes pure utility functions only — formatting, debounce, phone parsing, AsyncStorage wrappers. No domain knowledge.

---

## 7. Rename `useActiveDineInOrdersStore` → Hook

`src/stores/useActiveDineInOrdersStore.ts` is not a store — it's a 22-line derived selector. It uses the `useStore` hook convention, doesn't hold state, and shouldn't be in `/stores/`.

Move to: `src/features/dinein/hooks/useActiveDineInOrders.ts`

---

## 8. Navigation Performance

### Likely causes of sluggish navigation

**Heavy screen mounts**: The `dinein/table/[tableNumber].tsx` (628 lines) and `take-out-orders.tsx` (600 lines) screens compute expensive derived state on mount (item grouping, section sorting, tax breakdowns). Navigation stalls while the incoming screen's first render completes.

**Fixes:**
- Wrap expensive derived values in `useMemo` with stable deps (already done in some places, not consistently)
- Move section grouping computation out of render into a `useMemo` or a hook
- Add `React.memo` to list row components (`TakeOutOrderCard`, `OrderItemCard`, etc.) — currently `TakeOutOrderCard` is memoized but `OrderItemCard` is not checked

**FlashList vs FlatList**: Ensure all large lists use `FlashList` (already used in some places). If `FlatList` or `ScrollView` with `.map()` appears anywhere in the big screens, replace.

**Modal screens**: The cash payment modal and the discount modal are rendered inline (always mounted, shown/hidden via `visible` prop). On screens like `dinein/table`, this means the modal's component tree is always part of the screen's component tree. Use lazy rendering: only mount modals when `isOpen === true`.

**Re-renders from store subscriptions**: Components that subscribe to the entire order store state re-render on any state change. Use selector-based subscriptions:
```typescript
// Bad:
const { order, clearOrder, submitOrder } = useOrderStore();

// Good:
const orderItems = useOrderStore((s) => s.order.orderItems);
const clearOrder = useOrderStore((s) => s.clearOrder);
```
The `dinein/table` screen and `take-out-orders` screen both read full store slices — any cart change anywhere causes them to re-render.

**Expo Router header animation**: If using the default stack navigator, the header animation on deep routes (like `dinein/table/[tableNumber]`) can be slow on low-end devices. Consider `animation: 'none'` or `animation: 'fade'` for inner routes via layout options.

---

## 9. Consolidate Cache Logic

Four stores each implement their own AsyncStorage caching (customers, credits, menuChanges, dineInOrders). Each one has a slightly different shape for save/load/clear.

### Proposed: shared `createCachedStore` helper
```typescript
// src/utils/storeCache.ts
function createCachedStore<T>(key: string) {
  return {
    save: (data: T) => AsyncStorage.setItem(key, JSON.stringify(data)),
    load: (): Promise<T | null> => ...,
    clear: () => AsyncStorage.removeItem(key),
  };
}
```
All stores use this instead of reimplementing. Fixes inconsistencies (some use try/catch, some don't; some debounce writes, some don't).

---

## Priority Order

| Phase | Scope | Risk | Status |
|-------|-------|------|--------|
| **1** | Introduce `src/services/` — move Firestore writes out of stores | Low | ✅ Done |
| **2** | Split `useOrderStore` into `useCartStore` + thin `useOrderStore` | Medium | ✅ Done |
| **3** | Fix store-to-store `.getState()` calls | Low | ✅ Done |
| **4** | Add `src/hooks/` with `useAsyncAction`, `useDisclosure`, `useDebouncedValue` | Low | ✅ Done |
| **5** | Break up mega screens using new hooks and extracted components | Medium | ✅ Done |
| **6** | Create `src/domain/` and move business logic out of utils | Low | ✅ Done |
| **7** | Navigation performance fixes (memoization, selectors, lazy modals) | Low | ✅ Done |
| **8** | Consolidate cache helpers | Low | ⏳ Pending |

---

## What We Are NOT Doing

- Switching state management away from Zustand — it's appropriate for this app's size
- Adding Redux-style action creators or reducers
- Introducing GraphQL or a different data layer — Firestore direct SDK is fine
- Replacing Expo Router — the routing is clean
- Adding testing infrastructure unless the user requests it

---

## File Impact Summary

**New files to create:**
```
src/services/orderService.ts
src/services/tableService.ts
src/services/conversionService.ts
src/services/printService.ts
src/services/customerService.ts
src/hooks/useAsyncAction.ts
src/hooks/useDisclosure.ts
src/hooks/useDebouncedValue.ts
src/hooks/useOptimisticUpdate.ts
src/domain/order/orderCalculations.ts
src/domain/order/orderItemGrouping.ts
src/domain/order/orderItemMapper.ts
src/domain/menu/menuSorting.ts
src/stores/useCartStore.ts
src/features/dinein/hooks/useDineInTableData.ts
src/features/dinein/hooks/useItemSelectionMode.ts
src/features/dinein/components/DineInOrderActions.tsx
src/features/takeout/components/TakeOutOrderCard.tsx
src/features/takeout/hooks/useTakeOutOrderActions.ts
src/features/order/hooks/useItemCustomizer.ts
src/features/order/components/ItemOptionGroup.tsx
src/features/order/components/ItemQuantitySelector.tsx
```

**Files to shrink significantly:**
```
src/stores/useOrderStore.ts          913 → ~150 lines
app/dinein/table/[tableNumber].tsx   628 → ~120 lines
app/(tabs)/take-out-orders.tsx       600 → ~80 lines
app/item/[itemId].tsx                582 → ~80 lines
src/utils/groupOrderItems.ts         492 → ~50 lines (re-exports domain)
src/utils/helpers.ts                 255 → ~120 lines (formatting only)
```

**Files to delete:**
```
src/stores/useActiveDineInOrdersStore.ts   (becomes a hook)
```

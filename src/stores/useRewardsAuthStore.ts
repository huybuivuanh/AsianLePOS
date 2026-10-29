import { rewardsAuth, rewardsConfigured } from "@/lib/rewardsFirebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { create } from "zustand";

type RewardsAuthState = {
  configured: boolean;
  /** False until the first auth state arrives (remembered login is restored). */
  ready: boolean;
  user: User | null;
  /** True when the signed-in account has the `role: "pos"` claim. */
  isPosAccount: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Device-level login: it is NOT cleared on staff logout, so each device only
// signs in once.
export const useRewardsAuthStore = create<RewardsAuthState>((set) => ({
  configured: rewardsConfigured,
  ready: !rewardsConfigured,
  user: null,
  isPosAccount: false,
  signIn: async (email, password) => {
    if (!rewardsAuth) throw new Error("Rewards is not set up on this device.");
    await signInWithEmailAndPassword(rewardsAuth, email.trim(), password);
  },
  signOut: async () => {
    if (rewardsAuth) await signOut(rewardsAuth);
  },
}));

if (rewardsAuth) {
  onAuthStateChanged(rewardsAuth, async (user) => {
    let isPosAccount = false;
    if (user) {
      try {
        const token = await user.getIdTokenResult();
        isPosAccount = token.claims.role === "pos";
      } catch {
        // Offline: keep the login; functions re-check the role anyway.
      }
    }
    useRewardsAuthStore.setState({ ready: true, user, isPosAccount });
  });
}

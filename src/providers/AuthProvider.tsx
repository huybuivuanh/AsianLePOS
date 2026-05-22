import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEMO_EMAIL } from "../config/demo";
import { activateDemoDb, activateProductionDb, auth } from "../lib/firebaseConfig";
import { useMenuStore } from "../stores/useMenuStore";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>; // added logout
};

export const useAuth = () => useContext(AuthContext);

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {}, // default noop
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser?.email === DEMO_EMAIL) {
        activateDemoDb();
      } else {
        activateProductionDb();
      }
      // Clear menu version cache so the next subscription fetches from the
      // correct database instead of serving the previous account's cached menu.
      useMenuStore.getState().clearData();
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); // optional, onAuthStateChanged will handle it
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

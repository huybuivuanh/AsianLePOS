import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth } from "../lib/firebaseConfig";

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

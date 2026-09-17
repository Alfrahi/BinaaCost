import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { pb } from "@/integrations/pocketbase/client";
import { RecordModel } from "pocketbase";
import { offlineManager } from "@/shared/lib/offline";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: (RecordModel & { role?: string }) | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.record ?? null,
  );
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      const next = pb.authStore.isValid ? pb.authStore.record : null;
      setUser(next);
      if (next?.id) {
        offlineManager.init(next.id);
      }
    }, true);

    setLoading(false);
    return unsubscribe;
  }, []);

  const role = useMemo(
    () => (user?.role as string | undefined) ?? null,
    [user],
  );

  const signOut = useCallback(async () => {
    pb.authStore.clear();
    setUser(null);
    offlineManager.reset();
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

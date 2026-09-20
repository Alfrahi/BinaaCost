import { useAuth } from "./useAuth";

export type AppRole = "user" | "super_admin";

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role: role as AppRole | null,
    isSuperAdmin: role === "super_admin",
    isAdmin: role === "super_admin",
    isUser: role === "user",
    loading,
  };
}

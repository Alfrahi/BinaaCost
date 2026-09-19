import { useAuth } from "./useAuth";

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role,
    isSuperAdmin: role === "super_admin",
    isAdmin: role === "admin" || role === "super_admin",
    isUser: role === "user",
    loading,
  };
}

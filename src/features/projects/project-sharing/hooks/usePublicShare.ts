import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { PublicShareResponse } from "@/features/projects/project-core/types/project";

export type PublicQueryResult =
  | PublicShareResponse
  | { password_protected: true }
  | { error: string };

export function usePublicShare(accessToken?: string) {
  const { t } = useTranslation(["public_share", "common"]);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [shareData, setShareData] = useState<PublicQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const doFetch = useCallback(
    async (pw: string): Promise<PublicQueryResult> => {
      if (!accessToken) throw new Error("Access token is missing.");
      const base = import.meta.env.VITE_POCKETBASE_URL || "";
      const baseUrl = base.replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/api/share/${accessToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) return (await res.json()) as PublicShareResponse;
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        const msg = body?.message as string | undefined;
        if (msg?.startsWith("Incorrect password"))
          return { password_protected: true };
        throw new Error(msg || t("public_share:linkNotFoundOrExpired"));
      }
      throw new Error(t("public_share:linkNotFoundOrExpired"));
    },
    [accessToken, t],
  );

  // Probe once: empty password tells us whether this is a gated link.
  useEffect(() => {
    let alive = true;
    doFetch("")
      .then((data) => {
        if (!alive) return;
        if ("password_protected" in data) {
          setShareData(data);
        } else {
          setShareData(data);
          setIsAuthenticated(true);
        }
      })
      .catch((e) => alive && setError(e as Error))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, [doFetch]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const data = await doFetch(password);
      if ("password_protected" in data) {
        setAuthError(t("public_share:incorrectPassword"));
        setPassword("");
        return;
      }
      setShareData(data);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : t("public_share:invalidLink"),
      );
    }
  };

  return {
    password,
    setPassword,
    isAuthenticated,
    authError,
    shareData,
    isLoading,
    error,
    handlePasswordSubmit,
  };
}

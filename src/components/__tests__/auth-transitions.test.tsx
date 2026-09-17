import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock pb authStore with a controllable change listener
const hoisted = vi.hoisted(() => {
  const state: {
    changeCb: (() => void) | null;
    authStore: Record<string, any>;
  } = {
    changeCb: null,
    authStore: {
      record: null,
      isValid: false,
      clear: () => {
        state.authStore.isValid = false;
        state.authStore.record = null;
        state.changeCb?.();
      },
      onChange: (cb: () => void, fireImmediately?: boolean) => {
        state.changeCb = cb;
        if (fireImmediately) cb();
        return () => {
          state.changeCb = null;
        };
      },
    },
  };
  return state;
});
const { authStore } = hoisted;
const getChangeCb = () => hoisted.changeCb;

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    authStore: hoisted.authStore,
    collection: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from "@/app/providers/AuthProvider";

function Probe() {
  const { user, role, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? "null"}</span>
      <span data-testid="role">{role ?? "null"}</span>
      <button data-testid="signout" onClick={signOut} />
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("AuthProvider (PocketBase authStore)", () => {
  beforeEach(() => {
    authStore.record = null;
    authStore.isValid = false;
    vi.clearAllMocks();
  });

  it("starts unauthenticated and finishes loading", () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("role").textContent).toBe("null");
  });

  it("picks up an existing session from authStore", () => {
    authStore.isValid = true;
    authStore.record = { email: "a@b.c", role: "user" } as any;

    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("user").textContent).toBe("a@b.c");
    expect(screen.getByTestId("role").textContent).toBe("user");
  });

  it("reacts to sign-in via onChange", () => {
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("user").textContent).toBe("null");

    act(() => {
      authStore.isValid = true;
      authStore.record = { email: "admin@x.io", role: "super_admin" } as any;
      getChangeCb()?.();
    });

    expect(screen.getByTestId("user").textContent).toBe("admin@x.io");
    expect(screen.getByTestId("role").textContent).toBe("super_admin");
  });

  it("clears user and role on signOut", async () => {
    const clearSpy = vi.spyOn(hoisted.authStore, "clear");
    authStore.isValid = true;
    authStore.record = { email: "a@b.c", role: "super_admin" } as any;

    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("role").textContent).toBe("super_admin");

    await act(async () => {
      screen.getByTestId("signout").click();
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("role").textContent).toBe("null");
  });

  it("useAuth throws outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      "useAuth must be used within AuthProvider",
    );
    spy.mockRestore();
  });
});

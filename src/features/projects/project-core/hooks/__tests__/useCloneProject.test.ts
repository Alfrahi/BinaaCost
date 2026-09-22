import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCloneProject } from "../useCloneProject";
import { pb } from "@/integrations/pocketbase/client";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string) => {
        if (k === "common:copySuffix") return "Copy";
        return k;
      },
      i18n: { language: "en", dir: () => "ltr" },
    }),
  };
});

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useMutation: ({ mutationFn, onSuccess }: any) => ({
    mutate: async (vars: any) => {
      const res = await mutationFn(vars);
      onSuccess(res);
      return res;
    },
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: vi.fn(),
  },
}));

vi.mock("@/integrations/pocketbase/client", () => {
  const collections: Record<string, any> = {};

  return {
    pb: {
      collection: (name: string) => {
        if (!collections[name]) {
          collections[name] = {
            getOne: vi.fn(),
            getFullList: vi.fn().mockResolvedValue([]),
            create: vi.fn((data: any) =>
              Promise.resolve({ id: `mock-${name}-${Date.now()}`, ...data }),
            ),
          };
        }
        return collections[name];
      },
      send: vi.fn(),
    },
  };
});

describe("useCloneProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the clone endpoint via pb.send", async () => {
    (pb as any).send.mockResolvedValue({ id: "new-proj-999" });

    const { result } = renderHook(() => useCloneProject());

    await act(async () => {
      await result.current.mutate({ projectId: "source-proj-1", customName: "My Custom Clone" });
    });

    expect(pb.send).toHaveBeenCalledWith("/api/projects/source-proj-1/clone", {
      method: "POST",
      body: {
        customName: "My Custom Clone",
        copySuffix: "Copy",
      },
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["myProjects"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(mockNavigate).toHaveBeenCalledWith("/projects/new-proj-999");
  });
});

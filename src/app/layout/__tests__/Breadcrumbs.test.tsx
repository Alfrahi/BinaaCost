import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Breadcrumbs from "../Breadcrumbs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key.split(":").pop(),
    i18n: { dir: () => "ltr" },
  }),
}));

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: () => ({
      getOne: vi.fn().mockResolvedValue({ name: "My Awesome Project" }),
    }),
  },
}));

describe("Breadcrumbs", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it("links Projects segment to / instead of 404 /projects", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/projects/new"]}>
          <Breadcrumbs />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const projectsLink = screen.getByRole("link", { name: "title" });
    expect(projectsLink).toBeTruthy();
    expect(projectsLink.getAttribute("href")).toBe("/");
  });
});

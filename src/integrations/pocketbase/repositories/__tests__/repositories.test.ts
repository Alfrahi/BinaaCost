import { describe, it, expect, beforeEach, vi } from "vitest";

const collectionMock = {
  getOne: vi.fn(),
  getList: vi.fn(),
  getFullList: vi.fn(),
  getFirstListItem: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/integrations/pocketbase/client", () => ({
  pb: {
    collection: vi.fn(() => collectionMock),
  },
}));

import {
  BaseRepository,
  ProjectsRepository,
  MaterialsRepository,
  DropdownSettingsRepository,
} from "../index";

describe("PocketBase Repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BaseRepository", () => {
    const repo = new BaseRepository<{ title: string }>("tests");

    it("getById fetches and maps record", async () => {
      collectionMock.getOne.mockResolvedValue({
        id: "123456789012345",
        created: "2026-01-01",
        updated: "2026-01-02",
        title: "Test Record",
      });

      const result = await repo.getById("123456789012345");
      expect(result).toEqual({
        id: "123456789012345",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
        title: "Test Record",
      });
    });

    it("getList maps paginated results", async () => {
      collectionMock.getList.mockResolvedValue({
        page: 1,
        perPage: 10,
        totalItems: 1,
        totalPages: 1,
        items: [
          {
            id: "123456789012345",
            created: "2026-01-01",
            updated: "2026-01-02",
            title: "Test Record",
          },
        ],
      });

      const result = await repo.getList(1, 10);
      expect(result.totalItems).toBe(1);
      expect(result.items[0].created_at).toBe("2026-01-01");
    });

    it("create maps created record", async () => {
      collectionMock.create.mockResolvedValue({
        id: "123456789012345",
        created: "2026-01-01",
        updated: "2026-01-01",
        title: "New Record",
      });

      const result = await repo.create({ title: "New Record" });
      expect(result.title).toBe("New Record");
      expect(result.created_at).toBe("2026-01-01");
    });

    it("delete delegates to collection", async () => {
      collectionMock.delete.mockResolvedValue(true);
      const ok = await repo.delete("123456789012345");
      expect(ok).toBe(true);
      expect(collectionMock.delete).toHaveBeenCalledWith("123456789012345");
    });
  });

  describe("ProjectsRepository", () => {
    const projectsRepo = new ProjectsRepository();

    it("getProjectsByUser sets user filter and excludes deleted_at", async () => {
      collectionMock.getFullList.mockResolvedValue([]);
      await projectsRepo.getProjectsByUser("user-1");

      expect(collectionMock.getFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'user_id = "user-1" && deleted_at = null',
          sort: "-created",
        }),
      );
    });

    it("softDeleteProject sets deleted_at timestamp", async () => {
      collectionMock.update.mockResolvedValue({
        id: "p1",
        created: "2026-01-01",
        updated: "2026-01-02",
        name: "Project 1",
        deleted_at: "2026-09-20T00:00:00.000Z",
      });

      const result = await projectsRepo.softDeleteProject("p1");
      expect(collectionMock.update).toHaveBeenCalledWith("p1", expect.objectContaining({
        deleted_at: expect.any(String),
      }), undefined);
      expect(result.name).toBe("Project 1");
    });
  });

  describe("Cost items and settings repositories", () => {
    it("MaterialsRepository.getByProject filters by project_id", async () => {
      const materialsRepo = new MaterialsRepository();
      collectionMock.getFullList.mockResolvedValue([]);
      await materialsRepo.getByProject("proj-1");

      expect(collectionMock.getFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'project_id = "proj-1"',
          sort: "created",
        }),
      );
    });

    it("DropdownSettingsRepository.getByCategory filters by category", async () => {
      const dropdownRepo = new DropdownSettingsRepository();
      collectionMock.getFullList.mockResolvedValue([]);
      await dropdownRepo.getByCategory("material_unit");

      expect(collectionMock.getFullList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'category = "material_unit"',
          sort: "sort_order,value",
        }),
      );
    });
  });
});

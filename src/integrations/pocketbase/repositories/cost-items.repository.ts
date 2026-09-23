import { BaseRepository } from "./base.repository";
import type {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
  Risk,
} from "@/features/projects";
import { RecordListOptions } from "pocketbase";

export class MaterialsRepository extends BaseRepository<MaterialItem> {
  constructor() {
    super("materials");
  }

  async getByProject(projectId: string, options?: RecordListOptions): Promise<MaterialItem[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "created",
      ...options,
    });
  }
}

export class LaborRepository extends BaseRepository<LaborItem> {
  constructor() {
    super("labor_items");
  }

  async getByProject(projectId: string, options?: RecordListOptions): Promise<LaborItem[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "created",
      ...options,
    });
  }
}

export class EquipmentRepository extends BaseRepository<EquipmentItem> {
  constructor() {
    super("equipment_items");
  }

  async getByProject(projectId: string, options?: RecordListOptions): Promise<EquipmentItem[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "created",
      ...options,
    });
  }
}

export class AdditionalCostsRepository extends BaseRepository<AdditionalCostItem> {
  constructor() {
    super("additional_costs");
  }

  async getByProject(projectId: string, options?: RecordListOptions): Promise<AdditionalCostItem[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "created",
      ...options,
    });
  }
}

export class RisksRepository extends BaseRepository<Risk> {
  constructor() {
    super("risks");
  }

  async getByProject(projectId: string, options?: RecordListOptions): Promise<Risk[]> {
    return this.getFullList({
      filter: `project_id = "${projectId}"`,
      sort: "created",
      ...options,
    });
  }
}

export interface DropdownSetting {
  id: string;
  category: string;
  value: string;
  label: string;
  label_ar?: string;
  sort_order: number;
}

export class DropdownSettingsRepository extends BaseRepository<DropdownSetting> {
  constructor() {
    super("dropdown_settings");
  }

  async getByCategory(category: string, options?: RecordListOptions): Promise<DropdownSetting[]> {
    return this.getFullList({
      filter: `category = "${category}"`,
      sort: "sort_order,value",
      ...options,
    });
  }
}

export const materialsRepository = new MaterialsRepository();
export const laborRepository = new LaborRepository();
export const equipmentRepository = new EquipmentRepository();
export const additionalCostsRepository = new AdditionalCostsRepository();
export const risksRepository = new RisksRepository();
export const dropdownSettingsRepository = new DropdownSettingsRepository();

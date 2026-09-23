import {
  MaterialItem,
  LaborItem,
  EquipmentItem,
  AdditionalCostItem,
} from "@/features/projects/project-costs/types/items";
import { Risk, ProjectGroup } from "@/features/projects/project-core/types/project";

export interface ResolutionMap {
  materials: {
    toAdd: MaterialItem[];
    toRemove: string[];
    toUpdate: MaterialItem[];
  };
  labor: {
    toAdd: LaborItem[];
    toRemove: string[];
    toUpdate: LaborItem[];
  };
  equipment: {
    toAdd: EquipmentItem[];
    toRemove: string[];
    toUpdate: EquipmentItem[];
  };
  additional: {
    toAdd: AdditionalCostItem[];
    toRemove: string[];
    toUpdate: AdditionalCostItem[];
  };
  risks: {
    toAdd: Risk[];
    toRemove: string[];
    toUpdate: Risk[];
  };
  groups: {
    toAdd: ProjectGroup[];
    toRemove: string[];
    toUpdate: ProjectGroup[];
  };
}

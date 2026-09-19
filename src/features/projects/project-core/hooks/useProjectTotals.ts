import { useMemo } from "react";
import { useProjectMaterials } from "@/features/projects/project-costs/hooks/useProjectMaterials";
import { useProjectLabor } from "@/features/projects/project-costs/hooks/useProjectLabor";
import { useProjectEquipment } from "@/features/projects/project-costs/hooks/useProjectEquipment";
import { useProjectAdditionalCosts } from "@/features/projects/project-costs/hooks/useProjectAdditionalCosts";
import { calculateCategoryTotal } from "@/shared/logic/shared";

export function useProjectTotals(projectId: string) {
  const { data: materials = [], isLoading: isLoadingMaterials } = useProjectMaterials(projectId);
  const { data: labor = [], isLoading: isLoadingLabor } = useProjectLabor(projectId);
  const { data: equipment = [], isLoading: isLoadingEquipment } = useProjectEquipment(projectId);
  const { data: additional = [], isLoading: isLoadingAdditional } = useProjectAdditionalCosts(projectId);

  const totals = useMemo(() => {
    const materialsTotal = calculateCategoryTotal.materials(materials);
    const laborTotal = calculateCategoryTotal.labor(labor);
    const equipmentTotal = calculateCategoryTotal.equipment(equipment);
    const additionalTotal = calculateCategoryTotal.additional(additional);

    return {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      additionalTotal,
    };
  }, [materials, labor, equipment, additional]);

  const isLoading = isLoadingMaterials || isLoadingLabor || isLoadingEquipment || isLoadingAdditional;

  return { totals, isLoading, materials, labor, equipment, additional };
}

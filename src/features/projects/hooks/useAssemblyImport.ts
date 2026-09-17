import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AssemblyItem,
  AssemblyMaterialDetails,
  AssemblyLaborDetails,
  AssemblyEquipmentDetails,
  AssemblyAdditionalCostDetails,
} from "@/types/assemblies";
import { useProjectData } from "@/features/projects/hooks/useProjectData";
import { handleError } from "@/shared/lib/toast";
import { useProjectMaterials } from "@/features/projects/hooks/useProjectMaterials";
import { useProjectLabor } from "@/features/projects/hooks/useProjectLabor";
import { useProjectEquipment } from "@/features/projects/hooks/useProjectEquipment";
import { useProjectAdditionalCosts } from "@/features/projects/hooks/useProjectAdditionalCosts";
import { Project } from "@/types/project";

export function useAssemblyImport(projectId: string) {
  const { t } = useTranslation([
    "project_detail",
    "common",
    "project_tabs",
    "project_equipment",
  ]);
  const { project, isLoading: isLoadingProject } = useProjectData(projectId);
  const queryClient = useQueryClient();

  const { handleAddOrUpdate: handleAddOrUpdateMaterial } =
    useProjectMaterials(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateLabor } =
    useProjectLabor(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateEquipment } =
    useProjectEquipment(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateAdditionalCost } =
    useProjectAdditionalCosts(projectId);

  const { mutateAsync: importAssemblyItemsFn, isPending: isImporting } =
    useMutation<void, Error, AssemblyItem[]>({
      mutationFn: async (assemblyItems: AssemblyItem[]) => {
        if (!project) {
          throw new Error(t("common:projectNotFound"));
        }

        const projectCurrency = (project as Project).currency;

        let successCount = 0;
        let errorCount = 0;

        for (const item of assemblyItems) {
          try {
            switch (item.item_type) {
              case "material": {
                const details = item.details as AssemblyMaterialDetails | null;
                await handleAddOrUpdateMaterial(
                  {
                    name: item.description,
                    description: details?.description ?? undefined,
                    quantity: item.quantity,
                    unit: item.unit ?? "unit",
                    unit_price: item.unit_price,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "labor": {
                const details = item.details as AssemblyLaborDetails | null;
                await handleAddOrUpdateLabor(
                  {
                    worker_type: item.description,
                    number_of_workers: item.quantity,
                    daily_rate: item.unit_price,
                    total_days: details?.total_days ?? 1,
                    description: undefined,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "equipment": {
                const details = item.details as AssemblyEquipmentDetails | null;
                await handleAddOrUpdateEquipment(
                  {
                    name: item.description,
                    type: details?.type ?? undefined,
                    rental_or_purchase: details?.rental_or_purchase ?? "Rental",
                    quantity: item.quantity,
                    cost_per_period: item.unit_price,
                    period_unit: item.unit ?? "Day",
                    usage_duration: details?.usage_duration ?? 1,
                    maintenance_cost: details?.maintenance_cost ?? 0,
                    fuel_cost: details?.fuel_cost ?? 0,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "additional": {
                const details =
                  item.details as AssemblyAdditionalCostDetails | null;
                await handleAddOrUpdateAdditionalCost(
                  {
                    category: details?.category ?? "Miscellaneous",
                    description: item.description,
                    amount: item.unit_price,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              default:
                console.warn(
                  `Unknown item type encountered: ${item.item_type}`,
                );
                errorCount++;
                continue;
            }
            successCount++;
          } catch (e) {
            console.error(`Failed to import item ${item.id}:`, e);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(
            t("project_detail:assembly_importer.success_imported", {
              count: successCount,
            }),
          );
        }
        if (errorCount > 0) {
          toast.error(
            t("project_detail:assembly_importer.error_imported", {
              count: errorCount,
            }),
          );
        }

        await queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["analytics_projects_data"],
        });
      },
      onSuccess: () => {},
      onError: (error: any) => {
        handleError(error);
      },
    });

  return {
    importAssemblyItems: importAssemblyItemsFn,
    isImporting,
    isLoadingProject,
  };
}

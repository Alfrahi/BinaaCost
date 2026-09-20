import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AssemblyItem,
  AssemblyMaterialDetails,
  AssemblyLaborDetails,
  AssemblyEquipmentDetails,
  AssemblyAdditionalCostDetails,
} from "@/features/cost-library/assemblies/types/assemblies";
import { useProjectData } from "@/features/projects/project-core/hooks/useProjectData";
import { handleError } from "@/shared/lib/toast";
import { useProjectMaterials } from "@/features/projects/project-costs/hooks/useProjectMaterials";
import { useProjectLabor } from "@/features/projects/project-costs/hooks/useProjectLabor";
import { useProjectEquipment } from "@/features/projects/project-costs/hooks/useProjectEquipment";
import { useProjectAdditionalCosts } from "@/features/projects/project-costs/hooks/useProjectAdditionalCosts";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { Decimal } from "@/shared/lib/math";
import { Project } from "@/features/projects/project-core/types/project";

export interface ImportAssemblyParams {
  assemblyItems: AssemblyItem[];
  scaleFactor?: number;
}

export function useAssemblyImport(projectId: string) {
  const { t } = useTranslation([
    "project_detail",
    "common",
    "project_tabs",
    "project_equipment",
  ]);
  const { project, isLoading: isLoadingProject } = useProjectData(projectId);
  const queryClient = useQueryClient();
  const { convert } = useCurrencyConverter();

  const { handleAddOrUpdate: handleAddOrUpdateMaterial } =
    useProjectMaterials(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateLabor } =
    useProjectLabor(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateEquipment } =
    useProjectEquipment(projectId);
  const { handleAddOrUpdate: handleAddOrUpdateAdditionalCost } =
    useProjectAdditionalCosts(projectId);

  const { mutateAsync: importAssemblyItemsFn, isPending: isImporting } =
    useMutation<void, Error, AssemblyItem[] | ImportAssemblyParams>({
      mutationFn: async (params: AssemblyItem[] | ImportAssemblyParams) => {
        if (!project) {
          throw new Error(t("common:projectNotFound"));
        }

        const assemblyItems = Array.isArray(params) ? params : params.assemblyItems;
        const scale = Array.isArray(params) ? 1 : (params.scaleFactor ?? 1);
        const projectCurrency = (project as Project).currency;

        let successCount = 0;
        let errorCount = 0;

        for (const item of assemblyItems) {
          try {
            switch (item.item_type) {
              case "material": {
                const details = item.details;
                const unitPrice = convert(item.unit_price, "USD", projectCurrency);
                const quantity = new Decimal(item.quantity)
                  .times(scale)
                  .toDecimalPlaces(4)
                  .toNumber();
                await handleAddOrUpdateMaterial(
                  {
                    name: item.description,
                    description: details?.description ?? undefined,
                    quantity,
                    unit: item.unit ?? "unit",
                    unit_price: unitPrice,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "labor": {
                const details = item.details as AssemblyLaborDetails | null;
                const dailyRate = convert(item.unit_price, "USD", projectCurrency);
                const totalDays = new Decimal(details?.total_days ?? 1)
                  .times(scale)
                  .toDecimalPlaces(2)
                  .toNumber();
                await handleAddOrUpdateLabor(
                  {
                    worker_type: item.description,
                    number_of_workers: item.quantity,
                    daily_rate: dailyRate,
                    total_days: totalDays,
                    description: undefined,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "equipment": {
                const details = item.details as AssemblyEquipmentDetails | null;
                const costPerPeriod = convert(item.unit_price, "USD", projectCurrency);
                const usageDuration = new Decimal(details?.usage_duration ?? 1)
                  .times(scale)
                  .toDecimalPlaces(2)
                  .toNumber();
                const maintenanceCost = details?.maintenance_cost
                  ? new Decimal(convert(details.maintenance_cost, "USD", projectCurrency))
                      .times(scale)
                      .toDecimalPlaces(2)
                      .toNumber()
                  : 0;
                const fuelCost = details?.fuel_cost
                  ? new Decimal(convert(details.fuel_cost, "USD", projectCurrency))
                      .times(scale)
                      .toDecimalPlaces(2)
                      .toNumber()
                  : 0;

                await handleAddOrUpdateEquipment(
                  {
                    name: item.description,
                    type: details?.type ?? undefined,
                    rental_or_purchase: details?.rental_or_purchase ?? "Rental",
                    quantity: item.quantity,
                    cost_per_period: costPerPeriod,
                    period_unit: item.unit ?? "Day",
                    usage_duration: usageDuration,
                    maintenance_cost: maintenanceCost,
                    fuel_cost: fuelCost,
                    group_id: undefined,
                  },
                  projectCurrency,
                );
                break;
              }
              case "additional": {
                const details = item.details as AssemblyAdditionalCostDetails | null;
                const amount = new Decimal(convert(item.unit_price, "USD", projectCurrency))
                  .times(scale)
                  .toDecimalPlaces(2)
                  .toNumber();
                await handleAddOrUpdateAdditionalCost(
                  {
                    category: details?.category ?? "Miscellaneous",
                    description: item.description,
                    amount,
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

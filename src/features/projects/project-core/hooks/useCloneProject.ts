import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { pb } from "@/integrations/pocketbase/client";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { handleError } from "@/shared/lib/toast";

export interface CloneProjectOptions {
  projectId: string;
  customName?: string;
}

export function useCloneProject() {
  const { t } = useTranslation(["common", "dashboard", "project_detail"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, customName }: CloneProjectOptions) => {
      if (!user?.id) {
        throw new Error(t("common:mustBeLoggedIn"));
      }

      // 1. Fetch source project record
      const source = await pb.collection("projects").getOne(projectId);

      // Determine clone name
      const copySuffix = t("common:copySuffix", { defaultValue: "Copy" });
      const newName = customName?.trim() || `${source.name} (${copySuffix})`;

      // 2. Create the cloned project
      const newProject = await pb.collection("projects").create({
        name: newName,
        description: source.description,
        type: source.type,
        size: source.size,
        size_unit: source.size_unit,
        location: source.location,
        client_requirements: source.client_requirements,
        duration_days: source.duration_days,
        duration_unit: source.duration_unit,
        currency: source.currency,
        financial_settings: source.financial_settings,
        financial_settings_confirmed: source.financial_settings_confirmed,
        user_id: user.id,
      });

      const newProjectId = newProject.id;

      // 3. Fetch source items (groups, materials, labor, equipment, additional costs, risks)
      const [
        groups,
        materials,
        labor,
        equipment,
        additionalCosts,
        risks,
      ] = await Promise.all([
        pb
          .collection("project_groups")
          .getFullList({ filter: `project_id="${projectId}"`, sort: "sort_order" })
          .catch(() => []),
        pb
          .collection("materials")
          .getFullList({ filter: `project_id="${projectId}"` })
          .catch(() => []),
        pb
          .collection("labor_items")
          .getFullList({ filter: `project_id="${projectId}"` })
          .catch(() => []),
        pb
          .collection("equipment_items")
          .getFullList({ filter: `project_id="${projectId}"` })
          .catch(() => []),
        pb
          .collection("additional_costs")
          .getFullList({ filter: `project_id="${projectId}"` })
          .catch(() => []),
        pb
          .collection("risks")
          .getFullList({ filter: `project_id="${projectId}"` })
          .catch(() => []),
      ]);

      // 4. Clone project_groups and map old groupId to new groupId
      const groupMap = new Map<string, string>();
      for (const group of groups) {
        try {
          const createdGroup = await pb.collection("project_groups").create({
            name: group.name,
            color: group.color,
            sort_order: group.sort_order,
            project_id: newProjectId,
            user_id: user.id,
          });
          groupMap.set(group.id, createdGroup.id);
        } catch (e) {
          console.error("Failed to copy project group", e);
        }
      }

      // 5. Clone line items with mapped group_id
      const copyPromises: Promise<any>[] = [];

      for (const item of materials) {
        copyPromises.push(
          pb.collection("materials").create({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            supplier_options: item.supplier_options,
            group_id: item.group_id ? groupMap.get(item.group_id) || null : null,
            project_id: newProjectId,
            user_id: user.id,
          }),
        );
      }

      for (const item of labor) {
        copyPromises.push(
          pb.collection("labor_items").create({
            worker_type: item.worker_type,
            description: item.description,
            number_of_workers: item.number_of_workers,
            daily_rate: item.daily_rate,
            total_days: item.total_days,
            total_cost: item.total_cost,
            group_id: item.group_id ? groupMap.get(item.group_id) || null : null,
            project_id: newProjectId,
            user_id: user.id,
          }),
        );
      }

      for (const item of equipment) {
        copyPromises.push(
          pb.collection("equipment_items").create({
            name: item.name,
            type: item.type,
            rental_or_purchase: item.rental_or_purchase,
            quantity: item.quantity,
            cost_per_period: item.cost_per_period,
            period_unit: item.period_unit,
            usage_duration: item.usage_duration,
            maintenance_cost: item.maintenance_cost,
            fuel_cost: item.fuel_cost,
            total_cost: item.total_cost,
            group_id: item.group_id ? groupMap.get(item.group_id) || null : null,
            project_id: newProjectId,
            user_id: user.id,
          }),
        );
      }

      for (const item of additionalCosts) {
        copyPromises.push(
          pb.collection("additional_costs").create({
            category: item.category,
            description: item.description,
            amount: item.amount,
            group_id: item.group_id ? groupMap.get(item.group_id) || null : null,
            project_id: newProjectId,
            user_id: user.id,
          }),
        );
      }

      for (const item of risks) {
        copyPromises.push(
          pb.collection("risks").create({
            name: item.name,
            description: item.description,
            category: item.category,
            impact_amount: item.impact_amount,
            probability: item.probability,
            contingency_amount: item.contingency_amount,
            mitigation_notes: item.mitigation_notes,
            project_id: newProjectId,
            user_id: user.id,
          }),
        );
      }

      await Promise.all(copyPromises);

      return newProject;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t("common:duplicateSuccess"));
      navigate(`/projects/${newProject.id}`);
    },
    onError: (err: any) => {
      handleError(err);
    },
  });
}

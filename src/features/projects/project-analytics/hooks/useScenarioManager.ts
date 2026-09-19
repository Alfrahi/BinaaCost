import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import {
  Scenario,
  ScenarioRule,
  ScenarioRuleFormValues,
} from "@/features/projects/project-analytics/types/scenario";
import { handleError } from "@/shared/lib/toast";

export function useScenarioManager() {
  const { t } = useTranslation(["scenario_analysis", "common"]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scenarioQueryKey = ["risk_scenarios", user?.id];

  const { data: scenarios = [], isLoading: isLoadingScenarios } = useQuery<
    Scenario[]
  >({
    queryKey: scenarioQueryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      const records = await pb.collection("risk_scenarios").getFullList({
        filter: `user_id="${user.id}" || is_public=true`,
        sort: "-created",
      });
      return mapRecords<Scenario>(records);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const addScenarioMutation = useMutation({
    mutationFn: async (
      newScenario: Omit<
        Scenario,
        "id" | "user_id" | "created_at" | "updated_at"
      >,
    ) => {
      await pb.collection("risk_scenarios").create({
        ...newScenario,
        user_id: user?.id,
      });
    },
    onSuccess: () => {
      toast.success(t("successCreated"));
      queryClient.invalidateQueries({ queryKey: scenarioQueryKey });
    },
    onError: (error: any) => handleError(error),
  });

  const updateScenarioMutation = useMutation({
    mutationFn: async (updatedScenario: Partial<Scenario> & { id: string }) => {
      const { id, ...rest } = updatedScenario;
      await pb.collection("risk_scenarios").update(id, rest);
    },
    onSuccess: () => {
      toast.success(t("successUpdated"));
      queryClient.invalidateQueries({ queryKey: scenarioQueryKey });
    },
    onError: (error: any) => handleError(error),
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      await pb.collection("risk_scenarios").delete(scenarioId);
    },
    onSuccess: () => {
      toast.success(t("successDeleted"));
      queryClient.invalidateQueries({ queryKey: scenarioQueryKey });
    },
    onError: (error: any) => handleError(error),
  });

  const formatRulesForDb = (
    rules: ScenarioRuleFormValues[],
  ): ScenarioRule[] => {
    return rules.map((rule) => {
      const newRule: ScenarioRule = {
        item_type: rule.item_type,
        field: rule.field,
        adjustment_type: rule.adjustment_type,
        value: rule.value,
        ...(rule.filter_name_contains && {
          filter_name_contains: rule.filter_name_contains,
        }),
        ...(rule.filter_category_is && {
          filter_category_is: rule.filter_category_is,
        }),
        ...(rule.filter_worker_type_contains && {
          filter_worker_type_contains: rule.filter_worker_type_contains,
        }),
      };
      return newRule;
    });
  };

  const formatRulesForForm = (
    rules: ScenarioRule[],
  ): ScenarioRuleFormValues[] => {
    return rules.map((rule) => ({
      ...rule,
      filter_name_contains: rule.filter_name_contains || "",
      filter_category_is: rule.filter_category_is || "",
      filter_worker_type_contains: rule.filter_worker_type_contains || "",
    }));
  };

  return {
    scenarios,
    isLoadingScenarios,
    addScenario: addScenarioMutation.mutateAsync,
    updateScenario: updateScenarioMutation.mutateAsync,
    deleteScenario: deleteScenarioMutation.mutateAsync,
    isAddingScenario: addScenarioMutation.isPending,
    isUpdatingScenario: updateScenarioMutation.isPending,
    isDeletingScenario: deleteScenarioMutation.isPending,
    formatRulesForDb,
    formatRulesForForm,
  };
}

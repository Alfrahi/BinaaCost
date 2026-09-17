import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { callRouteWithParams } from "@/integrations/pocketbase/routes";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Scenario, SimulationResult } from "@/types/scenario-analysis";
import { handleError } from "@/shared/lib/toast";

export function useProjectSimulator() {
  const { t } = useTranslation(["scenario_analysis", "common"]);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: async ({
      projectId,
      scenario,
    }: {
      projectId: string;
      scenario: Scenario;
    }) => {
      const data = await callRouteWithParams<SimulationResult>(
        "projects/simulate",
        { id: projectId },
        { scenario },
      );
      return data;
    },
    onSuccess: (data) => {
      setSimulationResult(data);
      toast.success(t("simulationComplete"));
    },
    onError: (error: any) => handleError(error),
  });

  const runSimulation = useCallback(
    async (projectId: string, scenario: Scenario) => {
      setSimulationResult(null);
      const toastId = toast.loading(t("runningSimulation"));
      try {
        await simulateMutation.mutateAsync({ projectId, scenario });
      } finally {
        toast.dismiss(toastId);
      }
    },
    [simulateMutation, t],
  );

  return {
    simulationResult,
    isSimulating: simulateMutation.isPending,
    runSimulation,
    clearSimulationResult: () => setSimulationResult(null),
  };
}

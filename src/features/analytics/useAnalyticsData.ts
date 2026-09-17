import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { safeAdd } from "@/shared/lib/math";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { ProjectCostData, AnalyticsData } from "./types";
import { handleError } from "@/shared/lib/toast";

export function useAnalyticsData() {
  const { user } = useAuth();
  const { useQuery } = useOfflinePb();
  const {
    convert,
    getMissingRates,
    isLoading: loadingRates,
  } = useCurrencyConverter();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");

  const {
    data: projectsData = [],
    isLoading: loadingProjects,
    error: projectsError,
  } = useQuery({
    queryKey: ["analytics_projects_data", user?.id],
    queryFn: async (): Promise<ProjectCostData[]> => {
      if (!user?.id) return [];
      const projects = await pb
        .collection("projects")
        .getFullList({
          filter: `user_id="${user.id}" && deleted_at=""`,
          fields: "id,name,currency",
        });

      const tables = [
        ["materials", "materials_cost", (i: any) => (i.quantity || 0) * (i.unit_price || 0)],
        ["labor_items", "labor_cost", (i: any) => (i.number_of_workers || 0) * (i.daily_rate || 0) * (i.total_days || 0)],
        ["equipment_items", "equipment_cost", (i: any) => (i.quantity || 0) * (i.cost_per_period || 0) * (i.usage_duration || 0) + (i.maintenance_cost || 0) + (i.fuel_cost || 0)],
        ["additional_costs", "additional_cost", (i: any) => i.amount || 0],
      ] as const;

      // Fetch each cost table once for the whole user (not once per project)
      // to avoid an N+1 query storm, then group by project in memory.
      const byProject: Record<string, Record<string, number>> = {};
      for (const [coll, key, fn] of tables) {
        const items = await pb
          .collection(coll)
          .getFullList({ filter: `user_id="${user.id}"` });
        for (const item of items as any[]) {
          const pid = item.project_id;
          if (!pid) continue;
          byProject[pid] ??= {};
          byProject[pid][key] = (byProject[pid][key] ?? 0) + fn(item);
        }
      }

      const out: ProjectCostData[] = (projects as any[]).map((p) => {
        const sums = byProject[p.id] ?? {};
        const total =
          (sums.materials_cost ?? 0) +
          (sums.labor_cost ?? 0) +
          (sums.equipment_cost ?? 0) +
          (sums.additional_cost ?? 0);
        return {
          id: p.id,
          name: p.name,
          currency: p.currency,
          materials_cost: sums.materials_cost ?? 0,
          labor_cost: sums.labor_cost ?? 0,
          equipment_cost: sums.equipment_cost ?? 0,
          additional_cost: sums.additional_cost ?? 0,
          total_cost: total,
        };
      });
      return out;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (projectsError) {
      handleError(projectsError);
    }
  }, [projectsError]);

  const availableCurrencies = useMemo(() => {
    if (!projectsData || projectsData.length === 0) return [];
    return Array.from(new Set(projectsData.map((p) => p.currency))).sort();
  }, [projectsData]);

  useEffect(() => {
    if (
      availableCurrencies.length > 0 &&
      !availableCurrencies.includes(selectedCurrency)
    ) {
      setSelectedCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, selectedCurrency]);

  const filteredData = useMemo<AnalyticsData | null>(() => {
    if (!projectsData || loadingRates) return null;

    try {
      let projects: ProjectCostData[] = [];
      let displayCurrency = "USD";
      const missingRatesSet = new Set<string>();
      const affectedProjectsSet = new Set<string>();

      if (selectedProjectId !== "all") {
        const project = projectsData.find((p) => p.id === selectedProjectId);
        if (project) {
          projects = [project];
          displayCurrency = project.currency;
        }
      } else {
        displayCurrency = selectedCurrency;
        projects = projectsData.map((p) => {
          const missing = getMissingRates(p.currency, displayCurrency);
          missing.forEach((r) => missingRatesSet.add(r));
          if (missing.length > 0) affectedProjectsSet.add(p.name);

          return {
            ...p,
            materials_cost: convert(
              p.materials_cost,
              p.currency,
              displayCurrency,
            ),
            labor_cost: convert(p.labor_cost, p.currency, displayCurrency),
            equipment_cost: convert(
              p.equipment_cost,
              p.currency,
              displayCurrency,
            ),
            additional_cost: convert(
              p.additional_cost,
              p.currency,
              displayCurrency,
            ),
            total_cost: convert(p.total_cost, p.currency, displayCurrency),
          };
        });
      }

      if (projects.length === 0) return null;

      const totals = {
        materials: projects.reduce(
          (sum, p) => safeAdd(sum, p.materials_cost),
          0,
        ),
        labor: projects.reduce((sum, p) => safeAdd(sum, p.labor_cost), 0),
        equipment: projects.reduce(
          (sum, p) => safeAdd(sum, p.equipment_cost),
          0,
        ),
        additional: projects.reduce(
          (sum, p) => safeAdd(sum, p.additional_cost),
          0,
        ),
      };

      return {
        projects,
        totals,
        grandTotal: safeAdd(
          totals.materials,
          totals.labor,
          totals.equipment,
          totals.additional,
        ),
        displayCurrency,
        missingRates: Array.from(missingRatesSet),
        affectedProjects: Array.from(affectedProjectsSet),
      };
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [
    projectsData,
    selectedProjectId,
    selectedCurrency,
    loadingRates,
    convert,
    getMissingRates,
  ]);

  return {
    projectsData,
    filteredData,
    loading: loadingProjects || loadingRates,
    error: projectsError,
    availableCurrencies,
    selectedProjectId,
    setSelectedProjectId,
    selectedCurrency,
    setSelectedCurrency,
  };
}

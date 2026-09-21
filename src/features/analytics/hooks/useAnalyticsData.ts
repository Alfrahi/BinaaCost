import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { pb } from "@/integrations/pocketbase/client";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { safeAdd } from "@/shared/lib/math";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { calculateItemCost } from "@/shared/logic/shared";
import { ProjectCostData, AnalyticsData } from "../types";
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

      if (projects.length === 0) return [];

      // Fetch each cost table once for the fetched projects
      // to avoid an N+1 query storm, then group by project in memory.
      // All cost calculations use the same Decimal.js-backed helpers as the
      // project detail view so totals match across screens.
      const tables = [
        {
          coll: "materials",
          key: "materials_cost" as const,
          fn: (i: any) => calculateItemCost.material(i.quantity || 0, i.unit_price || 0),
        },
        {
          coll: "labor_items",
          key: "labor_cost" as const,
          fn: (i: any) => calculateItemCost.labor(i.number_of_workers || 0, i.daily_rate || 0, i.total_days || 0),
        },
        {
          coll: "equipment_items",
          key: "equipment_cost" as const,
          fn: (i: any) =>
            calculateItemCost.equipment({
              quantity: i.quantity || 0,
              costPerPeriod: i.cost_per_period || 0,
              usageDuration: i.usage_duration || 0,
              maintenanceCost: i.maintenance_cost,
              fuelCost: i.fuel_cost,
              rentalOrPurchase: i.rental_or_purchase,
            }).totalCost,
        },
        {
          coll: "additional_costs",
          key: "additional_cost" as const,
          fn: (i: any) => calculateItemCost.additional(i.amount || 0),
        },
      ];

      // Build a filter to fetch items only for the retrieved projects
      const projectFilter = projects.map((p) => `project_id="${p.id}"`).join(" || ");

      const byProject: Record<string, Record<string, number>> = {};
      for (const { coll, key, fn } of tables) {
        const items = await pb
          .collection(coll)
          .getFullList({ filter: projectFilter });
        for (const item of items as any[]) {
          const pid = item.project_id;
          if (!pid) continue;
          byProject[pid] ??= {};
          byProject[pid][key] = safeAdd(byProject[pid][key] ?? 0, fn(item));
        }
      }

      const out: ProjectCostData[] = (projects as any[]).map((p) => {
        const sums = byProject[p.id] ?? {};
        const total = safeAdd(
          sums.materials_cost ?? 0,
          sums.labor_cost ?? 0,
          sums.equipment_cost ?? 0,
          sums.additional_cost ?? 0,
        );
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

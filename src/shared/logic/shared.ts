import { safeAdd, safeMult } from "@/shared/lib/math";

export const calculateItemCost = {
  material: (quantity: number, unitPrice: number): number => {
    return safeMult(quantity, unitPrice);
  },

  labor: (
    numberOfWorkers: number,
    dailyRate: number,
    totalDays: number,
  ): number => {
    return safeMult(numberOfWorkers, dailyRate, totalDays);
  },

  equipment: (input: {
    quantity: number;
    costPerPeriod: number;
    usageDuration: number;
    maintenanceCost?: number | null;
    fuelCost?: number | null;
  }): { baseCost: number; totalCost: number } => {
    const baseCost = safeMult(
      input.quantity,
      input.costPerPeriod,
      input.usageDuration,
    );
    const maintenance = input.maintenanceCost || 0;
    const fuel = input.fuelCost || 0;
    const totalCost = safeAdd(baseCost, maintenance, fuel);
    return { baseCost, totalCost };
  },

  additional: (amount: number): number => {
    return amount;
  },

  risk: (impact: number, probabilityWeight: number): number => {
    return safeMult(impact, probabilityWeight);
  },
};

export const calculateCategoryTotal = {
  materials: (
    materials: { quantity: number; unit_price: number }[],
  ): number => {
    return materials.reduce(
      (sum, item) =>
        safeAdd(
          sum,
          calculateItemCost.material(item.quantity, item.unit_price),
        ),
      0,
    );
  },

  labor: (
    laborItems: {
      number_of_workers: number;
      daily_rate: number;
      total_days: number;
    }[],
  ): number => {
    return laborItems.reduce(
      (sum, item) =>
        safeAdd(
          sum,
          calculateItemCost.labor(
            item.number_of_workers,
            item.daily_rate,
            item.total_days,
          ),
        ),
      0,
    );
  },

  equipment: (
    equipmentItems: {
      quantity: number;
      cost_per_period: number;
      usage_duration: number;
      maintenance_cost?: number | null;
      fuel_cost?: number | null;
    }[],
  ): number => {
    return equipmentItems.reduce(
      (sum, item) =>
        safeAdd(
          sum,
          calculateItemCost.equipment({
            quantity: item.quantity,
            costPerPeriod: item.cost_per_period,
            usageDuration: item.usage_duration,
            maintenanceCost: item.maintenance_cost,
            fuelCost: item.fuel_cost,
          }).totalCost,
        ),
      0,
    );
  },

  additional: (costs: { amount: number }[]): number => {
    return costs.reduce((sum, item) => safeAdd(sum, item.amount), 0);
  },

  risks: (risks: { contingency_amount: number }[]): number => {
    return risks.reduce((sum, r) => safeAdd(sum, r.contingency_amount), 0);
  },
};

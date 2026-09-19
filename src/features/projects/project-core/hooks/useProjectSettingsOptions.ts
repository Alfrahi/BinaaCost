import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";

export function useProjectSettingsOptions() {
  const { options: materialUnits, isLoading: isLoadingMaterialUnits } =
    useSettingsOptions("material_unit");
  const { options: rentalOptions, isLoading: isLoadingRentalOptions } =
    useSettingsOptions("equipment_rental_purchase");
  const { options: periodUnits, isLoading: isLoadingPeriodUnits } =
    useSettingsOptions("equipment_period_unit");
  const {
    options: additionalCategories,
    isLoading: isLoadingAdditionalCategories,
  } = useSettingsOptions("additional_cost_category");
  const { options: riskProbabilities, isLoading: isLoadingRiskProbabilities } =
    useSettingsOptions("risk_probability");
  const { options: durationUnits, isLoading: isLoadingDurationUnits } = 
    useSettingsOptions("duration_unit");

  const isLoading = 
    isLoadingMaterialUnits || 
    isLoadingRentalOptions || 
    isLoadingPeriodUnits || 
    isLoadingAdditionalCategories || 
    isLoadingRiskProbabilities ||
    isLoadingDurationUnits;

  return {
    materialUnits,
    isLoadingMaterialUnits,
    rentalOptions,
    isLoadingRentalOptions,
    periodUnits,
    isLoadingPeriodUnits,
    additionalCategories,
    isLoadingAdditionalCategories,
    riskProbabilities,
    isLoadingRiskProbabilities,
    durationUnits,
    isLoadingDurationUnits,
    isLoading
  };
}

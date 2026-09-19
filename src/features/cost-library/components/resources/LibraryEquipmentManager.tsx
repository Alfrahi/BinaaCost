

import { useTranslation } from "react-i18next";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { z } from "zod";
import { LibraryResourceManager } from "./LibraryResourceManager";
import { DataTableColumn } from "@/shared/components/ui/data-table";

const libraryEquipmentSchema = z.object({
  name: z.string().min(1, "resources:equipment.nameRequired"),
  type: z.string().optional().nullable(),
  rental_or_purchase: z
    .string()
    .min(1, "resources:equipment.rentalPurchaseRequired"),
  cost_per_period: z.coerce
    .number()
    .min(0, "resources:equipment.costNonNegative"),
  period_unit: z.string().min(1, "resources:equipment.periodUnitRequired"),
});

type LibraryEquipmentFormValues = z.infer<typeof libraryEquipmentSchema>;

export default function LibraryEquipmentManager() {
  const { t } = useTranslation(["resources", "common"]);
  const { options: rentalOptions, isLoading: isLoadingRentalOptions } =
    useSettingsOptions("equipment_rental_purchase");
  const { options: periodUnits, isLoading: isLoadingPeriodUnits } =
    useSettingsOptions("equipment_period_unit");

  const defaultValues: LibraryEquipmentFormValues = {
    name: "",
    type: "",
    rental_or_purchase: rentalOptions[0]?.value || "Rental",
    cost_per_period: 0,
    period_unit: periodUnits[0]?.value || "Day",
  };

  const formFields = [
    { name: "name", label: "resources:equipment.name", placeholder: "resources:equipment.namePlaceholder" },
    { name: "type", label: "resources:equipment.type", placeholder: "resources:equipment.typePlaceholder" },
    {
      name: "rental_or_purchase",
      label: "resources:equipment.rentalPurchase",
      type: "select" as const,
      options: rentalOptions,
      isLoading: isLoadingRentalOptions,
      placeholder: "resources:equipment.rentalPurchasePlaceholder",
    },
    {
      name: "cost_per_period",
      label: "resources:equipment.costPerPeriod",
      type: "number" as const,
      step: "0.01",
      min: 0,
      placeholder: "resources:equipment.costPlaceholder",
      formatLabel: (values: LibraryEquipmentFormValues) =>
        values.rental_or_purchase === "Purchase"
          ? t("resources:equipment.purchaseCost")
          : t("resources:equipment.costPerPeriod"),
    },
    {
      name: "period_unit",
      label: "resources:equipment.periodUnit",
      type: "select" as const,
      options: periodUnits,
      isLoading: isLoadingPeriodUnits,
      placeholder: "resources:equipment.periodUnitPlaceholder",
      conditional: (values: LibraryEquipmentFormValues) => values.rental_or_purchase !== "Purchase",
    },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: "name", label: t("resources:equipment.name") },
    { key: "type", label: t("resources:equipment.type") },
    {
      key: "rental_or_purchase",
      label: t("resources:equipment.rentalPurchase"),
    },
    {
      key: "cost_per_period",
      label: `${t("resources:equipment.costPerPeriod")} (USD)`,
      align: "end",
      isCurrency: true,
    },
    { key: "period_unit", label: t("resources:equipment.periodUnit") },
    { key: "actions", label: t("common:actions"), align: "end" },
  ];

  return (
    <LibraryResourceManager
      tableName="library_equipment"
      queryKey={["library_equipment"]}
      titleKey="resources:equipment"
      itemLabelKey="resources:equipment.equipment"
      schema={libraryEquipmentSchema}
      defaultValues={defaultValues}
      formFields={formFields}
      columns={columns}
      selectAllLabelKey="common:selectAllEquipment"
      getItemName={(item) => item.name || "Unnamed Equipment"}
      getDuplicateName={(item, copyLabel) => ({
        name: `${item.name || "Unnamed Equipment"} (${copyLabel})`,
        type: item.type,
        rental_or_purchase: item.rental_or_purchase,
        cost_per_period: item.cost_per_period,
        period_unit: item.period_unit,
      })}
    />
  );
}
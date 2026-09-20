

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { calculateItemCost } from "@/shared/logic/shared";
import { EquipmentRow } from "./EquipmentRow";
import { EquipmentForm } from "./EquipmentForm";
import { equipmentSchema, EquipmentFormValues } from "@/features/projects/project-costs/types/schemas";
import { EquipmentItem } from "@/features/projects/project-costs/types/items";
import { useProjectEquipment } from "@/features/projects/project-costs/hooks/useProjectEquipment";
import { EntityTable, EntityTableConfig } from "./EntityTable";

export function EquipmentTable({
  projectId,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
  locationFactor = 1,
  locationLabel,
}: {
  projectId: string;
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: EquipmentItem, itemType: string) => void;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
  locationFactor?: number;
  locationLabel?: string;
}) {
  const { t } = useTranslation([
    "project_equipment",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const crud = useProjectEquipment(projectId);
  const { data: equipment = [] } = crud;

  const config = useMemo<EntityTableConfig<EquipmentItem>>(
    () => ({
      title: t("title"),
      addLabel: t("add"),
      itemType: "equipment",
      columns: [
        {
          key: "name",
          label: t("columns.name"),
          align: "start",
          minWidth: "150px",
        },
        {
          key: "type",
          label: t("columns.type"),
          align: "start",
          minWidth: "100px",
        },
        {
          key: "rental_or_purchase",
          label: t("columns.rentalPurchase"),
          align: "start",
          minWidth: "120px",
          format: (value: string) =>
            rentalOptions.find((opt) => opt.value === value)?.label || value,
        },
        {
          key: "quantity",
          label: t("columns.quantity"),
          align: "end",
          minWidth: "100px",
        },
        {
          key: "cost_per_period",
          label: t("columns.costPerPeriod"),
          align: "end",
          isCurrency: true,
          minWidth: "120px",
          format: (value: number) =>
            format(value, currency) +
            (value &&
              `/${t(
                periodUnits.find((u) => u.value === "day")?.value || "day",
                { defaultValue: "day" },
              )}`),
        },
        {
          key: "period_unit",
          label: t("columns.periodUnit"),
          align: "start",
          minWidth: "100px",
          format: (value: string) =>
            periodUnits.find((u) => u.value === value)?.label || value,
        },
        {
          key: "usage_duration",
          label: t("columns.usageDuration"),
          align: "end",
          minWidth: "100px",
        },
        {
          key: "maintenance_cost",
          label: t("columns.maintenance"),
          align: "end",
          isCurrency: true,
          minWidth: "100px",
          format: (value: number) => format(value, currency),
        },
        {
          key: "fuel_cost",
          label: t("columns.fuel"),
          align: "end",
          isCurrency: true,
          minWidth: "100px",
          format: (value: number) => format(value, currency),
        },
        {
          key: "total",
          label: t("columns.estTotalCost"),
          align: "end",
          minWidth: "120px",
          format: (_, row: EquipmentItem) =>
            format(
              calculateItemCost.equipment({
                quantity: row.quantity,
                costPerPeriod: row.cost_per_period,
                usageDuration: row.usage_duration,
                maintenanceCost: row.maintenance_cost,
                fuelCost: row.fuel_cost,
                rentalOrPurchase: row.rental_or_purchase,
              }).totalCost * locationFactor,
              currency,
            ),
          sortValue: (row) =>
            calculateItemCost.equipment({
              quantity: row.quantity,
              costPerPeriod: row.cost_per_period,
              usageDuration: row.usage_duration,
              maintenanceCost: row.maintenance_cost,
              fuelCost: row.fuel_cost,
              rentalOrPurchase: row.rental_or_purchase,
            }).totalCost * locationFactor,
        },
        {
          key: "actions",
          label: t("common:actions"),
          align: "end",
          minWidth: "120px",
        },
      ],
      getSearchText: (row) => `${row.name} ${row.type || ""}`,
      ariaLabel: t("project_equipment:tableLabel"),
      selectAllLabel: t("common:selectAllEquipment"),
      emptyMessage: t("noItems"),
      grandTotalLabel: t("columns.grandTotal"),
      calculateTotal: (item) =>
        calculateItemCost.equipment({
          quantity: item.quantity,
          costPerPeriod: item.cost_per_period,
          usageDuration: item.usage_duration,
          maintenanceCost: item.maintenance_cost,
          fuelCost: item.fuel_cost,
          rentalOrPurchase: item.rental_or_purchase,
        }).totalCost * locationFactor,
      getDeleteName: (item) => item.name,
      quickAdd: {
        fields: [
          {
            key: "name",
            label: t("columns.name"),
            placeholder: t("columns.namePlaceholder"),
          },
          {
            key: "type",
            label: t("columns.type"),
            placeholder: t("columns.typePlaceholder"),
          },
          {
            key: "rental_or_purchase",
            label: t("columns.rentalPurchase"),
            type: "select",
            options: rentalOptions,
            placeholder: t("columns.rentalPurchasePlaceholder"),
          },
          {
            key: "quantity",
            label: t("columns.quantity"),
            type: "number",
            placeholder: t("columns.quantityPlaceholder"),
          },
          {
            key: "cost_per_period",
            label: `${t("columns.costPerPeriod")} (${currency})`,
            formatLabel: (values: Record<string, any>) =>
              values.rental_or_purchase?.toLowerCase() === "purchase"
                ? `${t("columns.purchaseCost")} (${currency})`
                : `${t("columns.costPerPeriod")} (${currency})`,
            type: "number",
            placeholder: t("columns.costPerPeriodPlaceholder"),
          },
          {
            key: "period_unit",
            label: t("columns.periodUnit"),
            type: "select",
            options: periodUnits,
            placeholder: t("columns.periodUnitPlaceholder"),
            conditional: (values: Record<string, any>) =>
              values.rental_or_purchase?.toLowerCase() !== "purchase",
          },
          {
            key: "usage_duration",
            label: t("columns.usageDuration"),
            type: "number",
            placeholder: t("columns.usageDurationPlaceholder"),
            conditional: (values: Record<string, any>) =>
              values.rental_or_purchase?.toLowerCase() !== "purchase",
          },
          {
            key: "maintenance_cost",
            label: t("columns.maintenance"),
            type: "number",
            placeholder: t("columns.maintenancePlaceholder"),
          },
          {
            key: "fuel_cost",
            label: t("columns.fuel"),
            type: "number",
            placeholder: t("columns.fuelPlaceholder"),
          },
        ],
        schema: equipmentSchema,
        buildValues: (raw) => {
          const isPurchase = raw.rental_or_purchase?.toLowerCase() === "purchase";
          return {
            name: raw.name,
            type: raw.type,
            rental_or_purchase: raw.rental_or_purchase,
            quantity: Number(raw.quantity),
            cost_per_period: Number(raw.cost_per_period),
            period_unit: isPurchase ? (raw.period_unit || "Day") : raw.period_unit,
            usage_duration: isPurchase ? 1 : Number(raw.usage_duration),
            maintenance_cost: Number(raw.maintenance_cost || 0),
            fuel_cost: Number(raw.fuel_cost || 0),
            group_id: "ungrouped",
          };
        },
      },
      assemblyImport: {
        itemTypes: ["equipment"],
        onImport: {
          equipment: async (items) => {
            for (const item of items) {
              const details = item.details as {
                type?: string | null;
                rental_or_purchase?: string;
                usage_duration?: number;
                maintenance_cost?: number | null;
                fuel_cost?: number | null;
              } | null;
              await crud.handleAddOrUpdate(
                {
                  name: item.description,
                  type: details?.type || undefined,
                  rental_or_purchase:
                    details?.rental_or_purchase || "Rental",
                  quantity: item.quantity,
                  cost_per_period: item.unit_price,
                  period_unit: item.unit || "Day",
                  usage_duration: details?.usage_duration ?? 1,
                  maintenance_cost: details?.maintenance_cost ?? 0,
                  fuel_cost: details?.fuel_cost ?? 0,
                  group_id: "ungrouped",
                },
                currency,
              );
            }
          },
        },
      },
      costDatabaseImport: {
        onImport: async (item, quantity, groupId) => {
          await crud.handleAddOrUpdate(
            {
              name: item.description,
              type: item.csi_code || undefined,
              rental_or_purchase: "Rental",
              quantity: 1,
              cost_per_period: item.unit_price,
              period_unit: item.unit || "Day",
              usage_duration: quantity,
              maintenance_cost: 0,
              fuel_cost: 0,
              group_id: groupId || "ungrouped",
            },
            currency,
          );
        },
      },
      csvImport: {
        itemType: "equipment",
        onImport: (values) =>
          crud.handleAddOrUpdate(values as EquipmentFormValues, currency),
      },
      renderForm: ({
        editingItem,
        onSubmit,
        onCancel,
        isSubmitting,
        groups,
        currency: formCurrency,
      }) => (
        <EquipmentForm
          defaultValues={
            editingItem
              ? {
                  name: editingItem.name,
                  rental_or_purchase: editingItem.rental_or_purchase,
                  quantity: editingItem.quantity,
                  cost_per_period: editingItem.cost_per_period,
                  period_unit: editingItem.period_unit,
                  usage_duration: editingItem.usage_duration,
                  maintenance_cost: editingItem.maintenance_cost ?? undefined,
                  fuel_cost: editingItem.fuel_cost ?? undefined,
                  type: editingItem.type || undefined,
                  group_id: editingItem.group_id || "ungrouped",
                }
              : undefined
          }
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          groups={groups}
          currency={formCurrency}
          rentalOptions={rentalOptions}
          isLoadingRentalOptions={isLoadingRentalOptions}
          periodUnits={periodUnits}
          isLoadingPeriodUnits={isLoadingPeriodUnits}
        />
      ),
      renderRow: (item, rowProps) => (
        <EquipmentRow
          item={item}
          currency={rowProps.currency}
          isOwner={rowProps.canEdit}
          onEdit={rowProps.onEdit}
          onDelete={rowProps.onDelete}
          onDuplicate={rowProps.onDuplicate}
          onComment={rowProps.onComment}
          onUpdateField={rowProps.onUpdateField}
          selected={rowProps.selected}
          onToggle={rowProps.onToggle}
          rentalOptions={rentalOptions}
          periodUnits={periodUnits}
          locationFactor={rowProps.locationFactor}
          locationLabel={rowProps.locationLabel}
        />
      ),
      getMobileName: (item) => item.name,
      getMobileSubtitle: (item) =>
        item.rental_or_purchase?.toLowerCase() === "purchase"
          ? `${item.quantity} × ${format(item.cost_per_period, currency)}`
          : `${item.quantity} × ${format(item.cost_per_period, currency)}/${t(
              periodUnits.find((u) => u.value === item.period_unit)?.value || item.period_unit || "day",
              { defaultValue: item.period_unit || "day" },
            )} × ${item.usage_duration}`,
      getMobileTotal: (item) => format(item.total_cost || 0, currency),
    }),
    [
      t,
      currency,
      format,
      rentalOptions,
      periodUnits,
      isLoadingRentalOptions,
      isLoadingPeriodUnits,
      locationFactor,
      crud,
    ],
  );

  return (
    <EntityTable
      items={equipment}
      groups={groups}
      canEdit={canEdit}
      currency={currency}
      onOpenComments={onOpenComments}
      locationFactor={locationFactor}
      locationLabel={locationLabel}
      crud={crud}
      config={config}
    />
  );
}
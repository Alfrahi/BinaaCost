"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { calculateItemCost } from "@/shared/logic/shared";
import { MaterialRow } from "./MaterialRow";
import { MaterialForm } from "./MaterialForm";
import { materialSchema, MaterialFormValues } from "@/features/projects/project-costs/types/schemas";
import { MaterialItem } from "@/features/projects/project-costs/types/items";
import { useProjectMaterials } from "@/features/projects/project-costs/hooks/useProjectMaterials";
import { EntityTable, EntityTableConfig } from "./EntityTable";

export function MaterialsTable({
  projectId,
  materials,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  materialUnits,
  isLoadingMaterialUnits,
  locationFactor = 1,
  locationLabel,
}: {
  projectId: string;
  materials: MaterialItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: MaterialItem, itemType: string) => void;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
  locationFactor?: number;
  locationLabel?: string;
}) {
  const { t } = useTranslation([
    "project_materials",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const crud = useProjectMaterials(projectId);

  const config = useMemo<EntityTableConfig<MaterialItem>>(
    () => ({
      title: t("title"),
      addLabel: t("add"),
      itemType: "material",
      columns: [
        {
          key: "name",
          label: t("columns.name"),
          align: "start",
          minWidth: "150px",
        },
        {
          key: "description",
          label: t("columns.description"),
          align: "start",
          minWidth: "200px",
        },
        {
          key: "quantity",
          label: t("columns.quantity"),
          align: "end",
          minWidth: "100px",
        },
        {
          key: "unit",
          label: t("columns.unit"),
          align: "start",
          minWidth: "80px",
          format: (value: string) =>
            materialUnits.find((u) => u.value === value)?.label || value,
        },
        {
          key: "unit_price",
          label: t("columns.unitPrice"),
          align: "end",
          isCurrency: true,
          minWidth: "120px",
          format: (value: number) => format(value, currency),
        },
        {
          key: "total",
          label: t("columns.estTotalCost"),
          align: "end",
          minWidth: "120px",
          format: (_, row: MaterialItem) =>
            format(
              calculateItemCost.material(row.quantity, row.unit_price) *
                locationFactor,
              currency,
            ),
          sortValue: (row) =>
            calculateItemCost.material(row.quantity, row.unit_price) *
            locationFactor,
        },
      ],
      getSearchText: (row) => `${row.name} ${row.description || ""}`,
      ariaLabel: t("project_materials:tableLabel"),
      selectAllLabel: t("common:selectAllMaterials"),
      emptyMessage: t("noItems"),
      grandTotalLabel: t("columns.grandTotal"),
      calculateTotal: (item) =>
        calculateItemCost.material(item.quantity, item.unit_price) *
        locationFactor,
      getDeleteName: (item) => item.name,
      quickAdd: {
        fields: [
          {
            key: "name",
            label: t("columns.name"),
            placeholder: t("columns.namePlaceholder"),
          },
          {
            key: "quantity",
            label: t("columns.quantity"),
            type: "number",
            placeholder: t("columns.quantityPlaceholder"),
          },
          {
            key: "unit_price",
            label: `${t("columns.unitPrice")} (${currency})`,
            type: "number",
            placeholder: t("columns.unitPricePlaceholder"),
          },
        ],
        schema: materialSchema,
        buildValues: (raw) => ({
          name: raw.name,
          quantity: Number(raw.quantity),
          unit: materialUnits[0]?.value || "",
          unit_price: Number(raw.unit_price),
          group_id: "ungrouped",
        }),
      },
      assemblyImport: {
        itemTypes: ["material"],
        onImport: {
          materials: async (items) => {
            for (const item of items) {
              await crud.handleAddOrUpdate(
                {
                  name: item.description,
                  description: "",
                  quantity: item.quantity,
                  unit: item.unit || "unit",
                  unit_price: item.unit_price,
                  group_id: "ungrouped",
                },
                currency,
              );
            }
          },
        },
      },
      csvImport: {
        itemType: "materials",
        onImport: (values) =>
          crud.handleAddOrUpdate(values as MaterialFormValues, currency),
      },
      renderForm: ({
        editingItem,
        onSubmit,
        onCancel,
        isSubmitting,
        groups,
        currency: formCurrency,
      }) => (
        <MaterialForm
          defaultValues={
            editingItem
              ? {
                  name: editingItem.name,
                  description: editingItem.description || undefined,
                  quantity: editingItem.quantity,
                  unit: editingItem.unit,
                  unit_price: editingItem.unit_price,
                  group_id: editingItem.group_id || "ungrouped",
                }
              : undefined
          }
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          groups={groups}
          currency={formCurrency}
          materialUnits={materialUnits}
          isLoadingMaterialUnits={isLoadingMaterialUnits}
        />
      ),
      renderRow: (item, rowProps) => (
        <MaterialRow
          item={item}
          materialUnits={materialUnits}
          currency={rowProps.currency}
          isOwner={rowProps.canEdit}
          onEdit={rowProps.onEdit}
          onDelete={rowProps.onDelete}
          onDuplicate={rowProps.onDuplicate}
          onComment={rowProps.onComment}
          onUpdateField={rowProps.onUpdateField}
          selected={rowProps.selected}
          onToggle={rowProps.onToggle}
          locationFactor={rowProps.locationFactor}
          locationLabel={rowProps.locationLabel}
        />
      ),
      getMobileName: (item) => item.name,
      getMobileSubtitle: (item) =>
        `${item.quantity} × ${format(item.unit_price, currency)}`,
      getMobileTotal: (item) =>
        format(
          calculateItemCost.material(item.quantity, item.unit_price),
          currency,
        ),
    }),
    [t, currency, format, materialUnits, isLoadingMaterialUnits, locationFactor, crud],
  );

  return (
    <EntityTable
      items={materials}
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
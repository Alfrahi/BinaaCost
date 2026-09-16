"use client";

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import { AdditionalCostRow } from "./AdditionalCostRow";
import { AdditionalCostForm } from "./AdditionalCostForm";
import {
  AdditionalCostFormValues,
  additionalCostSchema,
} from "@/types/schemas";
import { AdditionalCostItem } from "@/types/project-items";
import { useProjectAdditionalCosts } from "@/hooks/useProjectAdditionalCosts";
import { EntityTable, EntityTableConfig } from "./EntityTable";

export function AdditionalCostsTable({
  projectId,
  additionalCosts,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  additionalCategories,
  isLoadingAdditionalCategories,
  locationFactor = 1,
}: {
  projectId: string;
  additionalCosts: AdditionalCostItem[];
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: AdditionalCostItem, itemType: string) => void;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
  locationFactor?: number;
}) {
  const { t } = useTranslation([
    "project_additional",
    "project_detail",
    "common",
  ]);
  const { format } = useCurrencyFormatter();
  const crud = useProjectAdditionalCosts(projectId);

  const categoryLabel = useCallback(
    (value: string) =>
      additionalCategories.find((c) => c.value === value)?.label || value,
    [additionalCategories],
  );

  const config = useMemo<EntityTableConfig<AdditionalCostItem>>(
    () => ({
      title: t("title"),
      addLabel: t("add"),
      itemType: "additional",
      columns: [
        {
          key: "category",
          label: t("columns.category"),
          align: "start",
          minWidth: "150px",
          format: (value: string) => categoryLabel(value),
        },
        {
          key: "description",
          label: t("columns.description"),
          align: "start",
          minWidth: "200px",
        },
        {
          key: "amount",
          label: t("columns.amount"),
          align: "end",
          isCurrency: true,
          minWidth: "120px",
          format: (value: number) => format(value * locationFactor, currency),
          sortValue: (row) => row.amount * locationFactor,
        },
      ],
      getSearchText: (row) => `${row.description || ""} ${row.category || ""}`,
      ariaLabel: t("project_additional:tableLabel"),
      selectAllLabel: t("common:selectAllAdditional"),
      emptyMessage: t("noItems"),
      grandTotalLabel: t("columns.grandTotal"),
      calculateTotal: (item) => item.amount * locationFactor,
      getDeleteName: (item) => categoryLabel(item.category),
      quickAdd: {
        fields: [
          {
            key: "category",
            label: t("columns.category"),
            type: "select",
            options: additionalCategories,
            placeholder: t("columns.categoryPlaceholder"),
          },
          {
            key: "description",
            label: t("columns.description"),
            placeholder: t("columns.descriptionPlaceholder"),
          },
          {
            key: "amount",
            label: `${t("columns.amount")} (${currency})`,
            type: "number",
            placeholder: t("columns.amountPlaceholder"),
          },
        ],
        schema: additionalCostSchema,
        buildValues: (raw) => ({
          category: raw.category,
          description: raw.description,
          amount: Number(raw.amount),
          group_id: "ungrouped",
        }),
      },
      assemblyImport: {
        itemTypes: ["additional"],
        onImport: {
          additional: async (items) => {
            for (const item of items) {
              const details = item.details as { category: string } | null;
              await crud.handleAddOrUpdate({
                category: details?.category || "Miscellaneous",
                description: item.description,
                amount: item.unit_price,
                group_id: "ungrouped",
              });
            }
          },
        },
      },
      csvImport: {
        itemType: "additional",
        onImport: (values) =>
          crud.handleAddOrUpdate(values as AdditionalCostFormValues),
      },
      renderForm: ({
        editingItem,
        onSubmit,
        onCancel,
        isSubmitting,
        groups,
        currency: formCurrency,
      }) => (
        <AdditionalCostForm
          editingItem={editingItem ?? undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          groups={groups}
          currency={formCurrency}
          additionalCategories={additionalCategories}
          isLoadingAdditionalCategories={isLoadingAdditionalCategories}
        />
      ),
      renderRow: (item, rowProps) => (
        <AdditionalCostRow
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
          additionalCategories={additionalCategories}
        />
      ),
      getMobileName: (item) => categoryLabel(item.category),
      getMobileSubtitle: (item) =>
        item.description || t("common:notSpecified"),
      getMobileTotal: (item) => format(item.amount, currency),
    }),
    [
      t,
      currency,
      format,
      additionalCategories,
      isLoadingAdditionalCategories,
      locationFactor,
      categoryLabel,
      crud,
    ],
  );

  return (
    <EntityTable
      items={additionalCosts}
      groups={groups}
      canEdit={canEdit}
      currency={currency}
      onOpenComments={onOpenComments}
      locationFactor={locationFactor}
      crud={crud}
      config={config}
    />
  );
}
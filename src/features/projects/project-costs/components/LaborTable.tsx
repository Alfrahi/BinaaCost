

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import { LaborRow } from "./LaborRow";
import { LaborForm } from "./LaborForm";
import { laborSchema, LaborFormValues } from "@/features/projects/project-costs/types/schemas";
import { LaborItem } from "@/features/projects/project-costs/types/items";
import { useProjectLabor } from "@/features/projects/project-costs/hooks/useProjectLabor";
import { EntityTable, EntityTableConfig } from "./EntityTable";
import { calculateItemCost } from "@/shared/logic/shared";

export function LaborTable({
  projectId,
  groups = [],
  canEdit,
  currency,
  onOpenComments,
  locationFactor = 1,
  locationLabel,
}: {
  projectId: string;
  groups?: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: LaborItem, itemType: string) => void;
  locationFactor?: number;
  locationLabel?: string;
}) {
  const { t } = useTranslation(["project_labor", "project_detail", "common"]);
  const { format } = useCurrencyFormatter();
  const crud = useProjectLabor(projectId);
  const { data: labor = [] } = crud;

  const config = useMemo<EntityTableConfig<LaborItem>>(
    () => ({
      title: t("title"),
      addLabel: t("add"),
      itemType: "labor",
      columns: [
        {
          key: "worker_type",
          label: t("columns.workerType"),
          align: "start",
          minWidth: "150px",
        },
        {
          key: "number_of_workers",
          label: t("columns.numWorkers"),
          align: "end",
          minWidth: "100px",
        },
        {
          key: "daily_rate",
          label: t("columns.dailyRate"),
          align: "end",
          isCurrency: true,
          minWidth: "120px",
          format: (value: number) => format(value, currency),
        },
        {
          key: "total_days",
          label: t("columns.totalDays"),
          align: "end",
          minWidth: "100px",
        },
        {
          key: "total",
          label: t("columns.estTotalCost"),
          align: "end",
          minWidth: "120px",
          format: (_, row: LaborItem) =>
            format(
              calculateItemCost.labor(
                row.number_of_workers,
                row.daily_rate,
                row.total_days,
              ) * locationFactor,
              currency,
            ),
          sortValue: (row) =>
            calculateItemCost.labor(
              row.number_of_workers,
              row.daily_rate,
              row.total_days,
            ) * locationFactor,
        },
        {
          key: "actions",
          label: t("common:actions"),
          align: "end",
          minWidth: "120px",
        },
      ],
      getSearchText: (row) => `${row.worker_type} ${row.description || ""}`,
      ariaLabel: t("project_labor:tableLabel"),
      selectAllLabel: t("common:selectAllLabor"),
      emptyMessage: t("noItems"),
      grandTotalLabel: t("columns.grandTotal"),
      calculateTotal: (item) =>
        calculateItemCost.labor(
          item.number_of_workers,
          item.daily_rate,
          item.total_days,
        ) * locationFactor,
      getDeleteName: (item) => item.worker_type,
      quickAdd: {
        fields: [
          {
            key: "worker_type",
            label: t("columns.workerType"),
            placeholder: t("columns.workerTypePlaceholder"),
          },
          {
            key: "number_of_workers",
            label: t("columns.numWorkers"),
            type: "number",
            placeholder: t("columns.numWorkersPlaceholder"),
          },
          {
            key: "daily_rate",
            label: `${t("columns.dailyRate")} (${currency})`,
            type: "number",
            placeholder: t("columns.dailyRatePlaceholder"),
          },
          {
            key: "total_days",
            label: t("columns.totalDays"),
            type: "number",
            placeholder: t("columns.totalDaysPlaceholder"),
          },
        ],
        schema: laborSchema,
        buildValues: (raw) => ({
          worker_type: raw.worker_type,
          number_of_workers: Number(raw.number_of_workers),
          daily_rate: Number(raw.daily_rate),
          total_days: Number(raw.total_days),
          group_id: "ungrouped",
        }),
      },
      assemblyImport: {
        itemTypes: ["labor"],
        onImport: {
          labor: async (items) => {
            for (const item of items) {
              const details = item.details as { total_days: number } | null;
              await crud.handleAddOrUpdate(
                {
                  worker_type: item.description,
                  number_of_workers: item.quantity,
                  daily_rate: item.unit_price,
                  total_days: details?.total_days ?? 1,
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
              worker_type: item.description,
              number_of_workers: 1,
              daily_rate: item.unit_price,
              total_days: quantity,
              description: item.csi_code ? `[${item.csi_code}] ${item.description}` : undefined,
              group_id: groupId || "ungrouped",
            },
            currency,
          );
        },
      },
      csvImport: {
        itemType: "labor",
        onImport: (values) =>
          crud.handleAddOrUpdate(values as LaborFormValues, currency),
      },
      renderForm: ({
        editingItem,
        onSubmit,
        onCancel,
        isSubmitting,
        groups,
        currency: formCurrency,
      }) => (
        <LaborForm
          defaultValues={
            editingItem
              ? {
                  worker_type: editingItem.worker_type,
                  number_of_workers: editingItem.number_of_workers,
                  daily_rate: editingItem.daily_rate,
                  total_days: editingItem.total_days,
                  description: editingItem.description || undefined,
                  group_id: editingItem.group_id || "ungrouped",
                }
              : undefined
          }
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          groups={groups}
          currency={formCurrency}
        />
      ),
      renderRow: (item, rowProps) => (
        <LaborRow
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
          locationFactor={rowProps.locationFactor}
          locationLabel={rowProps.locationLabel}
        />
      ),
      getMobileName: (item) => item.worker_type,
      getMobileSubtitle: (item) =>
        `${item.number_of_workers} × ${format(item.daily_rate, currency)} × ${item.total_days}`,
      getMobileTotal: (item) => format(item.total_cost || 0, currency),
    }),
    [t, currency, format, locationFactor, crud],
  );

  return (
    <EntityTable
      items={labor}
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
"use client";

import { useTranslation } from "react-i18next";
import { z } from "zod";
import { LibraryResourceManager } from "./LibraryResourceManager";
import { DataTableColumn } from "@/shared/components/ui/data-table";

const laborSchema = z.object({
  worker_type: z.string().min(1, "resources:fields.workerTypeRequired"),
  daily_rate: z.coerce.number().min(0, "resources:fields.dailyRateNonNegative"),
});

type LaborFormValues = z.infer<typeof laborSchema>;

export default function LibraryLaborManager() {
  const { t } = useTranslation(["resources", "common"]);

  const defaultValues: LaborFormValues = {
    worker_type: "",
    daily_rate: 0,
  };

  const formFields = [
    { name: "worker_type", label: "resources:fields.workerType", placeholder: "resources:fields.workerTypePlaceholder" },
    {
      name: "daily_rate",
      label: "resources:fields.dailyRate",
      type: "number" as const,
      step: "0.01",
      min: 0,
      placeholder: "resources:fields.dailyRatePlaceholder",
    },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: "worker_type", label: t("resources:fields.workerType") },
    {
      key: "daily_rate",
      label: `${t("resources:fields.dailyRate")} (USD)`,
      align: "end",
      isCurrency: true,
    },
    { key: "actions", label: t("common:actions"), align: "end" },
  ];

  return (
    <LibraryResourceManager
      tableName="library_labor"
      queryKey={["library_labor"]}
      titleKey="resources:labor"
      itemLabelKey="resources:labor.laborItem"
      schema={laborSchema}
      defaultValues={defaultValues}
      formFields={formFields}
      columns={columns}
      selectAllLabelKey="common:selectAllLabor"
      getItemName={(item) => item.worker_type || "Unnamed Labor"}
      getDuplicateName={(item, copyLabel) => ({
        worker_type: `${item.worker_type || "Unnamed Labor"} (${copyLabel})`,
        daily_rate: item.daily_rate,
      })}
    />
  );
}
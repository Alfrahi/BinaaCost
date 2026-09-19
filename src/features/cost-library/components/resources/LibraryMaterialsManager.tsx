

import { useTranslation } from "react-i18next";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { z } from "zod";
import { LibraryResourceManager } from "./LibraryResourceManager";
import { DataTableColumn } from "@/shared/components/ui/data-table";

const libraryMaterialSchema = z.object({
  name: z.string().min(1, "resources:materials.nameRequired"),
  description: z.string().optional().nullable(),
  unit: z.string().min(1, "resources:materials.unitRequired"),
  unit_price: z.coerce.number().min(0, "resources:materials.priceNonNegative"),
});

type LibraryMaterialFormValues = z.infer<typeof libraryMaterialSchema>;

export default function LibraryMaterialsManager() {
  const { t } = useTranslation(["resources", "common"]);
  const { options: materialUnits, isLoading: isLoadingMaterialUnits } =
    useSettingsOptions("material_unit");

  const defaultValues: LibraryMaterialFormValues = {
    name: "",
    description: "",
    unit: materialUnits[0]?.value || "",
    unit_price: 0,
  };

  const formFields = [
    { name: "name", label: "resources:materials.name", placeholder: "resources:materials.namePlaceholder" },
    { name: "description", label: "common:description", placeholder: "common:columns.descriptionPlaceholder" },
    {
      name: "unit",
      label: "resources:materials.unit",
      type: "select" as const,
      options: materialUnits,
      isLoading: isLoadingMaterialUnits,
      placeholder: "resources:materials.unitPlaceholder",
    },
    {
      name: "unit_price",
      label: "resources:materials.unitPrice",
      type: "number" as const,
      step: "0.01",
      min: 0,
      placeholder: "resources:materials.pricePlaceholder",
    },
  ];

  const columns: DataTableColumn<any>[] = [
    { key: "name", label: t("resources:materials.name") },
    { key: "description", label: t("common:description") },
    { key: "unit", label: t("resources:materials.unit") },
    {
      key: "unit_price",
      label: `${t("resources:materials.unitPrice")} (USD)`,
      align: "end",
      isCurrency: true,
    },
    { key: "actions", label: t("common:actions"), align: "end" },
  ];

  return (
    <LibraryResourceManager
      tableName="library_materials"
      queryKey={["library_materials"]}
      titleKey="resources:materials"
      itemLabelKey="resources:materials.material"
      schema={libraryMaterialSchema}
      defaultValues={defaultValues}
      formFields={formFields}
      columns={columns}
      selectAllLabelKey="common:selectAllMaterials"
      getItemName={(item) => item.name || "Unnamed Material"}
      getDuplicateName={(item, copyLabel) => ({
        name: `${item.name || "Unnamed Material"} (${copyLabel})`,
        description: item.description,
        unit: item.unit,
        unit_price: item.unit_price,
      })}
    />
  );
}
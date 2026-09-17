import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  AssemblyItem,
  AssemblyLaborDetails,
  AssemblyEquipmentDetails,
  AssemblyAdditionalCostDetails,
} from "@/features/cost-library/assemblies/types/assemblies";
import {
  AssemblyMaterialForm,
  AssemblyLaborForm,
  AssemblyEquipmentForm,
  AssemblyAdditionalCostForm,
  AssemblyMaterialFormValues,
  AssemblyLaborFormValues,
  AssemblyEquipmentFormValues,
  AssemblyAdditionalCostFormValues,
} from "@/features/cost-library/components/assemblies/index";
import { X } from "lucide-react";

const itemTypeSchema = z.object({
  item_type: z.enum(["material", "labor", "equipment", "additional"]),
});

type ItemTypeFormValues = z.infer<typeof itemTypeSchema>;

interface AssemblyItemFormProps {
  initialData?: AssemblyItem;
  initialType?: "material" | "labor" | "equipment" | "additional";
  onSubmit: (
    values: Omit<
      AssemblyItem,
      "id" | "user_id" | "created_at" | "updated_at" | "assembly_id"
    >,
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
}

export function AssemblyItemForm({
  initialData,
  initialType = "material",
  onSubmit,
  onCancel,
  isSubmitting,
  materialUnits,
  isLoadingMaterialUnits,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
  additionalCategories,
  isLoadingAdditionalCategories,
}: AssemblyItemFormProps) {
  const { t } = useTranslation(["common", "project_detail", "resources"]);

  const itemTypeForm = useForm<ItemTypeFormValues>({
    resolver: zodResolver(itemTypeSchema),
    defaultValues: {
      item_type: initialData?.item_type || initialType,
    },
  });

  const itemType = itemTypeForm.watch("item_type");

  const transformAndSubmit = useCallback(
    (subFormValues: any) => {
      const transformedItem: Omit<
        AssemblyItem,
        "id" | "user_id" | "created_at" | "updated_at" | "assembly_id"
      > = {
        item_type: itemType,
        description: subFormValues.description,
        quantity: subFormValues.quantity || 1,
        unit: subFormValues.unit || null,
        unit_price: subFormValues.unit_price || subFormValues.amount || 0,
        details: null,
      };

      switch (transformedItem.item_type) {
        case "material":
          break;
        case "labor":
          transformedItem.quantity = subFormValues.quantity;
          transformedItem.unit_price = subFormValues.unit_price;
          transformedItem.details = { total_days: subFormValues.total_days };
          break;
        case "equipment":
          transformedItem.unit = subFormValues.unit;
          transformedItem.unit_price = subFormValues.unit_price;
          transformedItem.details = {
            type: subFormValues.type,
            rental_or_purchase: subFormValues.rental_or_purchase,
            usage_duration: subFormValues.usage_duration,
            maintenance_cost: subFormValues.maintenance_cost,
            fuel_cost: subFormValues.fuel_cost,
          };
          break;
        case "additional":
          transformedItem.quantity = 1;
          transformedItem.unit = "each";
          transformedItem.unit_price = subFormValues.amount;
          transformedItem.details = { category: subFormValues.category };
          break;
      }
      onSubmit(transformedItem);
    },
    [itemType, onSubmit],
  );

  const getSubFormInitialData = useCallback(() => {
    if (!initialData) return {};

    switch (initialData.item_type) {
      case "material":
        return {
          description: initialData.description,
          quantity: initialData.quantity,
          unit: initialData.unit,
          unit_price: initialData.unit_price,
        } as Partial<AssemblyMaterialFormValues>;
      case "labor":
        return {
          description: initialData.description,
          quantity: initialData.quantity,
          unit_price: initialData.unit_price,
          total_days: (initialData.details as AssemblyLaborDetails)?.total_days,
        } as Partial<AssemblyLaborFormValues>;
      case "equipment":
        return {
          description: initialData.description,
          type: (initialData.details as AssemblyEquipmentDetails)?.type,
          rental_or_purchase: (initialData.details as AssemblyEquipmentDetails)
            ?.rental_or_purchase,
          quantity: initialData.quantity,
          unit_price: initialData.unit_price,
          unit: initialData.unit,
          usage_duration: (initialData.details as AssemblyEquipmentDetails)
            ?.usage_duration,
          maintenance_cost: (initialData.details as AssemblyEquipmentDetails)
            ?.maintenance_cost,
          fuel_cost: (initialData.details as AssemblyEquipmentDetails)
            ?.fuel_cost,
        } as Partial<AssemblyEquipmentFormValues>;
      case "additional":
        return {
          category: (initialData.details as AssemblyAdditionalCostDetails)
            ?.category,
          description: initialData.description,
          amount: initialData.unit_price,
        } as Partial<AssemblyAdditionalCostFormValues>;
      default:
        return {};
    }
  }, [initialData]);

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3 text-sm">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-lg">
          {initialData ? t("common:edit") : t("common:add")}{" "}
          {t("resources:assemblies.item")}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label={t("common:close")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="space-y-4">
        <Form {...itemTypeForm}>
          <FormField
            control={itemTypeForm.control}
            name="item_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("common:type")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!!initialData}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="material" className="text-sm">
                      {t("project_tabs:materials")}
                    </SelectItem>
                    <SelectItem value="labor" className="text-sm">
                      {t("project_tabs:labor")}
                    </SelectItem>
                    <SelectItem value="equipment" className="text-sm">
                      {t("project_tabs:equipment")}
                    </SelectItem>
                    <SelectItem value="additional" className="text-sm">
                      {t("project_tabs:additional")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
        </Form>

        {itemType === "material" && (
          <AssemblyMaterialForm
            initialData={
              getSubFormInitialData() as Partial<AssemblyMaterialFormValues>
            }
            onSubmit={transformAndSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            materialUnits={materialUnits}
            isLoadingMaterialUnits={isLoadingMaterialUnits}
          />
        )}
        {itemType === "labor" && (
          <AssemblyLaborForm
            initialData={
              getSubFormInitialData() as Partial<AssemblyLaborFormValues>
            }
            onSubmit={transformAndSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
          />
        )}
        {itemType === "equipment" && (
          <AssemblyEquipmentForm
            initialData={
              getSubFormInitialData() as Partial<AssemblyEquipmentFormValues>
            }
            onSubmit={transformAndSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            rentalOptions={rentalOptions}
            isLoadingRentalOptions={isLoadingRentalOptions}
            periodUnits={periodUnits}
            isLoadingPeriodUnits={isLoadingPeriodUnits}
          />
        )}
        {itemType === "additional" && (
          <AssemblyAdditionalCostForm
            initialData={
              getSubFormInitialData() as Partial<AssemblyAdditionalCostFormValues>
            }
            onSubmit={transformAndSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            additionalCategories={additionalCategories}
            isLoadingAdditionalCategories={isLoadingAdditionalCategories}
          />
        )}
      </div>
    </div>
  );
}

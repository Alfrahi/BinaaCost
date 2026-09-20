import { useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import {
  AssemblyEquipmentFormValues,
  assemblyEquipmentSchema,
} from "@/features/cost-library/assemblies/types/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { toast } from "sonner";

interface AssemblyEquipmentFormProps {
  initialData?: Partial<AssemblyEquipmentFormValues>;
  onSubmit: (values: AssemblyEquipmentFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
}

export function AssemblyEquipmentForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
}: AssemblyEquipmentFormProps) {
  const { t } = useTranslation(["project_equipment", "common"]);
  const { convert, getMissingRates } = useCurrencyConverter();

interface LibraryEquipmentItem {
  id: string;
  name: string;
  type?: string;
  rental_or_purchase?: string;
  cost_per_period?: number;
  period_unit: string;
}

  const { data: libraryItemsData } = useQuery({
    queryKey: ["library_equipment"],
    queryFn: async () =>
      mapRecords<LibraryEquipmentItem>(await pb.collection("library_equipment").getFullList()),
  });
  const libraryItems = useMemo(
    () => (Array.isArray(libraryItemsData) ? libraryItemsData : []),
    [libraryItemsData],
  );

  const form = useForm<AssemblyEquipmentFormValues>({
    resolver: zodResolver(assemblyEquipmentSchema),
    defaultValues: {
      description: "",
      type: "",
      rental_or_purchase: rentalOptions[0]?.value || "Rental",
      quantity: 1,
      unit_price: 0,
      unit: periodUnits[0]?.value || "Day",
      usage_duration: 1,
      maintenance_cost: 0,
      fuel_cost: 0,
      ...initialData,
    },
  });

  const rentalOrPurchase = form.watch("rental_or_purchase");
  const isPurchase = rentalOrPurchase?.toLowerCase() === "purchase";

  useEffect(() => {
    if (!form.getValues("rental_or_purchase") && rentalOptions.length > 0) {
      form.setValue("rental_or_purchase", rentalOptions[0].value);
    }
    if (!form.getValues("unit") && periodUnits.length > 0) {
      form.setValue("unit", periodUnits[0].value);
    }
  }, [rentalOptions, periodUnits, form]);

  const findAndApplyMatch = useCallback(
    (name: string, periodUnit: string) => {
      const match = libraryItems.find(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.period_unit.toLowerCase() === periodUnit.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("unit_price")) {
          const missing = getMissingRates("USD", "USD");
          if (missing.length > 0) {
            toast.info(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedCost = convert(
            match.cost_per_period || 0,
            "USD",
            "USD",
          );
          form.setValue("unit_price", convertedCost);
        }
      }
    },
    [libraryItems, form, getMissingRates, t, convert],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fullValue = e.target.value;
      let nameToSet = fullValue;
      let periodUnitToSet = form.getValues("unit");

      const match = /(.*)\s\((.*)\)$/.exec(fullValue);
      if (match) {
        nameToSet = match[1].trim();
        const unitLabel =
          periodUnits.find((u) => u.value === form.getValues("unit"))?.label ||
          form.getValues("unit");
        const foundUnit = periodUnits.find(
          (u) => u.label.toLowerCase() === unitLabel.toLowerCase(),
        );
        if (foundUnit) {
          periodUnitToSet = foundUnit.value;
        }
      }

      form.setValue("description", nameToSet);
      form.setValue("unit", periodUnitToSet);

      if (nameToSet && periodUnitToSet) {
        findAndApplyMatch(nameToSet, periodUnitToSet);
      }
    },
    [form, periodUnits, findAndApplyMatch],
  );

  const handleUnitChange = useCallback(
    (value: string) => {
      form.setValue("unit", value);
      const currentDescription = form.getValues("description");
      if (currentDescription && value) {
        findAndApplyMatch(currentDescription, value);
      }
    },
    [form, findAndApplyMatch],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.name")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("columns.namePlaceholder")}
                    onChange={handleDescriptionChange}
                    list="assembly-equipment-names"
                    autoComplete="off"
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
                <datalist id="assembly-equipment-names">
                  {libraryItems.map((e) => {
                    const periodUnitLabel =
                      periodUnits.find((u) => u.value === e.period_unit)
                        ?.label || e.period_unit;
                    return (
                      <option
                        key={e.id}
                        value={`${e.name} (${periodUnitLabel})`}
                      />
                    );
                  })}
                </datalist>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.type")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("columns.typePlaceholder")}
                    className="text-sm"
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rental_or_purchase"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.rentalPurchase")}
                </FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={rentalOptions}
                    isLoading={isLoadingRentalOptions}
                    placeholder={t("columns.rentalPurchasePlaceholder")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.quantity")}
                </FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {isPurchase
                    ? t("columns.purchaseCost")
                    : t("columns.costPerPeriod")}{" "}
                  (USD)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          {!isPurchase && (
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("columns.periodUnit")}
                  </FormLabel>
                  <FormControl>
                    <TranslatedSelect
                      value={field.value}
                      onValueChange={handleUnitChange}
                      options={periodUnits}
                      isLoading={isLoadingPeriodUnits}
                      placeholder={t("columns.periodUnitPlaceholder")}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
          )}

          {!isPurchase && (
            <FormField
              control={form.control}
              name="usage_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t("columns.usageDuration")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="maintenance_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.maintenance")} (USD)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    className="text-sm"
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fuel_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.fuel")} (USD)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    className="text-sm"
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-sm"
          >
            {t("common:cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="text-sm">
            {isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

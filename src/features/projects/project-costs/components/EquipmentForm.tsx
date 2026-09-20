import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { useEffect, useCallback } from "react";
import { equipmentSchema } from "@/features/projects/project-costs/types/schemas";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { toast } from "sonner";
import {
  CostItemGroupSelect,
  CostItemFormActions,
} from "./CostItemFormWrapper";

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  defaultValues?: Partial<EquipmentFormValues>;
  onSubmit: (values: EquipmentFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  groups: any[];
  currency?: string;
  enableGroups?: boolean;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
}

export function EquipmentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  groups,
  currency = "USD",
  enableGroups = true,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
}: EquipmentFormProps) {
  const { t } = useTranslation([
    "project_equipment",
    "common",
    "project_detail",
  ]);
  const { convert, getMissingRates } = useCurrencyConverter();

  const { data: libraryItems = [] } = useQuery({
    queryKey: ["library_equipment"],
    queryFn: async () =>
      mapRecords(await pb.collection("library_equipment").getFullList()),
  });

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: "",
      type: undefined,
      rental_or_purchase: rentalOptions[0]?.value || "Rental",
      quantity: 1,
      cost_per_period: 0,
      period_unit: periodUnits[0]?.value || "Day",
      usage_duration: 1,
      maintenance_cost: 0,
      fuel_cost: 0,
      group_id: "ungrouped",
      ...defaultValues,
    },
  });

  const rentalOrPurchase = form.watch("rental_or_purchase");
  const isPurchase = rentalOrPurchase?.toLowerCase() === "purchase";

  useEffect(() => {
    if (!form.getValues("rental_or_purchase") && rentalOptions.length > 0) {
      form.setValue("rental_or_purchase", rentalOptions[0].value, { shouldValidate: true, shouldDirty: false });
    }
    if (!form.getValues("period_unit") && periodUnits.length > 0) {
      form.setValue("period_unit", periodUnits[0].value, { shouldValidate: true, shouldDirty: false });
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped", { shouldValidate: true, shouldDirty: false });
    }
  }, [rentalOptions, periodUnits, groups, form, enableGroups]);

  const findAndApplyMatch = useCallback(
    (name: string, periodUnit: string) => {
      const match = libraryItems.find(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.period_unit.toLowerCase() === periodUnit.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("type"))
          form.setValue("type", match.type || undefined);
        if (!form.getValues("rental_or_purchase"))
          form.setValue(
            "rental_or_purchase",
            match.rental_or_purchase || "Rental",
          );
        if (!form.getValues("cost_per_period")) {
          const missing = getMissingRates("USD", currency);
          if (missing.length > 0) {
            toast.warning(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedCost = convert(
            match.cost_per_period || 0,
            "USD",
            currency,
          );
          form.setValue("cost_per_period", convertedCost);
        }
      }
    },
    [libraryItems, form, getMissingRates, currency, t, convert],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fullValue = e.target.value;
      let nameToSet = fullValue;
      let periodUnitToSet = form.getValues("period_unit");

      const match = /(.*)\s\((.*)\)$/.exec(fullValue);
      if (match) {
        nameToSet = match[1].trim();
        const unitLabel =
          periodUnits.find((u) => u.value === form.getValues("period_unit"))
            ?.label || form.getValues("period_unit");
        const foundUnit = periodUnits.find(
          (u) => u.label.toLowerCase() === unitLabel.toLowerCase(),
        );
        if (foundUnit) {
          periodUnitToSet = foundUnit.value;
        }
      }

      form.setValue("name", nameToSet);
      form.setValue("period_unit", periodUnitToSet);

      if (nameToSet && periodUnitToSet) {
        findAndApplyMatch(nameToSet, periodUnitToSet);
      }
    },
    [form, periodUnits, findAndApplyMatch],
  );

  const handlePeriodUnitChange = useCallback(
    (value: string) => {
      form.setValue("period_unit", value, { shouldValidate: true, shouldDirty: true });
      const currentName = form.getValues("name");
      if (currentName && value) {
        findAndApplyMatch(currentName, value);
      }
    },
    [form, findAndApplyMatch],
  );

  const handleFormSubmit = useCallback(
    (values: EquipmentFormValues) => {
      const isPurch = values.rental_or_purchase?.toLowerCase() === "purchase";
      onSubmit({
        ...values,
        period_unit: isPurch ? (values.period_unit || "Day") : values.period_unit,
        usage_duration: isPurch ? 1 : (values.usage_duration || 1),
      });
    },
    [onSubmit],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("columns.name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={handleNameChange}
                    list="equipment-names"
                    autoComplete="off"
                    placeholder={t("columns.namePlaceholder")}
                    aria-label={t("columns.name")}
                    className="text-sm"
                  />
                </FormControl>
                <datalist id="equipment-names">
                  {libraryItems.map((e) => {
                    const isPurchaseItem = e.rental_or_purchase === "Purchase";
                    const periodUnitLabel =
                      periodUnits.find((u) => u.value === e.period_unit)
                        ?.label || e.period_unit;
                    const displayValue = isPurchaseItem
                      ? e.name
                      : `${e.name} (${periodUnitLabel})`;
                    return <option key={e.id} value={displayValue} />;
                  })}
                </datalist>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("columns.type")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder={t("columns.typePlaceholder")}
                    aria-label={t("columns.type")}
                    className="text-sm"
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
                <FormLabel className="text-sm">
                  {t("columns.rentalPurchase")}
                </FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={rentalOptions}
                    isLoading={isLoadingRentalOptions}
                    autoSelectFirst={true}
                    placeholder={t("columns.rentalPurchasePlaceholder")}
                    aria-label={t("columns.rentalPurchase")}
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
                <FormLabel className="text-sm">
                  {t("columns.quantity")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    aria-label={t("columns.quantity")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_per_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {isPurchase
                    ? t("columns.purchaseCost")
                    : t("columns.costPerPeriod")}{" "}
                  ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    aria-label={
                      isPurchase
                        ? t("columns.purchaseCost")
                        : t("columns.costPerPeriod")
                    }
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
              name="period_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("columns.periodUnit")}
                  </FormLabel>
                  <FormControl>
                    <TranslatedSelect
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        handlePeriodUnitChange(val);
                      }}
                      options={periodUnits}
                      isLoading={isLoadingPeriodUnits}
                      autoSelectFirst={true}
                      placeholder={t("columns.periodUnitPlaceholder")}
                      aria-label={t("columns.periodUnit")}
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
                  <FormLabel className="text-sm">
                    {t("columns.usageDuration")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      aria-label={t("columns.usageDuration")}
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
                <FormLabel className="text-sm">
                  {t("columns.maintenance")} ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    aria-label={t("columns.maintenance")}
                    className="text-sm"
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
                <FormLabel className="text-sm">
                  {t("columns.fuel")} ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    aria-label={t("columns.fuel")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <CostItemGroupSelect
            control={form.control}
            name="group_id"
            groups={groups}
            enabled={enableGroups}
          />
        </div>

        <CostItemFormActions
          onCancel={onCancel}
          isSubmitting={isSubmitting}
        />
      </form>
    </Form>
  );
}

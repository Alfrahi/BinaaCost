import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useEffect, useCallback } from "react";
import { equipmentSchema } from "@/types/schemas";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { toast } from "sonner";

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
  const isPurchase = rentalOrPurchase === "Purchase";

  useEffect(() => {
    if (!form.getValues("rental_or_purchase") && rentalOptions.length > 0) {
      form.setValue("rental_or_purchase", rentalOptions[0].value);
    }
    if (!form.getValues("period_unit") && periodUnits.length > 0) {
      form.setValue("period_unit", periodUnits[0].value);
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped");
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
      form.setValue("period_unit", value);
      const currentName = form.getValues("name");
      if (currentName && value) {
        findAndApplyMatch(currentName, value);
      }
    },
    [form, findAndApplyMatch],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm">
            {t("columns.name")}
          </Label>
          <Input
            id="name"
            {...form.register("name")}
            onChange={handleNameChange}
            list="equipment-names"
            autoComplete="off"
            placeholder={t("columns.namePlaceholder")}
            aria-label={t("columns.name")}
            className="text-sm"
          />
          <datalist id="equipment-names">
            {libraryItems.map((e) => {
              const isPurchaseItem = e.rental_or_purchase === "Purchase";
              const periodUnitLabel =
                periodUnits.find((u) => u.value === e.period_unit)?.label ||
                e.period_unit;
              const displayValue = isPurchaseItem
                ? e.name
                : `${e.name} (${periodUnitLabel})`;
              return <option key={e.id} value={displayValue} />;
            })}
          </datalist>
          {form.formState.errors.name && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.name.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm">
            {t("columns.type")}
          </Label>
          <Input
            id="type"
            {...form.register("type")}
            placeholder={t("columns.typePlaceholder")}
            aria-label={t("columns.type")}
            className="text-sm"
            value={form.watch("type") || ""}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t("columns.rentalPurchase")}</Label>
          <TranslatedSelect
            value={rentalOrPurchase}
            onValueChange={(value) =>
              form.setValue("rental_or_purchase", value)
            }
            options={rentalOptions}
            isLoading={isLoadingRentalOptions}
            placeholder={t("columns.rentalPurchasePlaceholder")}
            aria-label={t("columns.rentalPurchase")}
            className="text-sm"
          />
          {form.formState.errors.rental_or_purchase && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.rental_or_purchase.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-sm">
            {t("columns.quantity")}
          </Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            {...form.register("quantity")}
            aria-label={t("columns.quantity")}
            className="text-sm"
          />
          {form.formState.errors.quantity && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.quantity.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost_per_period" className="text-sm">
            {isPurchase
              ? t("columns.purchaseCost")
              : t("columns.costPerPeriod")}{" "}
            ({currency})
          </Label>
          <Input
            id="cost_per_period"
            type="number"
            step="0.01"
            {...form.register("cost_per_period")}
            aria-label={
              isPurchase
                ? t("columns.purchaseCost")
                : t("columns.costPerPeriod")
            }
            className="text-sm"
          />
          {form.formState.errors.cost_per_period && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.cost_per_period.message!)}
            </p>
          )}
        </div>

        {!isPurchase && (
          <div className="space-y-2">
            <Label className="text-sm">{t("columns.periodUnit")}</Label>
            <TranslatedSelect
              value={form.watch("period_unit")}
              onValueChange={handlePeriodUnitChange}
              options={periodUnits}
              isLoading={isLoadingPeriodUnits}
              placeholder={t("columns.periodUnitPlaceholder")}
              aria-label={t("columns.periodUnit")}
              className="text-sm"
            />
            {form.formState.errors.period_unit && (
              <p className="text-destructive text-sm">
                {t(form.formState.errors.period_unit.message!)}
              </p>
            )}
          </div>
        )}

        {!isPurchase && (
          <div className="space-y-2">
            <Label htmlFor="usage_duration" className="text-sm">
              {t("columns.usageDuration")}
            </Label>
            <Input
              id="usage_duration"
              type="number"
              min="1"
              {...form.register("usage_duration")}
              aria-label={t("columns.usageDuration")}
              className="text-sm"
            />
            {form.formState.errors.usage_duration && (
              <p className="text-destructive text-sm">
                {t(form.formState.errors.usage_duration.message!)}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="maintenance_cost" className="text-sm">
            {t("columns.maintenance")} ({currency})
          </Label>
          <Input
            id="maintenance_cost"
            type="number"
            step="0.01"
            {...form.register("maintenance_cost")}
            aria-label={t("columns.maintenance")}
            className="text-sm"
            value={form.watch("maintenance_cost") ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuel_cost" className="text-sm">
            {t("columns.fuel")} ({currency})
          </Label>
          <Input
            id="fuel_cost"
            type="number"
            step="0.01"
            {...form.register("fuel_cost")}
            aria-label={t("columns.fuel")}
            className="text-sm"
            value={form.watch("fuel_cost") ?? ""}
          />
        </div>

        {enableGroups && (
          <div className="space-y-2">
            <Label className="text-sm">
              {t("project_detail:groups.assignGroup")}
            </Label>
            <TranslatedSelect
              value={form.watch("group_id")}
              onValueChange={(value) => form.setValue("group_id", value)}
              options={[
                {
                  value: "ungrouped",
                  label: t("project_detail:groups.ungrouped"),
                },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              placeholder={t("project_detail:groups.selectGroup")}
              aria-label={t("project_detail:groups.assignGroup")}
              className="text-sm"
            />
          </div>
        )}
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
  );
}

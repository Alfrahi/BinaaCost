import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useEffect } from "react";
import { materialSchema } from "@/types/schemas";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
import { toast } from "sonner";
import { useCallback } from "react";

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormValues>;
  onSubmit: (values: MaterialFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  groups: any[];
  currency: string;
  enableGroups?: boolean;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
}

export function MaterialForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  groups,
  currency,
  enableGroups = true,
  materialUnits,
  isLoadingMaterialUnits,
}: MaterialFormProps) {
  const { t } = useTranslation([
    "project_materials",
    "common",
    "project_detail",
  ]);
  const { convert, getMissingRates } = useCurrencyConverter();

  const { data: libraryItems = [] } = useQuery({
    queryKey: ["library_materials"],
    queryFn: async () =>
      mapRecords(await pb.collection("library_materials").getFullList()),
  });

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      description: undefined,
      quantity: 0,
      unit: materialUnits[0]?.value || "",
      unit_price: 0,
      group_id: "ungrouped",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (!form.getValues("unit") && materialUnits.length > 0) {
      form.setValue("unit", materialUnits[0].value);
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped");
    }
  }, [materialUnits, groups, form, enableGroups]);

  const findAndApplyMatch = useCallback(
    (name: string, unit: string) => {
      const match = libraryItems.find(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.unit.toLowerCase() === unit.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("description"))
          form.setValue("description", match.description || undefined);
        if (!form.getValues("unit_price")) {
          const missing = getMissingRates("USD", currency);
          if (missing.length > 0) {
            toast.warning(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedPrice = convert(
            match.unit_price || 0,
            "USD",
            currency,
          );
          form.setValue("unit_price", convertedPrice);
        }
      }
    },
    [libraryItems, form, getMissingRates, currency, convert, t],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fullValue = e.target.value;
      let nameToSet = fullValue;
      let unitToSet = form.getValues("unit");

      const match = /(.*)\s\((.*)\)$/.exec(fullValue);
      if (match) {
        nameToSet = match[1].trim();
        const unitLabel = match[2].trim();
        const foundUnit = materialUnits.find(
          (u) => u.label.toLowerCase() === unitLabel.toLowerCase(),
        );
        if (foundUnit) {
          unitToSet = foundUnit.value;
        }
      }

      form.setValue("name", nameToSet);
      form.setValue("unit", unitToSet);

      if (nameToSet && unitToSet) {
        findAndApplyMatch(nameToSet, unitToSet);
      }
    },
    [form, materialUnits, findAndApplyMatch],
  );

  const handleUnitChange = useCallback(
    (value: string) => {
      form.setValue("unit", value);
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
            list="material-names"
            autoComplete="off"
            placeholder={t("columns.namePlaceholder")}
            aria-label={t("columns.name")}
            className="text-sm"
          />
          <datalist id="material-names">
            {libraryItems.map((m) => {
              const unitLabel =
                materialUnits.find((u) => u.value === m.unit)?.label || m.unit;
              return <option key={m.id} value={`${m.name} (${unitLabel})`} />;
            })}
          </datalist>
          {form.formState.errors.name && (
            <p className="text-red-500 text-sm">
              {t(form.formState.errors.name.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm">
            {t("columns.description")}
          </Label>
          <Input
            id="description"
            {...form.register("description")}
            placeholder={t("common:columns.descriptionPlaceholder")}
            aria-label={t("columns.description")}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-sm">
            {t("columns.quantity")}
          </Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            {...form.register("quantity")}
            placeholder={t("columns.quantityPlaceholder")}
            aria-label={t("columns.quantity")}
            className="text-sm"
          />
          {form.formState.errors.quantity && (
            <p className="text-red-500 text-sm">
              {t(form.formState.errors.quantity.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t("columns.unit")}</Label>
          <TranslatedSelect
            value={form.watch("unit")}
            onValueChange={handleUnitChange}
            options={materialUnits}
            isLoading={isLoadingMaterialUnits}
            placeholder={t("columns.unitPlaceholder")}
            aria-label={t("columns.unit")}
            className="text-sm"
          />
          {form.formState.errors.unit && (
            <p className="text-red-500 text-sm">
              {t(form.formState.errors.unit.message!)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit_price" className="text-sm">
            {t("columns.unitPrice")} ({currency})
          </Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            {...form.register("unit_price")}
            aria-label={t("columns.unitPrice")}
            className="text-sm"
          />
          {form.formState.errors.unit_price && (
            <p className="text-red-500 text-sm">
              {t(form.formState.errors.unit_price.message!)}
            </p>
          )}
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

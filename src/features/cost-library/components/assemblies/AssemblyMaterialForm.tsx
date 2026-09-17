import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { useEffect, useCallback, useMemo } from "react";
import {
  AssemblyMaterialFormValues,
  assemblyMaterialSchema,
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
import { mapRecords } from "@/shared/lib/pb-mapper";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { toast } from "sonner";

interface AssemblyMaterialFormProps {
  initialData?: Partial<AssemblyMaterialFormValues>;
  onSubmit: (values: AssemblyMaterialFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
}

export function AssemblyMaterialForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  materialUnits,
  isLoadingMaterialUnits,
}: AssemblyMaterialFormProps) {
  const { t } = useTranslation(["project_materials", "common"]);
  const { convert, getMissingRates } = useCurrencyConverter();

  const { data: libraryItemsData } = useQuery({
    queryKey: ["library_materials"],
    queryFn: async () =>
      mapRecords(await pb.collection("library_materials").getFullList()),
  });
  const libraryItems = useMemo(
    () => (Array.isArray(libraryItemsData) ? libraryItemsData : []),
    [libraryItemsData],
  );

  const form = useForm<AssemblyMaterialFormValues>({
    resolver: zodResolver(assemblyMaterialSchema),
    defaultValues: {
      description: "",
      quantity: 0,
      unit: materialUnits[0]?.value || "",
      unit_price: 0,
      ...initialData,
    },
  });

  useEffect(() => {
    if (!form.getValues("unit") && materialUnits.length > 0) {
      form.setValue("unit", materialUnits[0].value);
    }
  }, [materialUnits, form]);

  const findAndApplyMatch = useCallback(
    (name: string, unit: string) => {
      const match = libraryItems.find(
        (item) =>
          item.name.toLowerCase() === name.toLowerCase() &&
          item.unit.toLowerCase() === unit.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("unit_price")) {
          const missing = getMissingRates("USD", "USD");
          if (missing.length > 0) {
            toast.info(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedPrice = convert(match.unit_price || 0, "USD", "USD");
          form.setValue("unit_price", convertedPrice);
        }
      }
    },
    [libraryItems, form, getMissingRates, t, convert],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fullValue = e.target.value;
      let nameToSet = fullValue;
      let unitToSet = form.getValues("unit");

      const match = /(.*)\s\((.*)\)$/.exec(fullValue);
      if (match) {
        nameToSet = match[1].trim();
        const unitLabel =
          materialUnits.find((u) => u.value === form.getValues("unit"))
            ?.label || form.getValues("unit");
        const foundUnit = materialUnits.find(
          (u) => u.label.toLowerCase() === unitLabel.toLowerCase(),
        );
        if (foundUnit) {
          unitToSet = foundUnit.value;
        }
      }

      form.setValue("description", nameToSet);
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
                <FormLabel className="text-sm">{t("columns.name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("columns.namePlaceholder")}
                    onChange={handleDescriptionChange}
                    list="assembly-material-names"
                    autoComplete="off"
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
                <datalist id="assembly-material-names">
                  {libraryItems.map((m) => {
                    const unitLabel =
                      materialUnits.find((u) => u.value === m.unit)?.label ||
                      m.unit;
                    return (
                      <option key={m.id} value={`${m.name} (${unitLabel})`} />
                    );
                  })}
                </datalist>
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
                  <Input type="number" min="0" {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("columns.unit")}</FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={handleUnitChange}
                    options={materialUnits}
                    isLoading={isLoadingMaterialUnits}
                    placeholder={t("columns.unitPlaceholder")}
                  />
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
                <FormLabel className="text-sm">
                  {t("columns.unitPrice")} (USD)
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

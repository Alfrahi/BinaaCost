import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useEffect } from "react";
import { materialSchema } from "@/features/projects/project-costs/types/schemas";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { toast } from "sonner";
import { useCallback } from "react";
import {
  CostItemGroupSelect,
  CostItemFormActions,
} from "./CostItemFormWrapper";

interface LibraryMaterialItem {
  id: string;
  name: string;
  unit: string;
  description?: string;
  unit_price?: number;
}

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
      mapRecords<LibraryMaterialItem>(await pb.collection("library_materials").getFullList()),
  });

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      description: undefined,
      quantity: 0,
      unit: materialUnits[0]?.value || "",
      group_id: "ungrouped",
      ...defaultValues,
      unit_price: defaultValues?.unit_price !== undefined ? defaultValues.unit_price / 100 : 0,
    },
  });

  useEffect(() => {
    if (!form.getValues("unit") && materialUnits.length > 0) {
      form.setValue("unit", materialUnits[0].value, { shouldValidate: true, shouldDirty: false });
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped", { shouldValidate: true, shouldDirty: false });
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
          form.setValue("unit_price", convertedPrice / 100);
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
      form.setValue("unit", value, { shouldValidate: true, shouldDirty: true });
      const currentName = form.getValues("name");
      if (currentName && value) {
        findAndApplyMatch(currentName, value);
      }
    },
    [form, findAndApplyMatch],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("columns.name")}</FormLabel>
                <FormControl>
                  <Input
                    id="name"
                    {...field}
                    onChange={handleNameChange}
                    list="material-names"
                    autoComplete="off"
                    placeholder={t("columns.namePlaceholder")}
                    aria-label={t("columns.name")}
                    className="text-sm"
                  />
                </FormControl>
                <datalist id="material-names">
                  {libraryItems.map((m) => {
                    const unitLabel =
                      materialUnits.find((u) => u.value === m.unit)?.label ||
                      m.unit;
                    return (
                      <option key={m.id} value={`${m.name} (${unitLabel})`} />
                    );
                  })}
                </datalist>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.description")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("common:columns.descriptionPlaceholder")}
                    aria-label={t("columns.description")}
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
                    id="quantity"
                    type="number"
                    min="0"
                    {...field}
                    placeholder={t("columns.quantityPlaceholder")}
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
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("columns.unit")}</FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      handleUnitChange(val);
                    }}
                    options={materialUnits}
                    isLoading={isLoadingMaterialUnits}
                    autoSelectFirst={true}
                    placeholder={t("columns.unitPlaceholder")}
                    aria-label={t("columns.unit")}
                    className="text-sm"
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
                  {t("columns.unitPrice")} ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    id="unit_price"
                    type="text"
                    inputMode="decimal"
                    {...field}
                    aria-label={t("columns.unitPrice")}
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

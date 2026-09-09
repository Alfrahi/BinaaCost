import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { CostDatabase } from "@/types/cost-databases";
import { X } from "lucide-react";

const costDatabaseSchema = z.object({
  name: z.string().min(1, "pages:cost_databases.nameRequired"),
  description: z.string().nullable().optional(),
  currency: z.string().min(1, "pages:cost_databases.currencyRequired"),
});

export type CostDatabaseFormValues = z.infer<typeof costDatabaseSchema>;

interface CostDatabaseFormProps {
  initialData?: CostDatabase | null;
  onSubmit: (values: CostDatabaseFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CostDatabaseForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: CostDatabaseFormProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { options: currencies, isLoading: isLoadingCurrencies } =
    useSettingsOptions("currency");

  const form = useForm<CostDatabaseFormValues>({
    resolver: zodResolver(costDatabaseSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: currencies[0]?.value || "USD",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        currency: initialData.currency || currencies[0]?.value || "USD",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        currency: currencies[0]?.value || "USD",
      });
    }
  }, [initialData, form, currencies]);

  useEffect(() => {
    if (!form.getValues("currency") && currencies.length > 0) {
      form.setValue("currency", currencies[0].value);
    }
  }, [currencies, form]);

  return (
    <div className="border rounded-lg p-4 bg-muted space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">
          {initialData ? t("common:edit") : t("pages:cost_databases.add")}
        </h3>
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="db-name" className="text-sm font-medium">
            {t("common:name")}
          </Label>
          <Input id="db-name" {...form.register("name")} className="text-sm" />
          {form.formState.errors.name && (
            <p className="text-red-500 text-xs mt-1">
              {t(form.formState.errors.name.message!)}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="db-description" className="text-sm font-medium">
            {t("common:description")}
          </Label>
          <Input
            id="db-description"
            {...form.register("description")}
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="db-currency" className="text-sm font-medium">
            {t("common:currency")}
          </Label>
          <TranslatedSelect
            value={form.watch("currency")}
            onValueChange={(val) => form.setValue("currency", val)}
            options={currencies}
            isLoading={isLoadingCurrencies}
            placeholder={t("pages:cost_databases.selectCurrency")}
            aria-label={t("common:currency")}
            className="text-sm"
          />
          {form.formState.errors.currency && (
            <p className="text-red-500 text-xs mt-1">
              {t(form.formState.errors.currency.message!)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-sm"
            disabled={isSubmitting}
          >
            {t("common:cancel")}
          </Button>
          <Button type="submit" className="text-sm" disabled={isSubmitting}>
            {isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

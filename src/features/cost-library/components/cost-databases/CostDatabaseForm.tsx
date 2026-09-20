import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { useSettingsOptions } from "@/shared/hooks/useSettingsOptions";
import { CostDatabase } from "@/features/cost-library/databases/types/databases";
import { X } from "lucide-react";

const costDatabaseSchema = z.object({
  name: z.string().min(1, "pages:cost_databases.nameRequired"),
  description: z.string().nullable().optional(),
  is_public: z.boolean().default(false),
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
  const { t } = useTranslation(["pages", "common", "resources"]);
  const { options: currencies, isLoading: isLoadingCurrencies } =
    useSettingsOptions("currency");

  const form = useForm<CostDatabaseFormValues>({
    resolver: zodResolver(costDatabaseSchema),
    defaultValues: {
      name: "",
      description: "",
      is_public: false,
      currency: currencies[0]?.value || "USD",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        is_public: initialData.is_public ?? false,
        currency: initialData.currency || currencies[0]?.value || "USD",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        is_public: false,
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
        <Heading level={3}>
          {initialData ? t("common:edit") : t("common:add")}{" "}
          {t("resources:databases")}
        </Heading>
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("common:name")}
                </FormLabel>
                <FormControl>
                  <Input {...field} className="text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("common:description")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    onChange={field.onChange}
                    rows={3}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("common:currency")}
                </FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={currencies}
                    isLoading={isLoadingCurrencies}
                    placeholder={t("pages:cost_databases.selectCurrency")}
                    aria-label={t("common:currency")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_public"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-medium">
                  {t("pages:cost_databases.public")}
                </FormLabel>
              </FormItem>
            )}
          />
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
      </Form>
    </div>
  );
}

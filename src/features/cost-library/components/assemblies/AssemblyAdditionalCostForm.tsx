import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { useEffect } from "react";
import {
  AssemblyAdditionalCostFormValues,
  assemblyAdditionalCostSchema,
} from "@/types/assembly-schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";

interface AssemblyAdditionalCostFormProps {
  initialData?: Partial<AssemblyAdditionalCostFormValues>;
  onSubmit: (values: AssemblyAdditionalCostFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
}

export function AssemblyAdditionalCostForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  additionalCategories,
  isLoadingAdditionalCategories,
}: AssemblyAdditionalCostFormProps) {
  const { t } = useTranslation(["project_additional", "common"]);

  const form = useForm<AssemblyAdditionalCostFormValues>({
    resolver: zodResolver(assemblyAdditionalCostSchema),
    defaultValues: {
      category: additionalCategories[0]?.value || "",
      description: "",
      amount: 0,
      ...initialData,
    },
  });

  useEffect(() => {
    if (!form.getValues("category") && additionalCategories.length > 0) {
      form.setValue("category", additionalCategories[0].value);
    }
  }, [additionalCategories, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 text-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.category")}
                </FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={additionalCategories}
                    isLoading={isLoadingAdditionalCategories}
                    placeholder={t("columns.categoryPlaceholder")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.description")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t("common:columns.descriptionPlaceholder")}
                    rows={1}
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {t("columns.amount")} (USD)
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

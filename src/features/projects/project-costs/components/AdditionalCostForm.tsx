import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  AdditionalCostFormValues,
  additionalCostSchema,
} from "@/features/projects/project-costs/types/schemas";
import {
  CostItemGroupSelect,
  CostItemFormActions,
} from "./CostItemFormWrapper";

interface AdditionalCostFormProps {
  editingItem?: any;
  onSubmit: (values: AdditionalCostFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  groups: any[];
  currency: string;
  enableGroups?: boolean;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
}

export function AdditionalCostForm({
  editingItem,
  onSubmit,
  onCancel,
  isSubmitting,
  groups,
  currency,
  enableGroups = true,
  additionalCategories,
  isLoadingAdditionalCategories,
}: AdditionalCostFormProps) {
  const { t } = useTranslation([
    "project_additional",
    "common",
    "project_detail",
  ]);

  const form = useForm<AdditionalCostFormValues>({
    resolver: zodResolver(additionalCostSchema),
    defaultValues: {
      category: additionalCategories[0]?.value || "",
      description: undefined,
      amount: 0,
      group_id: "ungrouped",
      ...editingItem,
      amount: editingItem?.amount !== undefined ? editingItem.amount / 100 : 0,
    },
  });

  useEffect(() => {
    if (!form.getValues("category") && additionalCategories.length > 0) {
      form.setValue("category", additionalCategories[0].value, { shouldValidate: true, shouldDirty: false });
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped", { shouldValidate: true, shouldDirty: false });
    }
  }, [additionalCategories, groups, form, enableGroups]);

  const handleSubmit = useCallback(
    (values: AdditionalCostFormValues) => {
      onSubmit(values);
    },
    [onSubmit],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 text-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.category")}
                </FormLabel>
                <FormControl>
                  <TranslatedSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={additionalCategories}
                    isLoading={isLoadingAdditionalCategories}
                    autoSelectFirst={true}
                    placeholder={t("columns.categoryPlaceholder")}
                    aria-label={t("columns.category")}
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.amount")} ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...field}
                    aria-label={t("columns.amount")}
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

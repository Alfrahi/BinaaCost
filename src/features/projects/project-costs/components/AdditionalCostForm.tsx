import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  AdditionalCostFormValues,
  additionalCostSchema,
} from "@/features/projects/project-costs/types/schemas";

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
    },
  });

  useEffect(() => {
    if (!form.getValues("category") && additionalCategories.length > 0) {
      form.setValue("category", additionalCategories[0].value);
    }
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped");
    }
  }, [additionalCategories, groups, form, enableGroups]);

  const handleSubmit = useCallback(
    (values: AdditionalCostFormValues) => {
      onSubmit(values);
    },
    [onSubmit],
  );

  const groupOptions = [
    { value: "ungrouped", label: t("project_detail:groups.ungrouped") },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

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
                    type="number"
                    step="0.01"
                    {...field}
                    aria-label={t("columns.amount")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          {enableGroups && (
            <FormField
              control={form.control}
              name="group_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("project_detail:groups.assignGroup")}
                  </FormLabel>
                  <FormControl>
                    <TranslatedSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={groupOptions}
                      placeholder={t("project_detail:groups.selectGroup")}
                      aria-label={t("project_detail:groups.assignGroup")}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
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

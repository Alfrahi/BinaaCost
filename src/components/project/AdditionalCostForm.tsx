import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useEffect, useCallback } from "react";
import {
  AdditionalCostFormValues,
  additionalCostSchema,
} from "@/types/schemas";

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
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4 text-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">{t("columns.category")}</Label>
          <TranslatedSelect
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
            options={additionalCategories}
            isLoading={isLoadingAdditionalCategories}
            placeholder={t("columns.categoryPlaceholder")}
            aria-label={t("columns.category")}
            className="text-sm"
          />
          {form.formState.errors.category && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.category.message!)}
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
          <Label htmlFor="amount" className="text-sm">
            {t("columns.amount")} ({currency})
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...form.register("amount")}
            aria-label={t("columns.amount")}
            className="text-sm"
          />
          {form.formState.errors.amount && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.amount.message!)}
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
              options={groupOptions}
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
  );
}

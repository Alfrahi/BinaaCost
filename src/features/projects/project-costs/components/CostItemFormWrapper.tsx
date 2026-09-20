import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/shared/components/ui/form";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { Control, FieldValues, Path } from "react-hook-form";

export interface CostItemFormActionsProps {
  onCancel: () => void;
  isSubmitting: boolean;
  cancelLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
}

export function CostItemFormActions({
  onCancel,
  isSubmitting,
  cancelLabel,
  saveLabel,
  savingLabel,
}: CostItemFormActionsProps) {
  const { t } = useTranslation(["common"]);

  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="text-sm"
      >
        {cancelLabel || t("common:cancel")}
      </Button>
      <Button type="submit" disabled={isSubmitting} className="text-sm">
        {isSubmitting
          ? savingLabel || t("common:saving")
          : saveLabel || t("common:save")}
      </Button>
    </div>
  );
}

export interface CostItemGroupSelectProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name?: Path<TFieldValues>;
  groups: Array<{ id: string; name: string }>;
  enabled?: boolean;
}

export function CostItemGroupSelect<TFieldValues extends FieldValues = FieldValues>({
  control,
  name = "group_id" as Path<TFieldValues>,
  groups,
  enabled = true,
}: CostItemGroupSelectProps<TFieldValues>) {
  const { t } = useTranslation(["project_detail"]);

  if (!enabled) return null;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm">
            {t("project_detail:groups.assignGroup")}
          </FormLabel>
          <FormControl>
            <TranslatedSelect
              value={field.value}
              onValueChange={field.onChange}
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
          </FormControl>
          <FormMessage className="text-sm" />
        </FormItem>
      )}
    />
  );
}

export interface CostItemFormWrapperProps {
  children: React.ReactNode;
  onCancel: () => void;
  isSubmitting: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  savingLabel?: string;
}

export function CostItemFormWrapper({
  children,
  onCancel,
  isSubmitting,
  saveLabel,
  cancelLabel,
  savingLabel,
}: CostItemFormWrapperProps) {
  return (
    <div className="space-y-4">
      {children}
      <CostItemFormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        saveLabel={saveLabel}
        cancelLabel={cancelLabel}
        savingLabel={savingLabel}
      />
    </div>
  );
}

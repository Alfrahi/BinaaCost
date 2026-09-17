"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
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
import { z } from "zod";

type ItemType = "material" | "labor" | "equipment" | "additional";

interface AssemblyItemFormConfig {
  itemType: ItemType;
  schema: z.ZodTypeAny;
  libraryQueryKey: string[];
  libraryCollection: string;
  defaultValues: Record<string, any>;
  formFields: AssemblyFormField[];
  conditionalFields?: (values: any) => AssemblyFormField[];
  findMatch?: (values: any, libraryItems: any[]) => void;
  watchFields?: string[];
}

interface AssemblyFormField {
  name: string;
  labelKey: string;
  placeholderKey?: string;
  type: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  isLoading?: boolean;
  step?: string;
  min?: string | number;
  defaultValue?: any;
  conditional?: (values: any) => boolean;
  formatLabel?: (values: any) => string;
  fullWidth?: boolean;
  datalistKey?: string;
  onChange?: (value: string, form: any) => void;
  itemType?: ItemType;
}

interface AssemblyItemFormProps {
  config: AssemblyItemFormConfig;
  initialData?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AssemblyItemForm({
  config,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: AssemblyItemFormProps) {
  const { t } = useTranslation(["resources", "common", "project_materials", "project_labor", "project_equipment", "project_additional"]);
  const { convert: _convert, getMissingRates: _getMissingRates } = useCurrencyConverter();

  const { data: libraryItemsData } = useQuery({
    queryKey: config.libraryQueryKey,
    queryFn: async () =>
      mapRecords(await pb.collection(config.libraryCollection).getFullList()),
  });
  const libraryItems = useMemo(
    () => (Array.isArray(libraryItemsData) ? libraryItemsData : []),
    [libraryItemsData],
  );

  const form = useForm({
    resolver: zodResolver(config.schema),
    defaultValues: {
      ...config.defaultValues,
      ...initialData,
    },
  });

  const handleAutoFill = useCallback(
    (values: any) => {
      if (!config.findMatch) return;
      config.findMatch(values, libraryItems);
    },
    [config, libraryItems],
  );

  useEffect(() => {
    const watchFields = config.watchFields || [];
    if (config.findMatch && watchFields.length > 0) {
      const watchedValues = watchFields.reduce((acc, field) => ({ ...acc, [field]: form.watch(field) }), {});
      if (Object.keys(watchedValues).length > 0) {
        handleAutoFill(watchedValues);
      }
    }
  }, [config.findMatch, config.watchFields, form, handleAutoFill, libraryItems]);

  useEffect(() => {
    if (initialData) {
      form.reset({ ...config.defaultValues, ...initialData });
    } else {
      form.reset(config.defaultValues);
    }
  }, [initialData, form, config.defaultValues]);

  const handleSubmit = useCallback(
    (values: Record<string, any>) => {
      onSubmit(values);
    },
    [onSubmit],
  );

  const visibleFields = config.formFields.filter((field) =>
    field.conditional ? field.conditional(form.watch()) : true
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleFields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as any}
              render={({ field: formField }) => {
                const label = field.formatLabel
                  ? field.formatLabel(form.watch())
                  : t(field.labelKey);
                const placeholder = field.placeholderKey
                  ? t(field.placeholderKey)
                  : undefined;

                const renderInput = () => {
                  switch (field.type) {
                    case "select":
                      return (
                        <TranslatedSelect
                          value={form.watch(field.name)}
                          onValueChange={(val) => field.onChange?.(val, form) ?? formField.onChange(val)}
                          options={field.options || []}
                          isLoading={field.isLoading}
                          placeholder={placeholder}
                          className="text-sm"
                        />
                      );
                    case "number":
                      return (
                        <Input
                          type="number"
                          step={field.step}
                          min={field.min}
                          {...formField}
                          className="text-sm"
                          value={formField.value ?? field.defaultValue ?? ""}
                        />
                      );
                    case "textarea":
                      return (
                        <Textarea
                          {...formField}
                          placeholder={placeholder}
                          rows={1}
                          className="text-sm"
                          value={formField.value || ""}
                        />
                      );
                    default:
                      return (
                        <Input
                          {...formField}
                          placeholder={placeholder}
                          list={field.datalistKey ? `${field.datalistKey}` : undefined}
                          autoComplete="off"
                          className="text-sm"
                          value={formField.value ?? field.defaultValue ?? ""}
                          onChange={(e) => field.onChange?.(e.target.value, form) ?? formField.onChange(e.target.value)}
                        />
                      );
                  }
                };

                return (
                  <FormItem className={field.fullWidth ? "md:col-span-2" : undefined}>
                    <FormLabel className="text-sm font-medium">{label}</FormLabel>
                    <FormControl>{renderInput()}</FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                );
              }}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="text-sm" disabled={isSubmitting}>
            {t("common:cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="text-sm">
            {isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>

        {/* Datalist options for autocomplete fields */}
        {visibleFields
          .filter((f) => f.datalistKey)
          .map((field) => (
            <datalist key={field.datalistKey} id={field.datalistKey!}>
              {libraryItems.map((item: any) => {
                if (field.itemType === "material") {
                  const unitLabel = field.options?.find((u) => u.value === item.unit)?.label || item.unit;
                  return <option key={item.id} value={`${item.name} (${unitLabel})`} />;
                }
                if (field.itemType === "equipment") {
                  const periodUnitLabel = field.options?.find((u) => u.value === item.period_unit)?.label || item.period_unit;
                  return <option key={item.id} value={`${item.name} (${periodUnitLabel})`} />;
                }
                if (field.itemType === "labor") {
                  return <option key={item.id} value={item.worker_type} />;
                }
                return null;
              })}
            </datalist>
          ))}
      </form>
    </Form>
  );
}
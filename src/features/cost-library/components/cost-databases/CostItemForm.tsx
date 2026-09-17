"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { CostDatabaseItem } from "@/features/cost-library/hooks/useCostDatabaseItems";

const costItemSchema = z.object({
  csi_division: z.string().min(1, "project_costs:csiDivisionRequired"),
  csi_code: z.string().min(1, "project_costs:csiCodeRequired"),
  description: z.string().min(1, "common:descriptionRequired"),
  unit: z.string().min(1, "common:unitRequired"),
  unit_price: z.coerce.number().min(0, "common:priceNonNegative"),
});

export type CostItemFormValues = z.infer<typeof costItemSchema>;

interface CostItemFormProps {
  initialData?: CostDatabaseItem | null;
  onSubmit: (values: CostItemFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  currency: string;
}

export function CostItemForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  currency,
}: CostItemFormProps) {
  const { t } = useTranslation(["pages", "common", "project_costs"]);

  const form = useForm<CostItemFormValues>({
    resolver: zodResolver(costItemSchema),
    defaultValues: {
      csi_division: "",
      csi_code: "",
      description: "",
      unit: "",
      unit_price: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        csi_division: initialData.csi_division,
        csi_code: initialData.csi_code,
        description: initialData.description,
        unit: initialData.unit,
        unit_price: initialData.unit_price,
      });
    } else {
      form.reset({
        csi_division: "",
        csi_code: "",
        description: "",
        unit: "",
        unit_price: 0,
      });
    }
  }, [initialData, form]);

  return (
    <div className="border rounded-lg p-4 bg-muted space-y-3">
      <div className="flex justify-between items-center">
        <Heading level={3}>
          {initialData ? t("common:edit") : t("pages:cost_databases.add")}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="csi_division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("project_costs:csiDivision")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("project_costs:csiDivisionPlaceholder")}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="csi_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("project_costs:csiCode")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("project_costs:csiCodePlaceholder")}
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
                  <FormLabel className="text-sm">{t("common:unit")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("common:unitPlaceholder")}
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
                    {t("common:price")} ({currency})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      placeholder={t("common:pricePlaceholder")}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("common:description")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("common:columns.descriptionPlaceholder")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
            </div>
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
              {isSubmitting ? t("common:saving") : t("common:add")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

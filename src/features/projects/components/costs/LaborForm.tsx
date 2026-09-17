import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
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
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/shared/lib/pb-mapper";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { laborSchema, LaborFormValues } from "@/types/schemas";

interface LaborFormProps {
  defaultValues?: Partial<LaborFormValues>;
  onSubmit: (values: LaborFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  groups: { id: string; name: string }[];
  currency: string;
  enableGroups?: boolean;
}

export function LaborForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  groups,
  currency,
  enableGroups = true,
}: LaborFormProps) {
  const { t } = useTranslation(["project_labor", "project_detail", "common"]);
  const { convert, getMissingRates } = useCurrencyConverter();

  const { data: libraryItems = [] } = useQuery({
    queryKey: ["library_labor"],
    queryFn: async () =>
      mapRecords(await pb.collection("library_labor").getFullList()),
  });

  const form = useForm<LaborFormValues>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      worker_type: "",
      description: undefined,
      number_of_workers: 1,
      daily_rate: 0,
      total_days: 1,
      group_id: "ungrouped",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (enableGroups && !form.getValues("group_id") && groups.length > 0) {
      form.setValue("group_id", "ungrouped");
    }
  }, [groups, form, enableGroups]);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      form.setValue("worker_type", val);

      const match = libraryItems.find(
        (item) => item.worker_type.toLowerCase() === val.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("daily_rate")) {
          const missing = getMissingRates("USD", currency);
          if (missing.length > 0) {
            toast.warning(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedRate = convert(match.daily_rate || 0, "USD", currency);
          form.setValue("daily_rate", convertedRate);
        }
      }
    },
    [form, libraryItems, getMissingRates, currency, convert, t],
  );

  const groupOptions = [
    { value: "ungrouped", label: t("project_detail:groups.ungrouped") },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="worker_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.workerType")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={handleTypeChange}
                    list="worker-types"
                    autoComplete="off"
                    placeholder={t("columns.workerTypePlaceholder")}
                    aria-label={t("columns.workerType")}
                    className="text-sm"
                  />
                </FormControl>
                <datalist id="worker-types">
                  {libraryItems.map((l) => (
                    <option key={l.id} value={l.worker_type} />
                  ))}
                </datalist>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="number_of_workers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.numWorkers")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    placeholder={t("columns.numWorkersPlaceholder")}
                    aria-label={t("columns.numWorkers")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="daily_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.dailyRate")} ({currency})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    placeholder={t("columns.dailyRatePlaceholder")}
                    aria-label={t("columns.dailyRate")}
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="total_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.totalDays")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    placeholder={t("columns.totalDaysPlaceholder")}
                    aria-label={t("columns.totalDays")}
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

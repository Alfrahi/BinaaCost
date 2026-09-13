import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/lib/pb-mapper";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="worker_type" className="text-sm">
            {t("columns.workerType")}
          </Label>
          <Input
            id="worker_type"
            {...form.register("worker_type")}
            onChange={handleTypeChange}
            list="worker-types"
            autoComplete="off"
            placeholder={t("columns.workerTypePlaceholder")}
            aria-label={t("columns.workerType")}
            className="text-sm"
          />
          <datalist id="worker-types">
            {libraryItems.map((l) => (
              <option key={l.id} value={l.worker_type} />
            ))}
          </datalist>
          {form.formState.errors.worker_type && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.worker_type.message!)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="number_of_workers" className="text-sm">
            {t("columns.numWorkers")}
          </Label>
          <Input
            id="number_of_workers"
            type="number"
            {...form.register("number_of_workers")}
            placeholder={t("columns.numWorkersPlaceholder")}
            aria-label={t("columns.numWorkers")}
            className="text-sm"
          />
          {form.formState.errors.number_of_workers && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.number_of_workers.message!)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="daily_rate" className="text-sm">
            {t("columns.dailyRate")} ({currency})
          </Label>
          <Input
            id="daily_rate"
            type="number"
            step="0.01"
            {...form.register("daily_rate")}
            placeholder={t("columns.dailyRatePlaceholder")}
            aria-label={t("columns.dailyRate")}
            className="text-sm"
          />
          {form.formState.errors.daily_rate && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.daily_rate.message!)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_days" className="text-sm">
            {t("columns.totalDays")}
          </Label>
          <Input
            id="total_days"
            type="number"
            {...form.register("total_days")}
            placeholder={t("columns.totalDaysPlaceholder")}
            aria-label={t("columns.totalDays")}
            className="text-sm"
          />
          {form.formState.errors.total_days && (
            <p className="text-destructive text-sm">
              {t(form.formState.errors.total_days.message!)}
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

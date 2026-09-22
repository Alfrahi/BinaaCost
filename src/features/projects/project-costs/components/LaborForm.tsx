import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Input } from "@/shared/components/ui/input";
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
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useCurrencyConverter } from "@/shared/hooks/useCurrencyConverter";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { laborSchema, LaborFormValues } from "@/features/projects/project-costs/types/schemas";
import {
  CostItemGroupSelect,
  CostItemFormActions,
} from "./CostItemFormWrapper";

interface LibraryLaborItem {
  id: string;
  worker_type: string;
  daily_rate?: number;
}

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
      mapRecords<LibraryLaborItem>(await pb.collection("library_labor").getFullList()),
  });

  const form = useForm<LaborFormValues>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      worker_type: "",
      description: undefined,
      number_of_workers: 1,
      total_days: 1,
      group_id: "ungrouped",
      ...defaultValues,
      daily_rate: defaultValues?.daily_rate !== undefined ? defaultValues.daily_rate / 100 : 0,
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
                    id="daily_rate"
                    type="text"
                    inputMode="decimal"
                    {...field}
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
                    step="any"
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

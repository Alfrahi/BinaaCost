import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  AssemblyLaborFormValues,
  assemblyLaborSchema,
} from "@/types/assembly-schemas";
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
import { toast } from "sonner";
import { useCallback, useMemo } from "react";

interface AssemblyLaborFormProps {
  initialData?: Partial<AssemblyLaborFormValues>;
  onSubmit: (values: AssemblyLaborFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AssemblyLaborForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: AssemblyLaborFormProps) {
  const { t } = useTranslation(["project_labor", "common"]);
  const { convert, getMissingRates } = useCurrencyConverter();

  const { data: libraryItemsData } = useQuery({
    queryKey: ["library_labor"],
    queryFn: async () =>
      mapRecords(await pb.collection("library_labor").getFullList()),
  });
  const libraryItems = useMemo(
    () => (Array.isArray(libraryItemsData) ? libraryItemsData : []),
    [libraryItemsData],
  );

  const form = useForm<AssemblyLaborFormValues>({
    resolver: zodResolver(assemblyLaborSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unit_price: 0,
      total_days: 1,
      ...initialData,
    },
  });

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      form.setValue("description", val);

      const match = libraryItems.find(
        (item) => item.worker_type.toLowerCase() === val.toLowerCase(),
      );
      if (match) {
        if (!form.getValues("unit_price")) {
          const missing = getMissingRates("USD", "USD");
          if (missing.length > 0) {
            toast.info(
              t("common:missingRateWarning", { currency: missing.join(", ") }),
            );
          }
          const convertedRate = convert(match.daily_rate || 0, "USD", "USD");
          form.setValue("unit_price", convertedRate);
        }
      }
    },
    [form, libraryItems, getMissingRates, t, convert],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.workerType")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("columns.workerTypePlaceholder")}
                    onChange={handleDescriptionChange}
                    list="assembly-worker-types"
                    autoComplete="off"
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="text-sm" />
                <datalist id="assembly-worker-types">
                  {libraryItems.map((l) => (
                    <option key={l.id} value={l.worker_type} />
                  ))}
                </datalist>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.numWorkers")}
                </FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} className="text-sm" />
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
                  {t("columns.dailyRate")} (USD)
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
          <FormField
            control={form.control}
            name="total_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">
                  {t("columns.totalDays")}
                </FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} className="text-sm" />
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

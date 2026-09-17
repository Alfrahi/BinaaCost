import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useCurrencyFormatter } from "@/shared/lib/formatCurrency";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DataTable, { DataTableColumn } from "@/shared/components/ui/data-table";
import {
  TableRow,
  TableCell,
} from "@/shared/components/ui/table";
import { calculateRiskContingency } from "@/shared/logic/risk";
import { calculateCategoryTotal } from "@/shared/logic/shared";
import { Risk } from "@/features/projects/project-core/types/project";
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";

const riskSchema = z.object({
  description: z.string().trim().min(1, "project_risk:descriptionRequired"),
  probability: z.string().trim().min(1, "project_risk:probabilityRequired"),
  impact_amount: z.coerce.number().min(0, "project_risk:impactAmountError"),
  mitigation_plan: z.string().trim().nullable().optional(),
  contingency_amount: z.coerce
    .number()
    .min(0, "project_risk:riskContingencyError"),
});

type FormValues = z.infer<typeof riskSchema>;

type RiskMutationPayload = Omit<
  Risk,
  "id" | "created_at" | "updated_at" | "user_id" | "project_id"
>;

export default function RiskManagementTable({
  projectId,
  risks,
  currency = "USD",
  canEdit,
  riskProbabilities,
  isLoadingRiskProbabilities,
  onNavigateToPricing,
}: {
  projectId: string;
  risks: Risk[];
  currency?: string;
  canEdit: boolean;
  riskProbabilities: { value: string; label: string }[];
  isLoadingRiskProbabilities: boolean;
  onNavigateToPricing?: () => void;
}) {
  const { t } = useTranslation(["project_risk", "common"]);
  const { format } = useCurrencyFormatter();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);

  const { addRisk, updateRisk, deleteRisk, isAdding, isUpdating, isDeleting } =
    useProjectRisks(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      description: "",
      probability: "",
      impact_amount: 0,
      mitigation_plan: "",
      contingency_amount: 0,
    },
  });

  const watchedProbability = useWatch({
    control: form.control,
    name: "probability",
  });
  const watchedImpact = useWatch({
    control: form.control,
    name: "impact_amount",
  });

  useEffect(() => {
    const impact = Number(watchedImpact) || 0;
    const calculated = calculateRiskContingency(impact, watchedProbability);
    form.setValue("contingency_amount", calculated);
  }, [watchedProbability, watchedImpact, form]);

  const resetForm = useCallback(() => {
    form.reset({
      description: "",
      probability: riskProbabilities[0]?.value || "",
      impact_amount: 0,
      mitigation_plan: "",
      contingency_amount: 0,
    });
    setEditingItem(null);
    setShowForm(false);
  }, [form, riskProbabilities]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const payload: RiskMutationPayload = {
        description: values.description,
        probability: values.probability,
        impact_amount: values.impact_amount,
        mitigation_plan:
          values.mitigation_plan === "" ? null : (values.mitigation_plan ?? null),
        contingency_amount: values.contingency_amount,
      };

      if (editingItem) {
        await updateRisk(editingItem.id, payload);
      } else {
        await addRisk(payload);
      }
      resetForm();
    },
    [editingItem, updateRisk, addRisk, resetForm],
  );

  useEffect(() => {
    if (!form.getValues("probability") && riskProbabilities.length > 0) {
      form.setValue("probability", riskProbabilities[0].value);
    }
  }, [riskProbabilities, form]);

  const totalContingency = useMemo(
    () => calculateCategoryTotal.risks(risks),
    [risks],
  );

  const columns = useMemo<DataTableColumn<Risk>[]>(
    () => [
      { key: "description", label: t("fields.description"), minWidth: "150px" },
      { key: "probability", label: t("fields.probability"), minWidth: "100px" },
      { key: "impact_amount", label: t("fields.impactAmount"), align: "end", isCurrency: true, minWidth: "120px" },
      { key: "mitigation_plan", label: t("fields.mitigationPlan"), minWidth: "150px" },
      { key: "contingency_amount", label: t("fields.riskContingency"), align: "end", isCurrency: true, minWidth: "120px" },
      { key: "actions", label: t("common:actions"), align: "end", minWidth: "80px" },
    ],
    [t],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Heading level={3}>{t("title")}</Heading>
        {canEdit && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            aria-label={t("add")}
            className="text-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      {showForm && canEdit && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 border rounded-sm bg-card space-y-3 mb-6"
          >
            <Heading level={3} className="mb-2">
              {editingItem ? t("edit") : t("add")}
            </Heading>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("fields.description")}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("fields.probability")}
                  </FormLabel>
                  <FormControl>
                    <TranslatedSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={riskProbabilities}
                      isLoading={isLoadingRiskProbabilities}
                      placeholder={t("common:selectOption")}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="impact_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("fields.impactAmount")}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mitigation_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("fields.mitigationPlan")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onChange={field.onChange}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contingency_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    {t("fields.riskContingency")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      readOnly
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("common:riskAutoCalc")}
                  </p>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={resetForm}
                className="text-sm"
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isAdding || isUpdating}
                className="text-sm"
              >
                {t("common:save")}
              </Button>
            </div>
          </form>
        </Form>
      )}
      <DataTable
        columns={columns}
        data={risks}
        getRowKey={(risk) => risk.id}
        renderRow={(risk) => (
          <TableRow key={risk.id}>
            <TableCell className="text-start text-sm">{risk.description}</TableCell>
            <TableCell className="text-start text-sm">
              {riskProbabilities.find((o) => o.value === risk.probability)
                ?.label || risk.probability}
            </TableCell>
            <TableCell className="text-end tabular-nums text-sm">
              {format(risk.impact_amount, currency)}
            </TableCell>
            <TableCell className="text-start text-sm">
              {risk.mitigation_plan || t("common:notSpecified")}
            </TableCell>
            <TableCell className="text-end tabular-nums text-sm">
              {format(risk.contingency_amount, currency)}
            </TableCell>
            {canEdit && (
              <TableCell className="text-end">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingItem(risk);
                      form.reset({
                        description: risk.description,
                        probability: risk.probability,
                        impact_amount: risk.impact_amount,
                        mitigation_plan: risk.mitigation_plan || "",
                        contingency_amount: risk.contingency_amount,
                      });
                      setShowForm(true);
                    }}
                    aria-label={t("common:edit")}
                    className="h-8 w-8"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteTarget(risk)}
                    aria-label={t("common:delete")}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        )}
        emptyMessage={t("noItems")}
        ariaLabel={t("project_risk:tableLabel")}
      />
      <div className="mt-4 bg-accent border-s-4 border-primary p-4 rounded-sm space-y-2">
        <div className="font-semibold text-accent-foreground text-base">
          {t("totalRiskContingency")}:{" "}
          <span className="text-primary">
            {format(totalContingency, currency)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t("formulaHint")}</p>
        {onNavigateToPricing && (
          <Button
            variant="link"
            size="sm"
            onClick={onNavigateToPricing}
            className="text-sm p-0 h-auto"
          >
            {t("seeAlsoPricing")}
          </Button>
        )}
      </div>
      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRisk(deleteTarget.id)}
        itemName={deleteTarget?.description}
        loading={isDeleting}
      />
    </div>
  );
}

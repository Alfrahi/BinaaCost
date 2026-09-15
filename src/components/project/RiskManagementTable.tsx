import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useCurrencyFormatter } from "@/utils/formatCurrency";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateRiskContingency } from "@/logic/risk";
import { calculateCategoryTotal } from "@/logic/shared";
import { Risk } from "@/types/project-items";
import EmptyState from "@/components/ui/EmptyState";
import { useProjectRisks } from "@/hooks/useProjectRisks";

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
          values.mitigation_plan === "" ? null : values.mitigation_plan,
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

  const headerClass =
    "text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted h-10";

  const totalContingency = useMemo(
    () => calculateCategoryTotal.risks(risks),
    [risks],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
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
            <h3 className="font-semibold mb-2 text-lg">
              {editingItem ? t("edit") : t("add")}
            </h3>
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
      <div className="overflow-x-auto border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={`text-start ${headerClass} min-w-[150px]`}>
                {t("fields.description")}
              </TableHead>
              <TableHead className={`text-start ${headerClass} min-w-[100px]`}>
                {t("fields.probability")}
              </TableHead>
              <TableHead className={`text-start ${headerClass} min-w-[120px]`}>
                {t("fields.impactAmount")}
              </TableHead>
              <TableHead className={`text-start ${headerClass} min-w-[150px]`}>
                {t("fields.mitigationPlan")}
              </TableHead>
              <TableHead className={`text-start ${headerClass} min-w-[120px]`}>
                {t("fields.riskContingency")}
              </TableHead>
              {canEdit && (
                <TableHead className={`text-end ${headerClass} min-w-[80px]`}>
                  {t("common:actions")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell className="text-start text-sm min-w-[150px]">
                  {risk.description}
                </TableCell>
                <TableCell className="text-start text-sm min-w-[100px]">
                  {riskProbabilities.find((o) => o.value === risk.probability)
                    ?.label || risk.probability}
                </TableCell>
                <TableCell className="text-start text-sm min-w-[120px]">
                  {format(risk.impact_amount, currency)}
                </TableCell>
                <TableCell className="text-start text-sm min-w-[150px]">
                  {risk.mitigation_plan || t("common:notSpecified")}
                </TableCell>
                <TableCell className="text-start text-sm min-w-[120px]">
                  {format(risk.contingency_amount, currency)}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-end min-w-[80px]">
                    <div className="flex justify-end gap-2">
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
                        className="h-7 w-7"
                      >
                        <Edit2 className="w-3 h-3" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setDeleteTarget(risk)}
                        aria-label={t("common:delete")}
                        className="h-7 w-7"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {risks.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5}>
                  <EmptyState message={t("noItems")} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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

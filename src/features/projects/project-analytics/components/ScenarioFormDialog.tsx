

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Card } from "@/shared/components/ui/card";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { TranslatedSelect } from "@/shared/components/TranslatedSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Info } from "lucide-react";
import { Scenario, ScenarioRuleFormValues, ScenarioFormValues, scenarioFormSchema } from "@/features/projects/project-analytics/types/scenario";

interface DynamicRuleFieldProps {
  control: Control<ScenarioFormValues>;
  name: FieldPath<ScenarioFormValues>;
  label: string;
  children: (field: { value: any; onChange: (...event: any[]) => void }) => React.ReactNode;
}

function DynamicRuleField({ control, name, label, children }: DynamicRuleFieldProps) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className="space-y-2">
        <FormLabel className="text-sm">{label}</FormLabel>
        <FormControl>{children(field)}</FormControl>
        <FormMessage className="text-sm" />
      </FormItem>
    )} />
  );
}

interface ScenarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingScenario: Scenario | null;
  scenarios: any[];
  currency: string;
  projectRisks: any[];
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
  isAddingScenario: boolean;
  isUpdatingScenario: boolean;
  formatRulesForDb: (rules: any[]) => any;
  formatRulesForForm: (rules: any[]) => any;
  addScenario: (payload: any) => Promise<void>;
  updateScenario: (payload: any) => Promise<void>;
}

export function ScenarioFormDialog({
  open,
  onOpenChange,
  editingScenario,


  projectRisks,
  additionalCategories,

  isAddingScenario,
  isUpdatingScenario,
  formatRulesForDb,
  formatRulesForForm,
  addScenario,
  updateScenario,
}: ScenarioFormDialogProps) {
  const { t } = useTranslation(["scenario_analysis", "common", "project_tabs", "project_detail", "project_materials", "project_labor", "project_equipment", "project_additional", "project_risk"]);
  const [itemTypeOptions] = useState(() => [
    { value: "materials", label: t("project_tabs:materials") },
    { value: "labor", label: t("project_tabs:labor") },
    { value: "equipment", label: t("project_tabs:equipment") },
    { value: "additional", label: t("project_tabs:additional") },
    { value: "risks", label: t("realizeRisk") },
    { value: "financial_settings", label: t("financialSettings") },
  ]);

  const scenarioForm = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioFormSchema),
    defaultValues: { name: "", description: "", is_public: false, impact_rules: [] },
  });

  const projectRiskOptions = useMemo(() => projectRisks.map(r => ({ value: r.id, label: r.description })), [projectRisks]);

  const getFieldOptions = useCallback((itemType: ScenarioRuleFormValues["item_type"]) => {
    switch (itemType) {
      case "materials": return [{ value: "unit_price", label: t("project_materials:columns.unitPrice") }];
      case "labor": return [
        { value: "daily_rate", label: t("project_labor:columns.dailyRate") },
        { value: "total_days", label: t("project_labor:columns.totalDays") },
      ];
      case "equipment": return [
        { value: "cost_per_period", label: t("project_equipment:columns.costPerPeriod") },
        { value: "maintenance_cost", label: t("project_equipment:columns.maintenance") },
        { value: "fuel_cost", label: t("project_equipment:columns.fuel") },
        { value: "usage_duration", label: t("project_equipment:columns.usageDuration") },
      ];
      case "additional": return [{ value: "amount", label: t("project_additional:columns.amount") }];
      case "risks": return [{ value: "realize_risk_impact", label: t("realizeRiskImpact") }];
      case "financial_settings": return [
        { value: "overhead_percent", label: t("project_detail:profit_pricing.overhead") },
        { value: "markup_percent", label: t("project_detail:profit_pricing.markup") },
        { value: "tax_percent", label: t("project_detail:profit_pricing.taxes") },
        { value: "contingency_percent", label: t("project_detail:profit_pricing.generalContingency") },
        { value: "location_factor", label: t("project_detail:financial_inputs.locationFactor") },
      ];
      default: return [];
    }
  }, [t]);

  const getAdjustmentTypeOptions = useCallback((itemType: ScenarioRuleFormValues["item_type"], field: string) => {
    if (itemType === "risks" && field === "realize_risk_impact") return [{ value: "by_id", label: t("byId") }];
    if (field === "total_days" || field === "usage_duration") return [{ value: "fixed_increase", label: t("fixedIncrease") }];
    return [
      { value: "percentage_increase", label: t("percentageIncrease") },
      { value: "fixed_increase", label: t("fixedIncrease") },
    ];
  }, [t]);

  const handleAddRule = useCallback(() => {
    const currentRules = scenarioForm.getValues("impact_rules");
    scenarioForm.setValue("impact_rules", [
      ...currentRules,
      { item_type: "materials", field: "unit_price", adjustment_type: "percentage_increase", value: 10 },
    ]);
  }, [scenarioForm]);

  const handleRemoveRule = useCallback((index: number) => {
    const currentRules = scenarioForm.getValues("impact_rules");
    scenarioForm.setValue("impact_rules", currentRules.filter((_, i) => i !== index));
  }, [scenarioForm]);

  const handleSubmit = useCallback(async (values: ScenarioFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      is_public: values.is_public,
      impact_rules: formatRulesForDb(values.impact_rules),
    };
    if (editingScenario) {
      await updateScenario({ id: editingScenario.id, ...payload });
    } else {
      await addScenario(payload);
    }
    onOpenChange(false);
  }, [editingScenario, addScenario, updateScenario, formatRulesForDb, onOpenChange]);


  const closeForm = useCallback(() => {
    if (scenarioForm.formState.isDirty) {
      const confirmDiscard = window.confirm(
        t("common:confirmDiscardUnsaved", "You have unsaved changes. Discard them?"),
      );
      if (!confirmDiscard) return;
    }
    onOpenChange(false);
    scenarioForm.reset();
  }, [onOpenChange, scenarioForm, t]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      if (editingScenario) {
        scenarioForm.reset({
          name: editingScenario.name,
          description: editingScenario.description || "",
          is_public: editingScenario.is_public,
          impact_rules: formatRulesForForm(editingScenario.impact_rules),
        });
      } else {
        scenarioForm.reset({ name: "", description: "", is_public: false, impact_rules: [] });
      }
    }
  }, [open, editingScenario, scenarioForm, formatRulesForForm]);

  return (
    <Dialog open={open} onOpenChange={closeForm}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{editingScenario ? t("editScenario") : t("createScenario")}</DialogTitle>
        </DialogHeader>
        <Form {...scenarioForm}>
          <form onSubmit={scenarioForm.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField control={scenarioForm.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("name")}</FormLabel>
                <FormControl><Input {...field} placeholder={t("namePlaceholder")} className="text-sm" /></FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )} />
            <FormField control={scenarioForm.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">{t("description")}</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder={t("descriptionPlaceholder")} rows={3} className="text-sm" /></FormControl>
                <FormMessage className="text-sm" />
              </FormItem>
            )} />
            <FormField control={scenarioForm.control} name="is_public" render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 text-primary border-input rounded-sm focus:ring-primary" /></FormControl>
                <FormLabel className="text-sm">{t("makePublic")}</FormLabel>
                <TooltipProvider><Tooltip><TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger><TooltipContent className="text-xs"><p>{t("publicTooltip")}</p></TooltipContent></Tooltip></TooltipProvider>
              </FormItem>
            )} />
            <h4 className="font-semibold text-base mt-6">{t("impactRules")}</h4>
            <FormField control={scenarioForm.control} name="impact_rules" render={() => <FormItem><FormMessage className="text-sm" /></FormItem>} />
            <div className="space-y-4 border p-3 rounded-md bg-muted">
              {scenarioForm.watch("impact_rules").map((rule, index) => (
                <Card key={index} className="p-3 space-y-3 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 end-2 h-6 w-6 text-destructive" onClick={() => handleRemoveRule(index)} aria-label={t("common:remove")}><X className="w-3 h-3" /></Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DynamicRuleField control={scenarioForm.control} name={`impact_rules.${index}.item_type`} label={t("itemType")}>
                      {({ value, onChange }) => (
                        <Select value={value} onValueChange={(val: ScenarioRuleFormValues["item_type"]) => {
                          onChange(val);
                          const fieldOptions = getFieldOptions(val);
                          const defaultField = fieldOptions[0]?.value || "";
                          scenarioForm.setValue(`impact_rules.${index}.field`, defaultField);
                          scenarioForm.setValue(`impact_rules.${index}.adjustment_type`, getAdjustmentTypeOptions(val, defaultField)[0]?.value as any || "percentage_increase");
                          scenarioForm.setValue(`impact_rules.${index}.filter_name_contains`, "");
                          scenarioForm.setValue(`impact_rules.${index}.filter_category_is`, "");
                          scenarioForm.setValue(`impact_rules.${index}.filter_worker_type_contains`, "");
                        }}>
                          <SelectTrigger className="text-sm">
                            <SelectValue>
                              {itemTypeOptions.find((opt) => opt.value === value)?.label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>{itemTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </DynamicRuleField>
                    <DynamicRuleField control={scenarioForm.control} name={`impact_rules.${index}.field`} label={t("field")}>
                      {({ value, onChange }) => (
                        <Select value={value} onValueChange={(val) => { onChange(val); scenarioForm.setValue(`impact_rules.${index}.adjustment_type`, getAdjustmentTypeOptions(rule.item_type, val)[0]?.value as any || "percentage_increase"); }}>
                          <SelectTrigger className="text-sm">
                            <SelectValue>
                              {getFieldOptions(rule.item_type).find((opt) => opt.value === value)?.label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>{getFieldOptions(rule.item_type).map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </DynamicRuleField>
                    <DynamicRuleField control={scenarioForm.control} name={`impact_rules.${index}.adjustment_type`} label={t("adjustmentType")}>
                      {({ value, onChange }) => (
                        <Select value={value} onValueChange={(val: ScenarioRuleFormValues["adjustment_type"]) => onChange(val)}>
                          <SelectTrigger className="text-sm">
                            <SelectValue>
                              {getAdjustmentTypeOptions(rule.item_type, rule.field).find((opt) => opt.value === value)?.label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>{getAdjustmentTypeOptions(rule.item_type, rule.field).map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </DynamicRuleField>
                    <DynamicRuleField control={scenarioForm.control} name={`impact_rules.${index}.value`} label={t("value")}>
                      {({ value, onChange }) => rule.item_type === "risks" && rule.field === "realize_risk_impact" ? (
                        <TranslatedSelect value={value as string} onValueChange={onChange} options={projectRiskOptions} placeholder={t("selectRisk")} className="text-sm" />
                      ) : (
                        <Input type="number" step="0.01" value={Number.isNaN(value) ? "" : value ?? ""} onChange={(e) => onChange(e.target.valueAsNumber)} className="text-sm" />
                      )}
                    </DynamicRuleField>
                    {(rule.item_type === "materials" || rule.item_type === "equipment") && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">{t("filterByName")}</Label>
                        <Input {...scenarioForm.register(`impact_rules.${index}.filter_name_contains`)} placeholder={t("filterNamePlaceholder")} className="text-sm" />
                      </div>
                    )}
                    {rule.item_type === "labor" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">{t("filterByWorkerType")}</Label>
                        <Input {...scenarioForm.register(`impact_rules.${index}.filter_worker_type_contains`)} placeholder={t("filterWorkerTypePlaceholder")} className="text-sm" />
                      </div>
                    )}
                    {rule.item_type === "additional" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm">{t("filterByCategory")}</Label>
                        <TranslatedSelect value={rule.filter_category_is || ""} onValueChange={(val) => scenarioForm.setValue(`impact_rules.${index}.filter_category_is`, val)} options={additionalCategories} placeholder={t("selectCategory")} className="text-sm" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              <Button type="button" variant="outline" onClick={handleAddRule} className="text-sm w-full"><Plus className={cn("w-4 h-4", getIconMarginClass())} />{t("addRule")}</Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isAddingScenario || isUpdatingScenario} className="text-sm">{t("common:cancel")}</Button>
              <Button type="submit" disabled={isAddingScenario || isUpdatingScenario} className="text-sm">{isAddingScenario || isUpdatingScenario ? t("common:saving") : t("common:save")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
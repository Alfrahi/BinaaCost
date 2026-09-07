import { useNavigate } from "react-router-dom";
import { useFormContext, FormProvider, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { TranslatedSelect } from "@/components/TranslatedSelect";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { useEffect, useState } from "react";
import { projectSchema } from "@/types/project-form";
import { sanitizeText } from "@/utils/sanitizeText";

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  form?: UseFormReturn<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => void;
  isEditing: boolean;
  loading: boolean;
  error?: string | null;
}

export default function ProjectForm({
  form: externalForm,
  onSubmit,
  isEditing,
  loading,
  error,
}: ProjectFormProps) {
  const { t } = useTranslation(["project_form", "common"]);
  const navigate = useNavigate();
  const internalForm = useFormContext<ProjectFormValues>();
  const form = externalForm || internalForm;
  const { isDirty } = form.formState;
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const { options: projectTypes, isLoading: isLoadingProjectTypes } =
    useSettingsOptions("project_type");
  const { options: sizeUnits, isLoading: isLoadingSizeUnits } =
    useSettingsOptions("project_size_unit");
  const { options: durationUnits, isLoading: isLoadingDurationUnits } =
    useSettingsOptions("duration_unit");
  const { options: currencies, isLoading: isLoadingCurrencies } =
    useSettingsOptions("currency");

  const typeValue = form.watch("type") || projectTypes[0]?.value || "";
  const sizeUnitValue = form.watch("size_unit") || sizeUnits[0]?.value || "";
  const durationUnitValue =
    form.watch("duration_unit") || durationUnits[0]?.value || "";
  const currencyValue = form.watch("currency") || currencies[0]?.value || "USD";

  useEffect(() => {
    if (!form.getValues("type") && projectTypes.length > 0) {
      form.setValue("type", projectTypes[0].value);
    }
    if (!form.getValues("size_unit") && sizeUnits.length > 0) {
      form.setValue("size_unit", sizeUnits[0].value);
    }
    if (!form.getValues("duration_unit") && durationUnits.length > 0) {
      form.setValue("duration_unit", durationUnits[0].value);
    }
    if (!form.getValues("currency") && currencies.length > 0) {
      form.setValue("currency", currencies[0].value);
    }
  }, [projectTypes, sizeUnits, durationUnits, currencies, form]);

  const handleFormSubmit = (values: ProjectFormValues) => {
    const sanitizedValues: ProjectFormValues = {
      ...values,
      name: sanitizeText(values.name) || "",
      description: sanitizeText(values.description),
      location: sanitizeText(values.location),
      client_requirements: sanitizeText(values.client_requirements),
      type: sanitizeText(values.type) || "",
      size_unit: sanitizeText(values.size_unit) || "",
      duration_unit: sanitizeText(values.duration_unit),
      currency: sanitizeText(values.currency) || "USD",
    };
    onSubmit(sanitizedValues);
    form.reset(sanitizedValues);
  };

  return (
    <FormProvider {...form}>
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="text-xl">
            {isEditing
              ? t("project_form:editProject")
              : t("project_form:createProject")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? t("project_form:editProjectDescription")
              : t("project_form:createProjectDescription")}
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">
                  {t("project_form:name")}
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder={t("project_form:namePlaceholder")}
                  aria-label={t("project_form:name")}
                  className="text-sm"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {t(form.formState.errors.name.message!)}
                  </p>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="description" className="text-sm">
                    {t("project_form:description")}
                  </Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder={t("project_form:descriptionPlaceholder")}
                    rows={3}
                    aria-label={t("project_form:description")}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">{t("project_form:type")}</Label>
                  <TranslatedSelect
                    value={typeValue}
                    onValueChange={(value) => form.setValue("type", value)}
                    options={projectTypes}
                    isLoading={isLoadingProjectTypes}
                    placeholder={t("project_form:typePlaceholder")}
                    aria-label={t("project_form:type")}
                    className="text-sm"
                  />
                  {form.formState.errors.type && (
                    <p className="text-red-500 text-sm mt-1">
                      {t(form.formState.errors.type.message!)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">{t("project_form:size")}</Label>
                    <Input
                      type="number"
                      min="0"
                      {...form.register("size")}
                      placeholder={t("project_form:sizePlaceholder")}
                      aria-label={t("project_form:size")}
                      className="text-sm"
                    />
                    {form.formState.errors.size && (
                      <p className="text-red-500 text-sm mt-1">
                        {t(form.formState.errors.size.message!)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm">
                      {t("project_form:sizeUnit")}
                    </Label>
                    <TranslatedSelect
                      value={sizeUnitValue}
                      onValueChange={(value) =>
                        form.setValue("size_unit", value)
                      }
                      options={sizeUnits}
                      isLoading={isLoadingSizeUnits}
                      placeholder={t("project_form:sizeUnitPlaceholder")}
                      aria-label={t("project_form:sizeUnit")}
                      className="text-sm"
                    />
                    {form.formState.errors.size_unit && (
                      <p className="text-red-500 text-sm mt-1">
                        {t(form.formState.errors.size_unit.message!)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm">{t("project_form:location")}</Label>
                <Input
                  {...form.register("location")}
                  placeholder={t("project_form:locationPlaceholder")}
                  aria-label={t("project_form:location")}
                  className="text-sm"
                />
              </div>

              {isEditing && (
                <div>
                  <Label className="text-sm">
                    {t("project_form:clientRequirements")}
                  </Label>
                  <Textarea
                    {...form.register("client_requirements")}
                    placeholder={t(
                      "project_form:clientRequirementsPlaceholder",
                    )}
                    rows={3}
                    aria-label={t("project_form:clientRequirements")}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">
                    {t("project_form:duration")}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    {...form.register("duration_days")}
                    placeholder={t("project_form:durationPlaceholder")}
                    aria-label={t("project_form:duration")}
                    className="text-sm"
                  />
                  {form.formState.errors.duration_days && (
                    <p className="text-red-500 text-sm mt-1">
                      {t(form.formState.errors.duration_days.message!)}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">
                    {t("project_form:durationUnit")}
                  </Label>
                  <TranslatedSelect
                    value={durationUnitValue}
                    onValueChange={(value) =>
                      form.setValue("duration_unit", value)
                    }
                    options={durationUnits}
                    isLoading={isLoadingDurationUnits}
                    placeholder={t("project_form:durationUnitPlaceholder")}
                    aria-label={t("project_form:durationUnit")}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">{t("project_form:currency")}</Label>
                <TranslatedSelect
                  value={currencyValue}
                  onValueChange={(value) => form.setValue("currency", value)}
                  options={currencies}
                  isLoading={isLoadingCurrencies}
                  placeholder={t("project_form:currencyPlaceholder")}
                  aria-label={t("project_form:currency")}
                  className="text-sm"
                />
                {form.formState.errors.currency && (
                  <p className="text-red-500 text-sm mt-1">
                    {t(form.formState.errors.currency.message!)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="text-sm"
              >
                {t("common:cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="text-sm">
                {loading
                  ? t("common:saving")
                  : isEditing
                    ? t("common:update")
                    : t("common:create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("project_form:discardTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("project_form:discardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("project_form:keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                form.reset();
                navigate("/");
              }}
            >
              {t("project_form:discardChanges")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}

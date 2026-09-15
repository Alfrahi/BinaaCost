import { useNavigate } from "react-router-dom";
import { useFormContext, FormProvider, UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ConfirmDialog from "@/components/ConfirmDialog";
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
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing
              ? t("project_form:editProject")
              : t("project_form:createProject")}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? t("project_form:editProjectDescription")
              : t("project_form:createProjectDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
          >
            {error && (
              <div
                role="alert"
                className="p-4 bg-destructive/10 text-destructive rounded-md text-sm"
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("project_form:name")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("project_form:namePlaceholder")}
                        aria-label={t("project_form:name")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("project_form:description")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={t("project_form:descriptionPlaceholder")}
                        rows={3}
                        aria-label={t("project_form:description")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t("project_form:type")}
                      </FormLabel>
                      <FormControl>
                        <TranslatedSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={projectTypes}
                          isLoading={isLoadingProjectTypes}
                          placeholder={t("project_form:typePlaceholder")}
                          aria-label={t("project_form:type")}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t("project_form:size")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder={t("project_form:sizePlaceholder")}
                            aria-label={t("project_form:size")}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="size_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          {t("project_form:sizeUnit")}
                        </FormLabel>
                        <FormControl>
                          <TranslatedSelect
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            options={sizeUnits}
                            isLoading={isLoadingSizeUnits}
                            placeholder={t("project_form:sizeUnitPlaceholder")}
                            aria-label={t("project_form:sizeUnit")}
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-sm" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("project_form:location")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={t("project_form:locationPlaceholder")}
                        aria-label={t("project_form:location")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("project_form:clientRequirements")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder={t(
                          "project_form:clientRequirementsPlaceholder",
                        )}
                        rows={3}
                        aria-label={t("project_form:clientRequirements")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t("project_form:duration")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={t("project_form:durationPlaceholder")}
                          aria-label={t("project_form:duration")}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        {t("project_form:durationUnit")}
                      </FormLabel>
                      <FormControl>
                        <TranslatedSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          options={durationUnits}
                          isLoading={isLoadingDurationUnits}
                          placeholder={t("project_form:durationUnitPlaceholder")}
                          aria-label={t("project_form:durationUnit")}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {t("project_form:currency")}
                    </FormLabel>
                    <FormControl>
                      <TranslatedSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={currencies}
                        isLoading={isLoadingCurrencies}
                        placeholder={t("project_form:currencyPlaceholder")}
                        aria-label={t("project_form:currency")}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />
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

      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onConfirm={() => {
          form.reset();
          navigate("/");
        }}
        title={t("project_form:discardTitle")}
        body={t("project_form:discardDescription")}
        confirmLabel={t("project_form:discardChanges")}
        cancelLabel={t("project_form:keepEditing")}
      />
    </FormProvider>
  );
}

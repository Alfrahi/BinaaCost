"use client";
import { useTranslation } from "react-i18next";
import ProjectForm from "@/components/project/ProjectForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useUpdateProject } from "@/hooks/useUpdateProject";
import { FormProvider } from "react-hook-form";
import { CurrencyConversionDialog } from "@/components/project/CurrencyConversionDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function EditProject() {
  const { t } = useTranslation(["project_form", "common"]);
  const {
    form,
    loading,
    fetchError,
    initialData,
    handleSubmit,
    isPending,
    error,
    showCurrencyConversionDialog,
    setShowCurrencyConversionDialog,
    pendingNewCurrency,
    originalCurrency,
    isConverting,
    handleConfirmConversion,
    handleCancelConversion,
  } = useUpdateProject();

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm">{t("project_form:loading")}</div>
    );
  }

  if (fetchError || !initialData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {fetchError?.message || t("project_form:notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-sm">
      <Breadcrumbs />
      <FormProvider {...form}>
        <ProjectForm
          onSubmit={handleSubmit}
          isEditing={true}
          loading={isPending}
          error={error}
        />
      </FormProvider>
      <CurrencyConversionDialog
        open={showCurrencyConversionDialog}
        onOpenChange={setShowCurrencyConversionDialog}
        originalCurrency={originalCurrency}
        pendingNewCurrency={pendingNewCurrency}
        onConfirm={handleConfirmConversion}
        onCancel={handleCancelConversion}
        isConverting={isConverting}
      />
    </div>
  );
}

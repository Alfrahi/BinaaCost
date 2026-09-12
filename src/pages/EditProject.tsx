"use client";
import { useTranslation } from "react-i18next";
import ProjectForm from "@/components/project/ProjectForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useUpdateProject } from "@/hooks/useUpdateProject";
import { FormProvider } from "react-hook-form";
import { CurrencyConversionDialog } from "@/components/project/CurrencyConversionDialog";

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
      <div className="text-red-500 text-sm">
        {fetchError?.message || t("project_form:notFound")}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 text-sm">
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

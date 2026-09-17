"use client";
import ProjectForm from "@/features/projects/components/overview/ProjectForm";
import Breadcrumbs from "@/app/layout/Breadcrumbs";
import { useCreateProject } from "@/features/projects/hooks/useCreateProject";

export default function CreateProject() {
  const { form, handleSubmit, isPending, error } = useCreateProject();

  return (
    <div className="max-w-2xl mx-auto text-sm">
      <Breadcrumbs />
      <ProjectForm
        form={form}
        onSubmit={handleSubmit}
        isEditing={false}
        loading={isPending}
        error={error}
      />
    </div>
  );
}

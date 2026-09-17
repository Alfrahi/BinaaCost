"use client";
import ProjectForm from "@/features/projects/project-core/components/ProjectForm";
import Breadcrumbs from "@/app/layout/Breadcrumbs";
import { useCreateProject } from "@/features/projects/project-core/hooks/useCreateProject";

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

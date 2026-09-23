
import { ProjectForm, useCreateProject } from "@/features/projects";
import Breadcrumbs from "@/app/layout/Breadcrumbs";

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



import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Heading } from "@/shared/components/ui/heading";
import { AssemblyDetail, AssemblyList } from "@/features/cost-library/components/assemblies";

export default function LibraryAssembliesManager() {
  const { t } = useTranslation(["resources", "common"]);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null,
  );

  if (selectedAssemblyId) {
    return (
      <AssemblyDetail
        assemblyId={selectedAssemblyId}
        onBack={() => setSelectedAssemblyId(null)}
      />
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <Heading level={1}>
          {t("resources:assemblies.title")}
        </Heading>
      </div>
      <AssemblyList onSelectAssembly={setSelectedAssemblyId} />
    </div>
  );
}

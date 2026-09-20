

import { useState } from "react";
import { AssemblyDetail, AssemblyList } from "@/features/cost-library/components/assemblies";

export default function LibraryAssembliesManager() {
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

  return <AssemblyList onSelectAssembly={setSelectedAssemblyId} />;
}


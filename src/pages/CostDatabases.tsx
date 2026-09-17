"use client";

import { useState } from "react";
import CostDatabaseList from "@/features/cost-library/components/cost-databases/CostDatabaseList";
import CostDatabaseDetail from "@/features/cost-library/components/cost-databases/CostDatabaseDetail";
import Breadcrumbs from "@/app/layout/Breadcrumbs";

export default function CostDatabases() {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(
    null,
  );

  const handleViewDatabase = (id: string) => {
    setSelectedDatabaseId(id);
  };

  const handleBackToList = () => {
    setSelectedDatabaseId(null);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs /> {/* Add Breadcrumbs here */}
      {selectedDatabaseId ? (
        <CostDatabaseDetail
          databaseId={selectedDatabaseId}
          onBack={handleBackToList}
        />
      ) : (
        <CostDatabaseList onViewDatabase={handleViewDatabase} />
      )}
    </div>
  );
}

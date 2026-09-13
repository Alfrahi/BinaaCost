"use client";

import { useState } from "react";
import CostDatabaseList from "@/components/cost-database/CostDatabaseList";
import CostDatabaseDetail from "@/components/cost-database/CostDatabaseDetail";
import Breadcrumbs from "@/components/Breadcrumbs";

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

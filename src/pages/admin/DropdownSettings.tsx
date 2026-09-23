import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SettingsSection } from "@/features/admin";
import { useRole } from "@/features/auth";
import PageHeader from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface SettingsCategory {
  key: string;
  label: string;
  description: string;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    key: "project_type",
    label: "admin:dropdowns.projectTypes",
    description: "admin:dropdowns.projectTypesDescription",
  },
  {
    key: "project_size_unit",
    label: "admin:dropdowns.projectSizeUnits",
    description: "admin:dropdowns.projectSizeUnitsDescription",
  },
  {
    key: "duration_unit",
    label: "admin:dropdowns.duration_unit",
    description: "admin:dropdowns.durationUnitDescription",
  },
  {
    key: "material_unit",
    label: "admin:dropdowns.materialUnits",
    description: "admin:dropdowns.materialUnitsDescription",
  },
  {
    key: "equipment_rental_purchase",
    label: "admin:dropdowns.equipmentRentalPurchase",
    description: "admin:dropdowns.equipmentRentalPurchaseDescription",
  },
  {
    key: "equipment_period_unit",
    label: "admin:dropdowns.equipmentPeriodUnits",
    description: "admin:dropdowns.equipmentPeriodUnitsDescription",
  },
  {
    key: "additional_cost_category",
    label: "admin:dropdowns.additionalCostCategories",
    description: "admin:dropdowns.additionalCostCategoriesDescription",
  },
  {
    key: "risk_probability",
    label: "admin:dropdowns.riskProbabilities",
    description: "admin:dropdowns.riskProbabilitiesDescription",
  },
  {
    key: "currency",
    label: "admin:dropdowns.currencies",
    description: "admin:dropdowns.currenciesDescription",
  },
];

export default function DropdownSettings() {
  const { t, i18n } = useTranslation(["admin", "common", "navigation"]);
  const { isSuperAdmin, isAdmin } = useRole();

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin" aria-label={t("navigation:adminPanel")}>
                <ArrowLeft
                  className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <span>{t("admin:dropdowns.title")}</span>
          </div>
        }
        description={t("admin:dropdowns.description")}
      />
      <div className="space-y-8">
        {SETTINGS_CATEGORIES.map((category) => (
          <SettingsSection
            key={category.key}
            category={category.key}
            label={t(category.label)}
            description={t(category.description)}
            isAdmin={isAdmin || isSuperAdmin}
          />
        ))}
      </div>
    </div>
  );
}

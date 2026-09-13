import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import { useTranslation } from "react-i18next";
import PageHeader from "@/components/PageHeader";

export default function SubscriptionManagementPage() {
  const { t } = useTranslation(["admin", "common"]);
  return (
    <div className="space-y-6">
      <PageHeader title={t("admin:subscriptionManagement.title")} />
      <SubscriptionManagement />
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/RoleBadge";
import { X } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { format } from "date-fns";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import DataTable, {
  DataTableColumn,
} from "@/components/ui/data-table";
import {
  useAdminSubscriptionManagement,
  User,
} from "@/hooks/useAdminSubscriptionManagement";
import { useMemo } from "react";

export default function SubscriptionManagement() {
  const { t } = useTranslation(["admin", "common"]);
  const { formatDate } = useDateFormatter();
  const {
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    editingUserId,
    editingPlan,
    setEditingPlan,
    editingExpiry,
    setEditingExpiry,
    paginatedUsers,
    isLoading,
    isSuperAdmin,
    handleEdit,
    handleSave,
    handleCancel,
    updateSubscriptionMutation,
    totalPages,
    PLANS,
  } = useAdminSubscriptionManagement();

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      { key: "user", label: t("admin:subscriptionManagement.user") },
      { key: "role", label: t("admin:subscriptionManagement.role") },
      { key: "plan", label: t("admin:subscriptionManagement.plan") },
      {
        key: "projectLimit",
        label: t("admin:subscriptionManagement.projectLimit"),
      },
      { key: "expires", label: t("admin:subscriptionManagement.expires") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

  return (
    <div className="space-y-6 text-sm">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin:subscriptionManagement.searchTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder={t(
                  "admin:subscriptionManagement.searchPlaceholder",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("admin:subscriptionManagement.searchPlaceholder")}
                className="text-sm"
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                onClick={() => setSearch("")}
                className="px-3 text-sm"
                aria-label={t("common:clearFilters")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={paginatedUsers}
          getRowKey={(user) => user.id}
          renderRow={(user) => {
            const isEditing = editingUserId === user.id;
            return (
              <TableRow key={user.id}>
                <TableCell className="text-start min-w-[180px]">
                  <div className="font-medium text-sm">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                </TableCell>
                <TableCell className="text-start text-sm min-w-[100px]">
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell className="text-start min-w-[120px]">
                  {isEditing ? (
                    <Select value={editingPlan} onValueChange={setEditingPlan}>
                      <SelectTrigger className="w-[120px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map((plan) => (
                          <SelectItem key={plan.value} value={plan.value} className="text-sm">
                            {t(plan.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="capitalize text-sm">
                      {t(
                        `admin:subscriptionManagement.plan${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}`,
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-start text-sm min-w-[120px]">
                  {user.max_active_projects === null
                    ? t("admin:subscriptionManagement.unlimited")
                    : user.max_active_projects}
                </TableCell>
                <TableCell className="text-start min-w-[150px]">
                  {isEditing ? (
                    <Input
                      type="date"
                      value={
                        editingExpiry
                          ? format(new Date(editingExpiry), "yyyy-MM-dd")
                          : ""
                      }
                      onChange={(e) => setEditingExpiry(e.target.value)}
                      className="w-[150px] text-sm"
                    />
                  ) : user.subscription_expires_at ? (
                    formatDate(user.subscription_expires_at, "short")
                  ) : (
                    t("admin:subscriptionManagement.never")
                  )}
                </TableCell>
                <TableCell className="text-end min-w-[120px]">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateSubscriptionMutation.isPending}
                        className="text-sm"
                      >
                        {updateSubscriptionMutation.isPending
                          ? t("common:saving")
                          : t("common:save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        className="text-sm"
                      >
                        {t("common:cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(user)}
                      disabled={!isSuperAdmin}
                      className="text-sm"
                    >
                      {t("common:edit")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          }}
          isLoading={isLoading}
          emptyMessage={t("admin:subscriptionManagement.noUsersFound")}
          ariaLabel={t("admin:subscriptionManagement.searchTitle")}
        />

        <div className="p-4 border-t">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </Card>
    </div>
  );
}

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import PageHeader from "@/shared/components/PageHeader";
import { X, Eye, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { RoleBadge } from "@/features/admin/components/RoleBadge";
import EditRoleModal from "@/features/admin/components/EditRoleModal";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import DataTable, {
  DataTableColumn,
} from "@/shared/components/ui/data-table";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { useAdminUserManagement, UserProfile } from "@/features/admin/hooks/useAdminUserManagement";
import { useMemo } from "react";

export default function UserManagement() {
  const { t, i18n } = useTranslation(["admin", "common", "roles", "navigation"]);

  const {
    users,
    isLoading,
    error,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    editingUser,
    setEditingUser,
    deleteTarget,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    showFallbackWarning,
    updateUserRoleMutation,
    deleteUserMutation,
    handleDelete,
    totalPages,
  } = useAdminUserManagement();

  const columns = useMemo<DataTableColumn<UserProfile>[]>(
    () => [
      { key: "email", label: t("admin:users.email") },
      { key: "name", label: t("admin:users.name") },
      { key: "role", label: t("admin:users.role") },
      { key: "createdAt", label: t("admin:users.createdAt") },
      { key: "actions", label: t("common:actions"), align: "end" },
    ],
    [t],
  );

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
            <span>{t("admin:users.title")}</span>
          </div>
        }
      />

      {showFallbackWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("common:warning")}</AlertTitle>
          <AlertDescription>
            {t("admin:users.fallbackWarning")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder={t("admin:users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("admin:users.searchPlaceholder")}
          />
          {search && (
            <Button
              variant="ghost"
              onClick={() => setSearch("")}
              className="absolute end-0 top-0 h-full px-3"
              aria-label={t("common:clearFilters")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        getRowKey={(user) => user.id}
        renderRow={(user) => (
          <TableRow key={user.id}>
            <TableCell className="whitespace-nowrap text-sm text-foreground">
              {user.email}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-foreground">
              {user.first_name} {user.last_name}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm">
              <RoleBadge role={user.role} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {new Date(user.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="whitespace-nowrap text-end text-sm font-medium">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/users/${user.id}`}>
                    <Eye className={cn("w-4 h-4", getIconMarginClass())} />
                    {t("common:view")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(user)}
                >
                  {t("common:edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(user.id)}
                >
                  <Trash2 className={cn("w-4 h-4", getIconMarginClass())} />
                  {t("common:delete")}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
        stickyHeader
        isLoading={isLoading}
        emptyMessage={
          error ? (
            <>
              {t("admin:users.errorLoadingUsers")}
              <div className="text-destructive mt-2">{error.message}</div>
            </>
          ) : (
            t("admin:users.noUsersFound")
          )
        }
        ariaLabel={t("admin:users.title")}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        profile={editingUser}
        open={!!editingUser}
        onOpenChange={() => setEditingUser(null)}
        onSave={async (newRole) => {
          if (!editingUser) return;

          await updateUserRoleMutation.mutateAsync({
            user_id_to_update: editingUser.id,
            new_role: newRole,
          });
        }}
        loading={updateUserRoleMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() =>
          deleteTarget && deleteUserMutation.mutate(deleteTarget)
        }
        itemName={users.find((u) => u.id === deleteTarget)?.email}
        loading={deleteUserMutation.isPending}
      />
    </div>
  );
}

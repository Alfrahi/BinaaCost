import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { X, Eye, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { PaginationControls } from "@/components/PaginationControls";
import { Link } from "react-router-dom";
import { RoleBadge } from "@/components/RoleBadge";
import EditRoleModal from "@/components/EditRoleModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, getIconMarginClass } from "@/lib/utils";
import { useAdminUserManagement } from "@/hooks/useAdminUserManagement";

export default function UserManagement() {
  const { t } = useTranslation(["admin", "common", "roles"]);

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

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("admin:users.title")}</h1>
      </div>

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

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-background">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("admin:users.email")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("admin:users.name")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("admin:users.role")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("admin:users.plan")}
                </TableHead>
                <TableHead className="text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("admin:users.createdAt")}
                </TableHead>
                <TableHead className="text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("common:actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {error ? (
                      <>
                        {t("admin:users.errorLoadingUsers")}
                        <div className="text-destructive mt-2">
                          {error.message}
                        </div>
                      </>
                    ) : (
                      t("admin:users.noUsersFound")
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm">
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.plan}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-end text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${user.id}`}>
                            <Eye
                              className={cn("w-4 h-4", getIconMarginClass())}
                            />
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
                          <Trash2
                            className={cn("w-4 h-4", getIconMarginClass())}
                          />
                          {t("common:delete")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
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

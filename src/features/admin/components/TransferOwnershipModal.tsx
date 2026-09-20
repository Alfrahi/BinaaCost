import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";

interface TransferOwnershipModalProps {
  project: { id: string; name: string; user_id: string; owner_email?: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (newUserId: string) => void;
  loading: boolean;
}

export default function TransferOwnershipModal({
  project,
  open,
  onOpenChange,
  onTransfer,
  loading,
}: TransferOwnershipModalProps) {
  const { t } = useTranslation(["admin", "common"]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: users = [] } = useQuery<{ id: string; email: string; name?: string }[]>({
    queryKey: ["admin_transfer_users_list"],
    queryFn: async () => {
      const records = await pb.collection("users").getFullList({
        sort: "email",
        fields: "id,email,first_name,last_name",
      });
      return records.map((r: any) => ({
        id: r.id,
        email: r.email,
        name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email,
      }));
    },
    enabled: open,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (project) {
      setSelectedUserId(project.user_id || "");
    }
  }, [project, open]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {t("admin:projects.transferOwnership")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {t("admin:projects.transferDescription", {
              projectName: project.name,
              currentOwner: project.owner_email || project.user_id,
            })}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="new-owner-select" className="text-sm">
              {t("admin:projects.newOwner")}
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="new-owner-select" className="text-sm">
                <SelectValue placeholder={t("admin:projects.selectNewOwner")}>
                  {users.find((u) => u.id === selectedUserId)?.name ||
                    users.find((u) => u.id === selectedUserId)?.email}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-sm">
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-sm"
          >
            {t("common:cancel")}
          </Button>
          <Button
            onClick={() => onTransfer(selectedUserId)}
            disabled={loading || !selectedUserId || selectedUserId === project.user_id}
            className="text-sm"
          >
            {loading ? t("common:saving") : t("admin:projects.transferOwnership")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

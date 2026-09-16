"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Edit2, Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { LocationAdjustment } from "@/types/cost-databases";
import { useLocationAdjustments } from "@/hooks/useLocationAdjustments";

export default function LocationAdjustmentsManager({
  databaseId,
}: {
  databaseId?: string;
}) {
  const { t } = useTranslation("pages");
  const { user } = useAuth();
  const {
    locations,
    isLoading,
    error,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useLocationAdjustments(databaseId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<LocationAdjustment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocationAdjustment | null>(
    null,
  );

  const handleAddLocation = async (city: string, multiplier: number) => {
    if (!databaseId || !user?.id) {
      toast.error(t("common:mustBeLoggedIn"));
      return;
    }
    addLocation.mutate({
      database_id: databaseId,
      user_id: user.id,
      city,
      multiplier,
    });
    closeForm();
  };

  const handleUpdateLocation = async (
    id: string,
    city: string,
    multiplier: number,
  ) => {
    updateLocation.mutate({ id, city, multiplier });
    closeForm();
  };

  const handleDeleteLocation = async (id: string) => {
    deleteLocation.mutate({ id });
    setDeleteTarget(null);
  };

  const openForm = (location?: LocationAdjustment) => {
    setEditingLocation(location || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingLocation(null);
  };

  return (
    <div className="space-y-6">
      {databaseId ? (
        <>
          {isFormOpen && (
            <Card className="p-4">
              <Heading level={3} className="mb-4">
                {editingLocation
                  ? t("cost_databases.editLocation")
                  : t("cost_databases.addLocationTitle")}
              </Heading>
              <LocationForm
                editingLocation={editingLocation}
                onAdd={handleAddLocation}
                onUpdate={handleUpdateLocation}
                onCancel={closeForm}
              />
            </Card>
          )}
          <div className="flex justify-between items-center">
            <Heading level={1}>
              {t("cost_databases.locations")}
            </Heading>
            {!isFormOpen && (
              <Button onClick={() => openForm()} size="sm">
                <Plus className="w-4 h-4 ms-2" />
                {t("cost_databases.addLocation")}
              </Button>
            )}
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table className="min-w-full bg-card">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("cost_databases.city")}
                  </TableHead>
                  <TableHead className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("cost_databases.multiplier")}
                  </TableHead>
                  <TableHead className="px-6 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("common:actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card divide-y divide-border">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      {t("common:loading")}
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-destructive">
                      {t("common:error")}: {error.message}
                    </TableCell>
                  </TableRow>
                ) : locations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      {t("cost_databases.noLocationAdjustments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-foreground">
                        {location.city}
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-sm text-foreground">
                        {location.multiplier}
                      </TableCell>
                      <TableCell className="px-6 py-3 whitespace-nowrap text-end text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openForm(location)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteTarget(location)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) {
                handleDeleteLocation(deleteTarget.id);
              }
            }}
            title={t("common:areYouSure")}
            body={t("cost_databases.deleteLocationConfirmation")}
            confirmLabel={t("common:delete")}
            destructive
          />
        </>
      ) : (
        <EmptyState message={t("cost_databases.selectDatabaseToManageLocations")} />
      )}
    </div>
  );
}

interface LocationFormProps {
  editingLocation?: LocationAdjustment | null;
  onAdd: (city: string, multiplier: number) => void;
  onUpdate: (id: string, city: string, multiplier: number) => void;
  onCancel: () => void;
}

function LocationForm({
  editingLocation,
  onAdd,
  onUpdate,
  onCancel,
}: LocationFormProps) {
  const { t } = useTranslation("pages");
  const [city, setCity] = useState(editingLocation?.city || "");
  const [multiplier, setMultiplier] = useState(
    editingLocation?.multiplier?.toString() || "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMultiplier = parseFloat(multiplier);
    if (isNaN(parsedMultiplier)) {
      toast.error(t("cost_databases.invalidMultiplierValue"));
      return;
    }
    if (editingLocation) {
      onUpdate(editingLocation.id, city, parsedMultiplier);
    } else {
      onAdd(city, parsedMultiplier);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label
          htmlFor="city"
          className="block text-sm font-medium text-foreground"
        >
          {t("cost_databases.city")}
        </Label>
        <Input
          type="text"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("cost_databases.city")}
          required
          className="mt-1 text-sm"
        />
      </div>
      <div>
        <Label
          htmlFor="multiplier"
          className="block text-sm font-medium text-foreground"
        >
          {t("cost_databases.multiplier")}
        </Label>
        <Input
          type="number"
          id="multiplier"
          value={multiplier}
          onChange={(e) => setMultiplier(e.target.value)}
          placeholder={t("cost_databases.multiplierPlaceholder")}
          required
          className="mt-1 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-sm"
        >
          {t("common:cancel")}
        </Button>
        <Button type="submit" className="text-sm">
          {editingLocation ? t("common:update") : t("common:add")}
        </Button>
      </div>
    </form>
  );
}

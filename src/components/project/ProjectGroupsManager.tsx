import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Edit2, Trash2, Plus, GripVertical, X } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useProjectGroupsManager,
  ProjectGroup,
} from "@/hooks/useProjectGroupsManager";

interface AddGroupFormProps {
  isAdding: boolean;
  onAdd: (name: string) => void;
}

function AddGroupForm({ isAdding, onAdd }: AddGroupFormProps) {
  const { t } = useTranslation("project_detail");
  const [newGroupName, setNewGroupName] = useState("");

  const handleSubmit = () => {
    if (newGroupName.trim()) {
      onAdd(newGroupName);
      setNewGroupName("");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder={t("groups.newGroupPlaceholder")}
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        className="bg-card text-sm"
        aria-label={t("groups.newGroupPlaceholder")}
      />
      <Button
        onClick={handleSubmit}
        disabled={!newGroupName.trim() || isAdding}
        aria-label={t("common:add")}
        className="text-sm"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

interface EditGroupFormProps {
  group: ProjectGroup;
  onSave: (group: ProjectGroup) => void;
  onCancel: () => void;
  isUpdating: boolean;
}

function EditGroupForm({
  group,
  onSave,
  onCancel,
  isUpdating,
}: EditGroupFormProps) {
  const { t } = useTranslation(["project_detail", "common"]);
  const [editedName, setEditedName] = useState(group.name);

  const handleSave = () => {
    onSave({ ...group, name: editedName });
  };

  return (
    <div className="flex gap-2 w-full">
      <Input
        value={editedName}
        onChange={(e) => setEditedName(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        aria-label={t("groups.groupName")}
        className="text-sm"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={isUpdating || !editedName.trim() || editedName === group.name}
        className="text-sm"
      >
        {t("common:save")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        className="text-sm"
      >
        {t("common:cancel")}
      </Button>
    </div>
  );
}

function SortableGroupItem({
  group,
  editingGroup,
  setEditingGroup,
  updateGroup,
  onRequestDelete,
  t,
  isUpdating,
}: {
  group: ProjectGroup;
  editingGroup: ProjectGroup | null;
  setEditingGroup: (g: ProjectGroup | null) => void;
  updateGroup: (g: ProjectGroup) => void;
  onRequestDelete: (g: ProjectGroup) => void;
  t: any;
  isUpdating: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border border-border rounded-sm bg-card mb-2 text-sm"
    >
      {editingGroup?.id === group.id ? (
        <EditGroupForm
          group={editingGroup}
          onSave={updateGroup}
          onCancel={() => setEditingGroup(null)}
          isUpdating={isUpdating}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-sm touch-none"
              aria-label={`${t("common:move")} ${group.name}`}
            >
              <GripVertical
                className="w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
            <span className="text-foreground">{group.name}</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setEditingGroup(group)}
              aria-label={`${t("common:edit")} ${group.name}`}
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRequestDelete(group)}
              aria-label={`${t("common:delete")} ${group.name}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectGroupsManager({
  projectId,
  groups: initialGroups = [],
  onClose,
}: {
  projectId: string;
  groups: ProjectGroup[];
  onClose: () => void;
}) {
  const { t } = useTranslation(["common", "project_detail"]);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectGroup | null>(null);

  const {
    groups,
    addGroup,
    updateGroup,
    deleteGroup,
    handleDragEnd,
    isAddingGroup,
    isUpdatingGroup,
    isDeletingGroup,
  } = useProjectGroupsManager(projectId, initialGroups);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <div className="border border-border rounded-lg p-4 bg-muted mb-4 shadow-sm text-sm">
      <div className="flex justify-between items-center mb-4">
        <Heading level={3} className="text-foreground">
          {t("project_detail:groups.manageGroups")}
        </Heading>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t("common:close")}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4 my-4">
        <AddGroupForm isAdding={isAddingGroup} onAdd={addGroup} />

        <div className="space-y-2 max-h-[300px] overflow-y-auto px-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {(groups || []).map((group) => (
                <SortableGroupItem
                  key={group.id}
                  group={group}
                  editingGroup={editingGroup}
                  setEditingGroup={setEditingGroup}
                  updateGroup={(g) => updateGroup(g)}
                  onRequestDelete={setDeleteTarget}
                  t={t}
                  isUpdating={isUpdatingGroup}
                />
              ))}
            </SortableContext>
          </DndContext>

          {(groups || []).length === 0 && (
            <EmptyState message={t("project_detail:groups.noGroups")} />
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose} className="text-sm">
          {t("common:close")}
        </Button>
      </div>

      <DeleteConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteGroup(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        itemName={deleteTarget?.name}
        loading={isDeletingGroup}
      />
    </div>
  );
}

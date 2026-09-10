import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Copy, MessageSquare } from "lucide-react";

interface ItemActionsProps {
  isOwner: boolean;
  onComment?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  commentLabel?: string;
  duplicateLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
}

/**
 * Shared row/card action buttons (comment, duplicate, edit, delete) with
 * ≥44px touch targets for mobile. Used by both desktop table rows and the
 * mobile card view.
 */
export function ItemActions({
  isOwner,
  onComment,
  onDuplicate,
  onEdit,
  onDelete,
  commentLabel,
  duplicateLabel,
  editLabel,
  deleteLabel,
}: ItemActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {onComment && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onComment}
          title={commentLabel}
          aria-label={commentLabel}
          className="h-11 w-11"
        >
          <MessageSquare className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </Button>
      )}
      {isOwner && (
        <>
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              title={duplicateLabel}
              aria-label={duplicateLabel}
              className="h-11 w-11"
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              title={editLabel}
              aria-label={editLabel}
              className="h-11 w-11"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              title={deleteLabel}
              aria-label={deleteLabel}
              className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
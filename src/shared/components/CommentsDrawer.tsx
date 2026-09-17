import { useState, useRef, useEffect, useCallback } from "react";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { sanitizeHtml } from "@/shared/lib/sanitizeText";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDateFormatter } from "@/shared/hooks/useDateFormatter";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Send,
  MessageSquare,
  Edit2,
  Trash2,
  X,
  Check,
  ArrowDownCircle,
} from "lucide-react";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { cn } from "@/shared/lib/utils";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onUpdateComment?: (id: string, content: string) => Promise<void>;
  onDeleteComment?: (id: string) => Promise<void>;
  itemName?: string;
  loading?: boolean;
  currentUserId?: string;
}

const SCROLL_THRESHOLD = 150;

export default function CommentsDrawer({
  open,
  onOpenChange,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  itemName,
  loading = false,
  currentUserId,
}: Props) {
  const { t, i18n } = useTranslation(["project_detail", "common"]);
  const { formatDate } = useDateFormatter();
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isRtl = i18n.dir() === "rtl";

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
      setShowScrollToBottom(false);
    }
  }, [scrollAreaRef]);

  useEffect(() => {
    if (!open || editingCommentId) return;

    const scrollElement = scrollAreaRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom =
        scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
      setShowScrollToBottom(!isNearBottom);
    };

    handleScroll();

    scrollElement.addEventListener("scroll", handleScroll);

    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const isUserAtBottom =
      scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;

    if (isUserAtBottom) {
      scrollToBottom();
    } else {
      setShowScrollToBottom(true);
    }

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, [comments, open, editingCommentId, scrollToBottom]);

  const handleSubmit = async () => {
    const clean = sanitizeText(newComment) || "";
    if (!clean.trim()) return;

    await onAddComment(clean);
    setNewComment("");
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const saveEdit = async (id: string) => {
    if (!onUpdateComment) return;
    const clean = sanitizeText(editContent) || "";
    if (!clean.trim()) return;

    await onUpdateComment(id, clean);
    setEditingCommentId(null);
  };

  const confirmDelete = async () => {
    if (!onDeleteComment || !deleteCommentId) return;
    await onDeleteComment(deleteCommentId);
    setDeleteCommentId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col h-full p-0 text-sm bg-card"
        side={isRtl ? "left" : "right"}
      >
        <SheetHeader
          className={cn(
            "p-6 border-b border-border",
            "sm:text-start",
          )}
        >
          <SheetTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <MessageSquare className="w-5 h-5" />
            {t("comments.title", { item: itemName || t("common:item") })}
          </SheetTitle>
          <SheetDescription
            className={cn(
              "text-sm text-muted-foreground pt-2",
              "sm:text-start",
            )}
          >
            {t("common:commentCount", { count: comments.length })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6 relative" ref={scrollAreaRef}>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center text-sm">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p>{t("comments.noComments")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => {
                const initials = (
                  (comment.profiles?.first_name?.[0] || "") +
                  (comment.profiles?.last_name?.[0] ||
                    comment.profiles?.email?.[0] ||
                    "?")
                ).toUpperCase();

                const name = comment.profiles?.first_name
                  ? `${comment.profiles.first_name} ${comment.profiles.last_name || ""}`
                  : comment.profiles?.email || t("common:unknownUser");

                const isOwner =
                  currentUserId && comment.user_id === currentUserId;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="w-8 h-8 mt-1 flex items-center justify-center bg-muted rounded-full text-foreground shrink-0">
                      <span className="text-xs font-medium">{initials}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at, "dateTime")}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-7 px-2 text-sm"
                            >
                              <X className="w-4 h-4 ms-1" />{" "}
                              {t("common:cancel")}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(comment.id)}
                              className="h-7 px-2 text-sm"
                              disabled={loading}
                            >
                              <Check className="w-4 h-4 ms-1" />{" "}
                              {t("common:save")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div
                            className="text-sm text-foreground bg-muted p-3 rounded-lg rounded-tl-none group-hover:bg-border transition-colors"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(comment.content),
                            }}
                          />

                          {isOwner && (
                            <div className="absolute top-0 end-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity flex gap-1 p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                onClick={() => startEditing(comment)}
                                title={t("common:edit")}
                                aria-label={t("common:edit")}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteCommentId(comment.id)}
                                title={t("common:delete")}
                                aria-label={t("common:delete")}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {showScrollToBottom && (
            <Button
              onClick={scrollToBottom}
              className="absolute bottom-4 end-4 rounded-full shadow-lg text-sm"
              size="sm"
            >
              <ArrowDownCircle className="w-4 h-4 ms-2" />
              {t("common:newComments")}
            </Button>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card mt-auto">
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("comments.placeholder")}
              className="min-h-[80px] resize-none text-sm"
              disabled={loading}
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || !newComment.trim()}
              size="icon"
              className="h-[80px] w-[60px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>

      <DeleteConfirmationDialog
        open={!!deleteCommentId}
        onOpenChange={() => setDeleteCommentId(null)}
        onConfirm={confirmDelete}
        loading={loading}
      />
    </Sheet>
  );
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  created_at: string;
  total_rows?: number;
}

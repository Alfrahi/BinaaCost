export interface CostDatabase {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  currency: string;
}

export interface LocationAdjustment {
  id: string;
  database_id: string;
  user_id: string;
  city: string;
  multiplier: number;
  created_at: string;
  updated_at: string;
}

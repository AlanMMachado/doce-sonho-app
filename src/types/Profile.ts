export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  birth_date: string;
  daily_goal: number;
  charge_message_template?: string | null;
  pix_key?: string | null;
};

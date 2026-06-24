import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/Profile';

export class ProfileService {
  static async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ?? null;
  }

  static async create(userId: string, data: Omit<Profile, 'id' | 'user_id'>): Promise<Profile> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({ user_id: userId, ...data })
      .select()
      .single();
    if (error) throw error;
    return profile;
  }

  static async update(userId: string, data: Partial<Pick<Profile, 'full_name' | 'birth_date' | 'daily_goal'>>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

import { supabase } from '@/lib/supabase';
import { Perfil } from '@/types/Perfil';

export class PerfilService {
    static async get(userId: string): Promise<Perfil | null> {
        const { data, error } = await supabase
            .from('perfil')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ?? null;
    }

    static async criar(userId: string, dados: Omit<Perfil, 'id' | 'user_id'>): Promise<Perfil> {
        const { data, error } = await supabase
            .from('perfil')
            .insert({ user_id: userId, ...dados })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async atualizar(userId: string, dados: Partial<Pick<Perfil, 'nome_completo' | 'data_nascimento' | 'meta_diaria'>>): Promise<void> {
        const { error } = await supabase
            .from('perfil')
            .update(dados)
            .eq('user_id', userId);
        if (error) throw error;
    }
}

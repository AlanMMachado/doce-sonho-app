import { supabase } from '@/lib/supabase';
import { ProdutoConfig, ProdutoConfigCreateParams } from '@/types/ProdutoConfig';

export class ProdutoConfigService {
    static async create(userId: string, params: ProdutoConfigCreateParams): Promise<ProdutoConfig> {
        const { data, error } = await supabase
            .from('produto_configs')
            .insert({
                user_id: userId,
                tipo: params.tipo,
                tipo_customizado: params.tipo_customizado ?? null,
                preco_base: params.preco_base,
                preco_promocao: params.preco_promocao ?? null,
                quantidade_promocao: params.quantidade_promocao ?? null,
                ativo: true,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    static async getAll(userId: string): Promise<ProdutoConfig[]> {
        const { data, error } = await supabase
            .from('produto_configs')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true)
            .order('tipo')
            .order('tipo_customizado');
        if (error) throw error;
        return data ?? [];
    }

    static async getById(userId: string, id: string): Promise<ProdutoConfig | null> {
        const { data, error } = await supabase
            .from('produto_configs')
            .select('*')
            .eq('user_id', userId)
            .eq('id', id)
            .eq('ativo', true)
            .single();
        if (error) return null;
        return data;
    }

    static async update(userId: string, id: string, params: Partial<ProdutoConfigCreateParams>): Promise<void> {
        const { error } = await supabase
            .from('produto_configs')
            .update(params)
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    }

    static async delete(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('produto_configs')
            .update({ ativo: false })
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    }

    static async getByTipo(userId: string, tipo: string, tipoCustomizado?: string): Promise<ProdutoConfig | null> {
        let query = supabase
            .from('produto_configs')
            .select('*')
            .eq('user_id', userId)
            .eq('tipo', tipo)
            .eq('ativo', true);

        if (tipoCustomizado) {
            query = query.eq('tipo_customizado', tipoCustomizado);
        } else {
            query = query.is('tipo_customizado', null);
        }

        const { data } = await query.single();
        return data ?? null;
    }
}

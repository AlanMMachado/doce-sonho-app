import { PerfilService } from '@/service/perfilService';
import { Perfil } from '@/types/Perfil';
import { Remessa } from '@/types/Remessa';
import { Venda } from '@/types/Venda';
import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './AuthContext';

interface AppState {
  remessaAtiva: Remessa | null;
  vendas: Venda[];
  perfil: Perfil | null;
  loading: boolean;
}

type AppAction =
  | { type: 'SET_REMESSA_ATIVA'; payload: Remessa | null }
  | { type: 'ADD_VENDA'; payload: Venda }
  | { type: 'UPDATE_VENDA'; payload: Venda }
  | { type: 'SET_VENDAS'; payload: Venda[] }
  | { type: 'SET_PERFIL'; payload: Perfil | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> };

const initialState: AppState = {
  remessaAtiva: null,
  vendas: [],
  perfil: null,
  loading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_REMESSA_ATIVA':
      return { ...state, remessaAtiva: action.payload };
    case 'ADD_VENDA':
      return { ...state, vendas: [action.payload, ...state.vendas] };
    case 'UPDATE_VENDA':
      return {
        ...state,
        vendas: state.vendas.map(v => v.id === action.payload.id ? action.payload : v),
      };
    case 'SET_VENDAS':
      return { ...state, vendas: action.payload };
    case 'SET_PERFIL':
      return { ...state, perfil: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOAD_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  recarregarPerfil: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  const recarregarPerfil = async () => {
    if (!user) return;
    try {
      const perfil = await PerfilService.get(user.id);
      dispatch({ type: 'SET_PERFIL', payload: perfil });
    } catch (error) {
      console.error('Erro ao recarregar perfil:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;
    recarregarPerfil();
  }, [user?.id]);

  return (
    <AppContext.Provider value={{ state, dispatch, recarregarPerfil }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
}

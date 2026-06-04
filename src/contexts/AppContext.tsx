import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { ConfigService } from '../service/configService';
import { SyncService } from '../service/syncService';
import { Remessa } from '../types/Remessa';
import { Venda } from '../types/Venda';

interface AppState {
  remessaAtiva: Remessa | null;
  vendas: Venda[];
  configuracoes: Record<string, any>;
  loading: boolean;
}

type AppAction = 
  | { type: 'SET_REMESSA_ATIVA'; payload: Remessa | null }
  | { type: 'ADD_VENDA'; payload: Venda }
  | { type: 'UPDATE_VENDA'; payload: Venda }
  | { type: 'SET_VENDAS'; payload: Venda[] }
  | { type: 'UPDATE_CONFIG'; payload: { chave: string; valor: any } }
  | { type: 'SET_CONFIGURACOES'; payload: Record<string, any> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> };

const initialState: AppState = {
  remessaAtiva: null,
  vendas: [],
  configuracoes: {},
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
        vendas: state.vendas.map(v => v.id === action.payload.id ? action.payload : v) 
      };
    case 'SET_VENDAS':
      return { ...state, vendas: action.payload };
    case 'UPDATE_CONFIG':
      return { 
        ...state, 
        configuracoes: { 
          ...state.configuracoes, 
          [action.payload.chave]: action.payload.valor 
        } 
      };
    case 'SET_CONFIGURACOES':
      return { ...state, configuracoes: action.payload };
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
  recarregarConfiguracoes: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Função para recarregar configurações
  const recarregarConfiguracoes = async () => {
    try {
      const configs = await ConfigService.getAllAsRecord();
      dispatch({ type: 'SET_CONFIGURACOES', payload: configs });
    } catch (error) {
      console.error('Erro ao recarregar configurações:', error);
      throw error;
    }
  };

  // Inicializar configurações padrão
  useEffect(() => {
    const inicializarConfigs = async () => {
      try {
        await ConfigService.inicializarConfiguracoesPadrao();
        await recarregarConfiguracoes();
      } catch (error) {
        console.error('Erro ao inicializar configurações:', error);
      }
    };

    inicializarConfigs();
  }, []);

  // Sincronizar clientes na inicialização do app
  useEffect(() => {
    const syncClientes = async () => {
      try {
        await SyncService.syncAllClientes();
      } catch (error) {
        console.error('Erro ao sincronizar clientes:', error);
      }
    };

    syncClientes();
  }, []);

  // Sincronizar cliente quando uma venda é adicionada ou atualizada
  useEffect(() => {
    const syncClienteFromVenda = async (venda: Venda) => {
      try {
        await SyncService.syncClienteFromVenda(venda);
      } catch (error) {
        console.error('Erro ao sincronizar cliente da venda:', error);
      }
    };

    if (state.vendas.length > 0) {
      const ultimaVenda = state.vendas[state.vendas.length - 1];
      syncClienteFromVenda(ultimaVenda);
    }
  }, [state.vendas]);

  return (
    <AppContext.Provider value={{ state, dispatch, recarregarConfiguracoes }}>
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
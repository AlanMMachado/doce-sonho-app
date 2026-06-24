import { ProfileService } from '@/service/profileService';
import { Profile } from '@/types/Profile';
import { Sale } from '@/types/Sale';
import { Shipment } from '@/types/Shipment';
import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { useAuth } from './AuthContext';

interface AppState {
  activeShipment: Shipment | null;
  sales: Sale[];
  profile: Profile | null;
  loading: boolean;
}

type AppAction =
  | { type: 'SET_ACTIVE_SHIPMENT'; payload: Shipment | null }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: Sale }
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> };

const initialState: AppState = {
  activeShipment: null,
  sales: [],
  profile: null,
  loading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_SHIPMENT':
      return { ...state, activeShipment: action.payload };
    case 'ADD_SALE':
      return { ...state, sales: [action.payload, ...state.sales] };
    case 'UPDATE_SALE':
      return {
        ...state,
        sales: state.sales.map(s => s.id === action.payload.id ? action.payload : s),
      };
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
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
  reloadProfile: () => Promise<Profile | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  const reloadProfile = async () => {
    if (!user) return null;
    try {
      const profile = await ProfileService.get(user.id);
      dispatch({ type: 'SET_PROFILE', payload: profile });
      return profile;
    } catch (error) {
      console.error('Erro ao recarregar perfil:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!user) return;
    reloadProfile();
  }, [user?.id]);

  return (
    <AppContext.Provider value={{ state, dispatch, reloadProfile }}>
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

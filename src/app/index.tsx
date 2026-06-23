import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return <Redirect href={session ? '/(tabs)/dashboard' : '/login'} />;
}

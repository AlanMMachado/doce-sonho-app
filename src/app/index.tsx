import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index(){
  const router = useRouter();

  useEffect(() => {
    // Aguarda o Root Layout estar pronto antes de navegar
    const timeout = setTimeout(() => {
      router.replace("/(tabs)/dashboard");
    }, 100);

    return () => clearTimeout(timeout);
  }, [router]);

  // Mostra um loading enquanto aguarda
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: "#f0f0f0"
    }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}
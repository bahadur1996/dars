import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed'
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono'
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors, fonts } from '../components/theme'
import { AuthProvider, useAuth } from '../lib/auth'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function Navigator() {
  const { user, restoring } = useAuth()
  if (restoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.plate} size="large" />
      </View>
    )
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22 },
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: 'DARS Field' }} />
        <Stack.Screen name="drivers/new" options={{ title: 'Register driver' }} />
        <Stack.Screen name="drivers/[id]" options={{ title: 'Driver' }} />
        <Stack.Screen name="rickshaws/new" options={{ title: 'Register rickshaw' }} />
        <Stack.Screen name="rickshaws/[id]" options={{ title: 'Rickshaw' }} />
        <Stack.Screen name="search" options={{ title: 'Find a rickshaw' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan card', headerTransparent: true }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const [loaded] = useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, IBMPlexSans_400Regular, IBMPlexSans_600SemiBold, IBMPlexMono_400Regular })
  if (!loaded) return null
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Navigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

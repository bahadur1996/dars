import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts } from '../components/theme'
import { Banner, Button, Field, Plate } from '../components/ui'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ padding: 24, paddingTop: 48 }}>
          <Text style={{ fontFamily: fonts.display, color: colors.white, fontSize: 20, letterSpacing: 3 }}>DARS FIELD</Text>
          <View style={{ marginTop: 32 }}>
            <Plate number="DHK-AR-000001" size="lg" />
          </View>
          <Text style={{ fontFamily: fonts.display, color: '#E6ECE9', fontSize: 30, lineHeight: 32, marginTop: 20 }}>
            Register auto-rickshaws where they park.
          </Text>
        </View>
        <View style={{ backgroundColor: colors.paper, padding: 24, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
          <Banner message={error} />
          <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => void submit()} />
          <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={() => void submit()} busy={busy} disabled={!username || !password} />
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 14, textAlign: 'center' }}>
            Authorized officers only. Every action is recorded.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

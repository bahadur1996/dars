import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts } from './theme'

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.title} accessibilityRole="header">
        {children}
      </Text>
      {sub ? <Text style={styles.muted}>{sub}</Text> : null}
    </View>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

export function Body({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>
}

export function Mono({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.ink }}>{children}</Text>
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

type ButtonKind = 'primary' | 'outline' | 'text'

export function Button({ title, onPress, kind = 'primary', disabled, busy, icon }: { title: string; onPress: () => void; kind?: ButtonKind; disabled?: boolean; busy?: boolean; icon?: ReactNode }) {
  const off = disabled || busy
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.button, styles[`button_${kind}`], off && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
    >
      {busy ? <ActivityIndicator color={kind === 'primary' ? colors.white : colors.plate} /> : icon}
      <Text style={[styles.buttonText, kind === 'primary' ? { color: colors.white } : { color: colors.plate }]}>{title}</Text>
    </Pressable>
  )
}

export function Field({ label, error, hint, required, ...input }: TextInputProps & { label: string; error?: string; hint?: string; required?: boolean }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.signal }}> *</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.signal } : null]}
        {...input}
      />
      {error || hint ? <Text style={[styles.help, error ? { color: colors.signal } : null]}>{error ?? hint}</Text> : null}
    </View>
  )
}

/** A row of tappable chips for short single-choice lists (gender, blood group). */
export function Chips<T extends string>({ label, options, value, onChange, error, required }: { label: string; options: { value: T; label: string }[]; value: T | null | undefined; onChange: (v: T) => void; error?: string; required?: boolean }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.signal }}> *</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.value)}
              style={[styles.chip, on && { backgroundColor: colors.plate, borderColor: colors.plate }]}
            >
              <Text style={{ fontFamily: fonts.bodyBold, color: on ? colors.white : colors.ink }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <Text style={[styles.help, { color: colors.signal }]}>{error}</Text> : null}
    </View>
  )
}

export function Banner({ message, kind = 'error' }: { message: string | null | undefined; kind?: 'error' | 'success' }) {
  if (!message) return null
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, kind === 'error' ? { backgroundColor: '#FBEAE8', borderColor: colors.signal } : { backgroundColor: colors.successBg, borderColor: colors.plate }]}
    >
      <Text style={styles.body}>{message}</Text>
    </View>
  )
}

/** Rickshaw number as a Bangladeshi commercial number plate. */
export function Plate({ number, size = 'md' }: { number: string; size?: 'sm' | 'md' | 'lg' }) {
  const font = { sm: 15, md: 22, lg: 34 }[size]
  return (
    <View accessibilityLabel={`Rickshaw number ${number}`} style={[styles.plate, size === 'sm' && { paddingVertical: 2, paddingHorizontal: 6 }]}>
      <View style={[styles.plateInner, size === 'sm' && { paddingHorizontal: 4, paddingVertical: 1 }]}>
        {size !== 'sm' ? <Text style={styles.plateCity}>ঢাকা · DHAKA</Text> : null}
        <Text style={{ fontFamily: fonts.display, fontSize: font, color: colors.white, letterSpacing: 1.5 }}>{number}</Text>
      </View>
    </View>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <View style={[styles.badge, active ? { borderColor: colors.plate } : { backgroundColor: colors.signal, borderColor: colors.signal }]}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: active ? colors.plate : colors.white }}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Text>
    </View>
  )
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.help}>{label}</Text>
      {typeof children === 'string' ? <Text style={styles.body}>{children}</Text> : children}
    </View>
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, lineHeight: 36 },
  sectionLabel: { fontFamily: fonts.displaySemi, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, marginBottom: 10 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.white, borderColor: colors.rule, borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 12 },
  button: { minHeight: 48, borderRadius: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  button_primary: { backgroundColor: colors.plate },
  button_outline: { borderWidth: 1.5, borderColor: colors.plate, backgroundColor: colors.white },
  button_text: { backgroundColor: 'transparent' },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, backgroundColor: colors.white, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  help: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, marginTop: 4 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.white },
  banner: { borderLeftWidth: 4, borderRadius: 6, padding: 12, marginBottom: 14, borderWidth: 0 },
  plate: { alignSelf: 'flex-start', backgroundColor: colors.plate, borderRadius: 5, padding: 3, borderWidth: 1, borderColor: colors.plateDark },
  plateInner: { borderWidth: 1.5, borderColor: colors.white, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 3, alignItems: 'center' },
  plateCity: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
})

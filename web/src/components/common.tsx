import { Box, Chip, Stack, Typography, type ChipProps } from '@mui/material'
import type { ReactNode } from 'react'
import { colors, fonts } from '../theme'

const STATUS_COLOR: Record<string, ChipProps['color']> = {
  ACTIVE: 'primary',
  SUSPENDED: 'warning',
  IMPOUNDED: 'error',
  BLACKLISTED: 'error',
}

export function StatusChip({ status }: { status: string }) {
  return (
    <Chip
      size="small"
      label={status.charAt(0) + status.slice(1).toLowerCase()}
      color={STATUS_COLOR[status] ?? 'default'}
      variant={status === 'ACTIVE' ? 'outlined' : 'filled'}
    />
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', mb: 3 }}>
      <Box>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
    </Stack>
  )
}

/** Monospace rendering for identifiers (NID, driver code, mobile). */
export function Mono({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: '0.9em', letterSpacing: '0.02em' }}>
      {children}
    </Box>
  )
}

/** Label/value pair for detail pages. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children ?? '—'}
      </Typography>
    </Box>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Box component="section" sx={{ bgcolor: colors.white, border: `1px solid ${colors.rule}`, borderRadius: 1.5, p: { xs: 2, md: 3 } }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h2" color="text.secondary">
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  )
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <Typography variant="h3" component="p" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

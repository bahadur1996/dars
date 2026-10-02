import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link as RouterLink } from 'react-router-dom'
import { dashboardApi, rickshawApi } from '../api/endpoints'
import type { Count } from '../api/types'
import { formatDate, PageHeader, Section, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { colors, fonts } from '../theme'

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })
  const recent = useQuery({ queryKey: ['rickshaws', 'recent'], queryFn: () => rickshawApi.search({ size: 6 }) })
  const s = summary.data

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Registrations across Dhaka, updated live." />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 3 }}>
        <Stat label="Rickshaws registered" value={s?.totalRickshaws} />
        <Stat label="Active rickshaws" value={s?.activeRickshaws} />
        <Stat label="Drivers registered" value={s?.totalDrivers} />
        <Stat label="Registered today" value={s?.registeredToday} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, mb: 2 }}>
        <Section title="Rickshaws registered per day · last 30 days">
          <Box sx={{ height: 240 }}>
            {s ? (
              <ResponsiveContainer>
                <BarChart data={s.perDay} margin={{ left: -24, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={colors.rule} />
                  <XAxis dataKey="label" tickFormatter={(d: string) => d.slice(8)} tick={{ fontSize: 11, fill: colors.muted }} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.muted }} />
                  <Tooltip labelFormatter={(d) => formatDate(String(d))} formatter={(v) => [v, 'Registered']} cursor={{ fill: colors.paper }} />
                  <Bar dataKey="count" fill={colors.plate} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton variant="rectangular" height="100%" />
            )}
          </Box>
        </Section>
        <Section title="By thana">
          <RankList rows={s?.perThana} empty="No rickshaws yet." />
        </Section>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <Section title="Latest registrations">
          {recent.data?.content.length === 0 && <Typography color="text.secondary">Nothing registered yet. Use “Register rickshaw” to add the first one.</Typography>}
          <Stack divider={<Box sx={{ borderTop: `1px solid ${colors.rule}` }} />}>
            {recent.data?.content.map((r) => (
              <Stack key={r.id} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.25, textDecoration: 'none', color: 'inherit' }} component={RouterLink} to={`/rickshaws/${r.id}`}>
                <Plate number={r.rickshawNumber} size="sm" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {r.currentDriver?.fullName ?? 'No driver'} · {r.thana}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(r.registeredAt)} by {r.registeredBy.fullName}
                  </Typography>
                </Box>
                <StatusChip status={r.status} />
              </Stack>
            ))}
          </Stack>
        </Section>
        <Section title="Top officers">
          <RankList rows={s?.topOfficers} empty="No registrations yet." />
        </Section>
      </Box>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Box sx={{ bgcolor: colors.white, border: `1px solid ${colors.rule}`, borderRadius: 1.5, p: 2 }}>
      <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '2.2rem', lineHeight: 1.1 }}>
        {value === undefined ? <Skeleton width={60} /> : value.toLocaleString('en-IN')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  )
}

function RankList({ rows, empty }: { rows: Count[] | undefined; empty: string }) {
  if (!rows) return <Skeleton variant="rectangular" height={120} />
  if (rows.length === 0) return <Typography color="text.secondary">{empty}</Typography>
  const max = Math.max(...rows.map((r) => r.count))
  return (
    <Stack spacing={1.25}>
      {rows.map((r) => (
        <Box key={r.label}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2">{r.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {r.count}
            </Typography>
          </Stack>
          <Box sx={{ height: 4, bgcolor: colors.paper, borderRadius: 2, mt: 0.5 }}>
            <Box sx={{ height: '100%', width: `${(r.count / max) * 100}%`, bgcolor: colors.plate, borderRadius: 2 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  )
}

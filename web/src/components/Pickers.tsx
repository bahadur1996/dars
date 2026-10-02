import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { driverApi, ownerApi } from '../api/endpoints'
import type { Driver, Owner } from '../api/types'
import { AuthImage } from './AuthImage'
import { Mono, StatusChip } from './common'

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/** Search drivers by name, driver code, NID or mobile. */
export function DriverPicker({ value, onChange, error, label = 'Driver' }: { value: Driver | null; onChange: (d: Driver | null) => void; error?: string; label?: string }) {
  const [input, setInput] = useState('')
  const q = useDebounced(input)
  const { data, isFetching } = useQuery({ queryKey: ['drivers', 'pick', q], queryFn: () => driverApi.search({ q, size: 10 }) })
  return (
    <Autocomplete
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={data?.content ?? []}
      loading={isFetching}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(d) => `${d.fullName} · ${d.driverCode}`}
      getOptionDisabled={(d) => d.status !== 'ACTIVE'}
      noOptionsText={q ? 'No driver matches. Register the driver first.' : 'Type a name, driver code, NID or mobile'}
      renderOption={({ key, ...props }, d) => (
        <Box component="li" key={key} {...props}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
            <AuthImage id={d.photoId} alt="" size={36} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {d.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <Mono>{d.driverCode}</Mono> · NID <Mono>{d.nid}</Mono>
                {d.currentRickshaw && ` · drives ${d.currentRickshaw.rickshawNumber}`}
              </Typography>
            </Box>
            {d.status !== 'ACTIVE' && <StatusChip status={d.status} />}
          </Stack>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} required error={!!error} helperText={error} />}
    />
  )
}

/** Search owners by name, NID or mobile. */
export function OwnerPicker({ value, onChange, error }: { value: Owner | null; onChange: (o: Owner | null) => void; error?: string }) {
  const [input, setInput] = useState('')
  const q = useDebounced(input)
  const { data, isFetching } = useQuery({ queryKey: ['owners', 'pick', q], queryFn: () => ownerApi.search({ q, size: 10 }) })
  return (
    <Autocomplete
      value={value}
      onChange={(_, v) => onChange(v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      options={data?.content ?? []}
      loading={isFetching}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionLabel={(o) => `${o.fullName} · NID ${o.nid}`}
      noOptionsText={q ? 'No owner matches. Add a new owner below.' : 'Type a name, NID or mobile'}
      renderInput={(params) => <TextField {...params} label="Existing owner" error={!!error} helperText={error} />}
    />
  )
}

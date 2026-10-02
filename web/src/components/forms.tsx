import { Alert, Box, MenuItem, TextField, Typography } from '@mui/material'
import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import type { ApiError } from '../api/types'

/** A form whose submitted (transformed) values may differ from its field values. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm<T extends FieldValues> = UseFormReturn<T, any, any>

/** Dhaka-division thanas offered as suggestions; free text is still accepted. */
export const DHAKA_THANAS = [
  'Adabor', 'Badda', 'Banani', 'Bangshal', 'Bhashantek', 'Cantonment', 'Chawkbazar', 'Dakshinkhan', 'Darus Salam',
  'Demra', 'Dhanmondi', 'Gendaria', 'Gulshan', 'Hatirjheel', 'Hazaribagh', 'Jatrabari', 'Kadamtali', 'Kafrul',
  'Kalabagan', 'Kamrangirchar', 'Khilgaon', 'Khilkhet', 'Kotwali', 'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel',
  'Mugda', 'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Rupnagar', 'Sabujbagh', 'Shah Ali', 'Shahbagh',
  'Shahjahanpur', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur', 'Tejgaon', 'Turag', 'Uttara East', 'Uttara West',
  'Uttarkhan', 'Vatara', 'Wari',
]

export const DIVISIONS = ['Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet']

/** Copies backend field errors onto the form; returns the message for anything left over. */
export function applyServerErrors<T extends FieldValues>(form: AnyForm<T>, err: ApiError): string | null {
  for (const fe of err.fieldErrors) {
    form.setError(fe.field as Path<T>, { type: 'server', message: fe.message })
  }
  return err.fieldErrors.length ? 'Some fields need fixing. Check the highlighted fields.' : err.message
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {message}
    </Alert>
  )
}

/** Reads a (possibly nested) error message from react-hook-form state. */
export function errorAt<T extends FieldValues>(form: AnyForm<T>, name: string): string | undefined {
  let node: unknown = form.formState.errors
  for (const key of name.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[key]
  }
  return (node as { message?: string } | undefined)?.message
}

/** Division / district / thana / address line, registered under `prefix`. */
export function AddressFields<T extends FieldValues>({ form, prefix, title }: { form: AnyForm<T>; prefix: string; title: string }) {
  const name = (f: string) => `${prefix}.${f}` as Path<T>
  const field = (f: string, label: string, extra: object = {}) => {
    const message = errorAt(form, `${prefix}.${f}`)
    return <TextField label={label} {...form.register(name(f))} error={!!message} helperText={message} required {...extra} />
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
        <Controller
          control={form.control}
          name={name('division')}
          render={({ field: f }) => (
            <TextField
              select
              label="Division"
              required
              {...f}
              value={f.value ?? ''}
              error={!!errorAt(form, `${prefix}.division`)}
              helperText={errorAt(form, `${prefix}.division`)}
            >
              {DIVISIONS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {field('district', 'District')}
        {field('thana', 'Thana / upazila')}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>{field('line', 'House, road, area')}</Box>
      </Box>
    </Box>
  )
}

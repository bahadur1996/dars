import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { apiError } from '../api/client'
import { ownerApi } from '../api/endpoints'
import type { Owner } from '../api/types'
import { ownerSchema, type OwnerForm, type OwnerInput } from '../schemas'
import { AddressFields, applyServerErrors, errorAt, FormAlert } from './forms'

const EMPTY: OwnerForm = { fullName: '', nid: '', mobile: '', address: { division: 'Dhaka', district: 'Dhaka', thana: '', line: '' } }

/** Create or edit an owner. `initial` pre-fills the form (e.g. copied from the driver). */
export function OwnerDialog({ open, onClose, onSaved, owner, initial }: { open: boolean; onClose: () => void; onSaved: (o: Owner) => void; owner?: Owner; initial?: OwnerForm }) {
  const form = useForm<OwnerForm, unknown, OwnerInput>({ resolver: zodResolver(ownerSchema), defaultValues: EMPTY })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      form.reset(owner ? { fullName: owner.fullName, nid: owner.nid, mobile: owner.mobile, address: owner.address } : (initial ?? EMPTY))
    }
  }, [open, owner, initial, form])

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      onSaved(owner ? await ownerApi.update(owner.id, values) : await ownerApi.create(values))
    } catch (e) {
      setError(applyServerErrors(form, apiError(e)))
    }
  })

  const err = (n: string) => errorAt(form, n)
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{owner ? 'Edit owner' : 'Add owner'}</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Owner's full name" required {...form.register('fullName')} error={!!err('fullName')} helperText={err('fullName')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="NID number" required {...form.register('nid')} error={!!err('nid')} helperText={err('nid') ?? '10 or 17 digits'} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
            <TextField label="Mobile" required {...form.register('mobile')} error={!!err('mobile')} helperText={err('mobile')} slotProps={{ htmlInput: { inputMode: 'tel' } }} />
          </Stack>
          <AddressFields form={form} prefix="address" title="Address" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={form.formState.isSubmitting}>
          {owner ? 'Save owner' : 'Add owner'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

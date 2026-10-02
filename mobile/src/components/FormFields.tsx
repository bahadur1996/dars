import { Controller, type Control, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import type { TextInputProps } from 'react-native'
import { Field } from './ui'

/** A text Field bound to react-hook-form. */
export function CField<T extends FieldValues>({ control, name, label, hint, required, ...input }: TextInputProps & { control: Control<T, any, any>; name: Path<T>; label: string; hint?: string; required?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          hint={hint}
          required={required}
          value={(field.value as string | null | undefined) ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...input}
        />
      )}
    />
  )
}

/** Maps backend fieldErrors (e.g. "presentAddress.thana") onto the form. */
export function applyServerErrors<T extends FieldValues>(setError: UseFormSetError<T>, fieldErrors: { field: string; message: string }[]) {
  fieldErrors.forEach((f) => setError(f.field as Path<T>, { message: f.message }))
}

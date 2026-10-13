import { useEffect, useState } from 'react'

/** `value`, updated only after it has stopped changing for `ms` milliseconds (for search-as-you-type). */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

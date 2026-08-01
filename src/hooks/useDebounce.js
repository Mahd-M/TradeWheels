import { useState, useEffect } from 'react'

export function useDebounce(v, delay = 3000) {
  const [debouncedValue, setDebouncedValue] = useState(v)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(v), delay)
    return () => clearTimeout(timeoutId)
  }, [v, delay])

  return debouncedValue
}
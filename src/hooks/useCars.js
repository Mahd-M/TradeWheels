import { useState, useEffect } from 'react'

import { API_URL } from '../constants/api'

export function useCars() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/cars`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { setCars(data); setLoading(false) })
      .catch((err) => { console.error('Failed to load cars:', err); setLoading(false) })
  }, [])



  return { cars, loading }
}
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import { API_URL } from '../constants/api'

const ListingsFilterContext = createContext()
const PAGE_SIZE = 12

function withPageReset(params) {
  const next = new URLSearchParams(params)
  next.delete('page')
  return next
}

export const ListingsFilterProvider = ({ children, endpoint = '/cars' }) => {
  // the address-bar query string, not the query string sent to the API below - two separate URLSearchParams
  const [browserParams, setBrowserParams] = useSearchParams()

  const [search, setSearchState] = useState('')
  const [cityFilter, setCityFilterState] = useState('')
  const [bodyFilter, setBodyFilterState] = useState('')
  const [transmissionFilter, setTransmissionFilterState] = useState('')
  const [sortOrder, setSortOrderState] = useState('')

  const [cars, setCars] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const removeCar = useCallback((carId) => {
    setCars((prev) => prev.filter((car) => car.id !== carId))
    setTotalCount((prev) => {
      const next = Math.max(0, prev - 1)
      setTotalPages(Math.max(1, Math.ceil(next / PAGE_SIZE)))
      return next
    })
  }, [])

  const debouncedSearch = useDebounce(search, 300)

  // derive currentPage from ?page= instead of its own state, so a refresh can't lose it
  const pageParam = parseInt(browserParams.get('page'), 10)
  const currentPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1

  // resets to page 1 by clearing ?page= from the URL
  const setSearch = useCallback((value) => {
    setSearchState(value)
    setBrowserParams((prev) => withPageReset(prev), { replace: true })
  }, [setBrowserParams])

  const setCityFilter = useCallback((value) => {
    setCityFilterState(value)
    setBrowserParams((prev) => withPageReset(prev), { replace: true })
  }, [setBrowserParams])

  const setBodyFilter = useCallback((value) => {
    setBodyFilterState(value)
    setBrowserParams((prev) => withPageReset(prev), { replace: true })
  }, [setBrowserParams])

  const setTransmissionFilter = useCallback((value) => {
    setTransmissionFilterState(value)
    setBrowserParams((prev) => withPageReset(prev), { replace: true })
  }, [setBrowserParams])

  const setSortOrder = useCallback((value) => {
    setSortOrderState(value)
    setBrowserParams((prev) => withPageReset(prev), { replace: true })
  }, [setBrowserParams])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    const params = new URLSearchParams()
    params.set('page', currentPage)
    params.set('pageSize', PAGE_SIZE)
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    if (cityFilter) params.set('city', cityFilter)
    if (bodyFilter) params.set('bodyType', bodyFilter)
    if (transmissionFilter) params.set('transmission', transmissionFilter)
    if (sortOrder) params.set('sort', sortOrder)

    fetch(`${API_URL}${endpoint}?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setCars(data.cars)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentPage, debouncedSearch, cityFilter, bodyFilter, transmissionFilter, sortOrder, endpoint])

  // replace:true so paging doesn't spam browser history with one entry per click
  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setBrowserParams((prev) => {
      const next = new URLSearchParams(prev)
      if (page <= 1) next.delete('page')
      else next.set('page', String(page))
      return next
    }, { replace: true })
  }

  return (
    <ListingsFilterContext.Provider
      value={{
        search, setSearch,
        cityFilter, setCityFilter,
        bodyFilter, setBodyFilter,
        transmissionFilter, setTransmissionFilter,
        sortOrder, setSortOrder,
        cars, loading, totalPages, totalCount, currentPage, goToPage,
        removeCar,
      }}
    >
      {children}
    </ListingsFilterContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useListingsFilter = () => {
  const context = useContext(ListingsFilterContext)
  if (!context) throw new Error('useListingsFilter must be used within ListingsFilterProvider')
  return context
}


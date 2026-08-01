import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useListingsFilter, ListingsFilterProvider } from '../context/ListingsFilterContext'
import FilterBar from '../components/FilterBar'
import FilteredCars from '../components/FilteredCars'

function ListingsContent() {
  const { setSearch } = useListingsFilter()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearch(urlSearch)
  }, [searchParams, setSearch])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Used Cars in Pakistan</h1>
      <FilterBar />
      <FilteredCars />
    </div>
  )
}

function Listings() {
  return (
    <ListingsFilterProvider>
      <ListingsContent />
    </ListingsFilterProvider>
  )
}

export default Listings
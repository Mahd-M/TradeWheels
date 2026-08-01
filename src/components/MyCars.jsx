import { Link } from 'react-router-dom'
import { useListingsFilter } from '../context/ListingsFilterContext'
import { useFavourites } from '../context/FavouritesContext'
import { useConfirm } from '../context/ConfirmContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'
import Pagination from './Pagination'

function MyCars() {
  const {
    cars, loading, totalCount, currentPage, totalPages, goToPage,
    search, cityFilter, bodyFilter, transmissionFilter,
    removeCar,
  } = useListingsFilter()
  const { toggleFavourite, isFavourite } = useFavourites()
  const { confirm } = useConfirm()

  const visibleCars = cars
  const displayCount = totalCount

  const hasActiveFilters = Boolean(search.trim() || cityFilter || bodyFilter || transmissionFilter)

  const handleDelete = async (car) => {
    const confirmed = await confirm({
      title: 'Delete Listing',
      message: `Delete "${car.year} ${car.make} ${car.model}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/cars/${car.id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      removeCar(car.id)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-semibold">Loading your listings...</p>
      </div>
    )
  }

  if (visibleCars.length === 0 && !hasActiveFilters) {
    return (
      <div className="text-center py-32">
        <p className="text-5xl mb-4">🚗</p>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">You haven&apos;t posted any listings yet</h2>
        <p className="text-gray-400 mb-6">List your car and reach thousands of buyers across Pakistan</p>
        <Link to="/sell" className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium inline-block">
          Post an Ad
        </Link>
      </div>
    )
  }

  if (visibleCars.length === 0 && hasActiveFilters) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-xl font-semibold">None of your listings match this search.</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">
        {hasActiveFilters ? `${displayCount} of your listings match this search` : `${displayCount} listing${displayCount === 1 ? '' : 's'} posted`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            overlay={
              <button
                onClick={() => toggleFavourite(car)}
                aria-label={isFavourite(car.id) ? 'Remove from favourites' : 'Add to favourites'}
                className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-lg z-10"
              >
                {isFavourite(car.id) ? '❤️' : '🤍'}
              </button>
            }
            footer={
              <div className="flex gap-2">
                <Link
                  to={`/cars/${car.id}`}
                  className="flex-1 text-center bg-green-700 text-white py-2 rounded hover:bg-green-600 transition text-sm font-medium"
                >
                  View Details
                </Link>
                <Link
                  to={`/cars/${car.id}/edit`}
                  className="px-3 py-2 border border-green-700 rounded text-green-700 hover:bg-green-50 transition text-sm font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(car)}
                  className="px-3 py-2 border border-red-300 rounded text-red-500 hover:bg-red-50 transition text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            }
          />
        ))}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
    </>
  )
}

export default MyCars
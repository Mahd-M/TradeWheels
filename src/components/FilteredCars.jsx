import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { useListingsFilter } from '../context/ListingsFilterContext'
import CarCard from './CarCard'
import Pagination from './Pagination'

function FilteredCars() {
  const { cars, loading, totalCount, currentPage, totalPages, goToPage, search } = useListingsFilter()
  const { user } = useAuth()
  const { toggleFavourite, isFavourite } = useFavourites()
  const navigate = useNavigate()
  const location = useLocation()

  const handleFavouriteClick = (car) => {
    if (!user) {
      navigate('/login', { state: { from: location, message: 'Login required to add a Car to Favourites' } })
      return
    }
    toggleFavourite(car)
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">
        {loading
          ? 'Loading cars...'
          : search.trim()
            ? `${totalCount} cars found for "${search.trim()}"`
            : `${totalCount} cars found`}
      </p>

      {loading ? (
        <div className="text-center py-20 text-gray-400"><p className="text-xl font-semibold">Loading cars...</p></div>
      ) : cars.length === 0 ? (
        <div className="text-center py-20 text-gray-400"><p className="text-xl font-semibold">No cars found</p></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                overlay={
                  <button
                    onClick={() => handleFavouriteClick(car)}
                    className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-lg z-10"
                    aria-label={isFavourite(car.id) ? 'Remove from favourites' : 'Add to favourites'}
                  >
                    {isFavourite(car.id) ? '❤️' : '🤍'}
                  </button>
                }
                footer={
                  <Link to={`/cars/${car.id}`} className="block text-center bg-green-700 text-white py-2 rounded hover:bg-green-600 transition text-sm font-medium">
                    View Details
                  </Link>
                }
              />
            ))}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}
    </>
  )
}

export default FilteredCars
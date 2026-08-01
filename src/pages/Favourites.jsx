import { Link } from 'react-router-dom'
import { useFavourites } from '../context/FavouritesContext'
import CarCard from '../components/CarCard'

function Favourites() {
  const { favourites, toggleFavourite } = useFavourites()

  if (favourites.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-5xl mb-4">🤍</p>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">No saved cars yet</h2>
        <p className="text-gray-400 mb-6">Click the heart on any listing to save it here</p>
        <Link to="/cars"
          className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium inline-block"
        >
          Browse Cars
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Saved Cars ({favourites.length})</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favourites.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            overlay={null}
            footer={
              <div className="flex gap-2">
                <Link to={`/cars/${car.id}`}
                  className="flex-1 text-center bg-green-700 text-white py-2 rounded hover:bg-green-600 transition text-sm font-medium"
                >
                  View Details
                </Link>
                <button
                  onClick={() => toggleFavourite(car)}
                  className="px-3 py-2 border border-red-300 rounded text-red-400 hover:bg-red-50 transition text-sm"
                >
                  Remove
                </button>
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}

export default Favourites
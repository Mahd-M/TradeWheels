import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'

function BecauseYouLooked() {
  const { user, loading: authLoading } = useAuth()
  const { toggleFavourite, isFavourite } = useFavourites()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`${API_URL}/cars/recently-viewed-similar?limit=6`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { setCars(data.cars || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, authLoading])

  // no login/cold-start CTA here, just render nothing if there's nothing to show
  if (authLoading || loading || !user || cars.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Because You Looked At Similar Cars</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            overlay={
              <button onClick={() => toggleFavourite(car)} className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-lg z-10">
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
    </div>
  )
}

export default BecauseYouLooked
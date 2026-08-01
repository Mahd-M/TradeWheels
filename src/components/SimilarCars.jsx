import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'
import CarCarousel from './CarCarousel'

const SIMILAR_COUNT = 12

function SimilarCars({ carId }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const { toggleFavourite, isFavourite } = useFavourites()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`${API_URL}/cars/${carId}/similar?limit=${SIMILAR_COUNT}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { setCars(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [carId])

  const handleFavouriteClick = (car) => {
    if (!user) {
      navigate('/login', { state: { from: location, message: 'Login required to add a Car to Favourites' } })
      return
    }
    toggleFavourite(car)
  }

  if (!loading && cars.length === 0) return null

  if (loading) {
    return (
      <div className="mt-10 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Similar Cars</h2>
        <p className="text-gray-400 text-sm">Loading similar cars...</p>
      </div>
    )
  }

  const items = cars.map((car) => (
    <CarCard
      key={car.id}
      car={car}
      overlay={
        <button onClick={() => handleFavouriteClick(car)} className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-lg z-10">
          {isFavourite(car.id) ? '❤️' : '🤍'}
        </button>
      }
      footer={
        <Link to={`/cars/${car.id}`} className="block text-center bg-green-700 text-white py-2 rounded hover:bg-green-600 transition text-sm font-medium">
          View Details
        </Link>
      }
    />
  ))

  return <CarCarousel title="Similar Cars" items={items} />
}

export default SimilarCars
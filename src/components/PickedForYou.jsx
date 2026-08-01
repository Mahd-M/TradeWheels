import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'
import CarCarousel from './CarCarousel'

// same /cars/for-you call as HomeForYou.jsx - not keyed on carId since this is
// about the user's taste profile, not the current car (unlike SimilarCars)
function PickedForYou({ excludeCarId }) {
  const { user, loading: authLoading } = useAuth()
  const { toggleFavourite, isFavourite } = useFavourites()
  const [cars, setCars] = useState([])
  const [basis, setBasis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`${API_URL}/cars/for-you?limit=6`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setCars(data.cars || [])
        setBasis(data.basis || 'none')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, authLoading])

  // secondary rail, Home's ForYou already owns the login/cold-start CTA
  if (authLoading || loading || !user || basis === 'none' || !cars.length) return null

  // don't show the car being viewed as one of its own "picked for you" results
  const filtered = cars.filter((car) => String(car.id) !== String(excludeCarId))
  if (filtered.length === 0) return null

  const items = filtered.map((car) => (
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
  ))

  return <CarCarousel  title="Picked For You" items={items} />
}

export default PickedForYou
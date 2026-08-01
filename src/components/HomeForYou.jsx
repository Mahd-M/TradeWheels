import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'

function ForYou() {
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

  if (authLoading || loading) return null

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">Want picks tailored to you?</p>
          <p className="text-gray-500 text-sm mb-4">Log in to see recommendations based on what you've favourited and viewed.</p>
          <Link to="/login" className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium inline-block">
            Log In
          </Link>
        </div>
      </div>
    )
  }

  if (basis === 'none') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">No personalized picks yet</p>
          <p className="text-gray-500 text-sm mb-4">Favourite or browse a few cars and we&apos;ll start tailoring picks to you.</p>
          <Link to="/cars" className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium inline-block">
            Browse Cars
          </Link>
        </div>
      </div>
    )
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Picked For You</h2>
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

export default ForYou
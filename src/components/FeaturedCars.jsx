import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavourites } from '../context/FavouritesContext'
import { API_URL } from '../constants/api'
import CarCard from './CarCard'

const TARGET_COUNT = 6

function FeaturedCars() {
  const [featuredCars, setFeaturedCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('trending') // 'trending' | 'mixed' | 'random' - only drives the heading text
  const { toggleFavourite, isFavourite } = useFavourites()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      // Priority 1: trending (real behavioral signal).
      let trending
      try {
        const res = await fetch(`${API_URL}/cars/trending?limit=${TARGET_COUNT}`, { credentials: 'include' })
        trending = res.ok ? await res.json() : []
      } catch {
        trending = []
      }
      if (cancelled) return

      if (trending.length >= TARGET_COUNT) {
        setFeaturedCars(trending)
        setSource('trending')
        setLoading(false)
        return
      }

      // not enough trending cars yet, pad out with a random sample (excluding trending picks)
      const needed = TARGET_COUNT - trending.length
      const params = new URLSearchParams({ limit: String(needed) })
      trending.forEach((car) => params.append('exclude', car.id))

      let filler
      try {
        const res = await fetch(`${API_URL}/cars/featured?${params.toString()}`, { credentials: 'include' })
        filler = res.ok ? await res.json() : []
      } catch {
        filler = []
      }
      if (cancelled) return

      setFeaturedCars([...trending, ...filler])
      setSource(trending.length > 0 ? 'mixed' : 'random')
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const handleFavouriteClick = (car) => {
    if (!user) {
      navigate('/login', { state: { from: location, message: 'Login required to add a Car to Favourites' } })
      return
    }
    toggleFavourite(car)
  }

  const heading =
    source === 'trending' ? 'Trending Now'
    : source === 'mixed' ? 'Trending & Featured'
    : 'Featured Listings'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{heading}</h2>
      {loading && <p className="text-gray-400 mb-6">Loading cars...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredCars.map((car) => (
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
        ))}
      </div>

      <div className="text-center mt-10">
        <Link to="/cars" className="bg-yellow-400 text-black px-8 py-3 rounded font-semibold hover:bg-yellow-300 transition inline-block">
          View All Listings →
        </Link>
      </div>
    </div>
  )
}

export default FeaturedCars
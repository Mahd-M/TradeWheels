import { createContext, useState, useEffect, useContext } from 'react'
import { API_URL } from '../constants/api'
import { useAuth } from './AuthContext'

const FavouritesContext = createContext()

export function FavouritesProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [favourites, setFavourites] = useState([])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavourites([])
      return
    }

    fetch(`${API_URL}/favourites`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setFavourites(data))
      .catch((err) => console.error('Failed to load favourites:', err))
  }, [user, authLoading])

  const toggleFavourite = async (car) => {
    if (!user) return

    const exists = favourites.find((f) => f.id === car.id)

    if (exists) {
      setFavourites(favourites.filter((f) => f.id !== car.id))
      await fetch(`${API_URL}/favourites/${car.id}`, { method: 'DELETE', credentials: 'include' })
    } else {
      setFavourites([...favourites, car])
      await fetch(`${API_URL}/favourites`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: car.id })
      })
    }
  }

  const isFavourite = (id) => favourites.some((f) => f.id === id)

  return (
    <FavouritesContext.Provider value={{ favourites, toggleFavourite, isFavourite }}>
      {children}
    </FavouritesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavourites() {
  return useContext(FavouritesContext)
}

export { FavouritesContext }
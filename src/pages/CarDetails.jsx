import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  IoCalendarOutline,
  IoLocationOutline,
  IoSpeedometerOutline,
  IoColorPaletteOutline,
  IoCogOutline,
  IoWaterOutline,
  IoCarSportOutline,
} from 'react-icons/io5'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import Comments from '../components/Comments'

import { API_URL } from '../constants/api'

import SimilarCars from '../components/SimilarCars'

import PickedForYou from '../components/PickedForYou'

import CarImageGallery from '../components/CarImageGallery'

function CarDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin } = useAuth()

  const { confirm, alertUser } = useConfirm()

  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContact, setShowContact] = useState(false)
  const [messaging, setMessaging] = useState(false)

  const [contactResetId, setContactResetId] = useState(id)

  const handleMessageSeller = async () => {
    if (!user) {
      navigate('/login', {
        state: { from: location, message: 'Login required to message the seller' }
      })
      return
    }

    setMessaging(true)
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: car.ownerId, carId: car.id })
      })
      const data = await res.json()

      if (!res.ok) {
        // If we're the one who blocked this seller, offer to unblock and
        // retry right here, rather than just failing.
        if (data.blockedByYou) {
          const shouldUnblock = await confirm({
            title: 'User Blocked',
            message: 'You have this person blocked. Unblock them to send a message?',
            confirmLabel: 'Unblock',
            danger: true,
          })
          if (shouldUnblock) {
            const unblockRes = await fetch(`${API_URL}/users/${car.ownerId}/unblock`, {
              method: 'PUT',
              credentials: 'include'
            })
            if (unblockRes.ok) {
              return handleMessageSeller() // retry now that they're unblocked
            }
          }
          setMessaging(false)
          return
        }

        throw new Error(data.error || 'Failed to start conversation')
      }

      navigate(`/messages/${data.id}`)
    } catch (err) {
      await alertUser({ title: 'Unable to Message Seller', message: err.message, danger: true })
      setMessaging(false)
    }
  }

  useEffect(() => {
    fetch(`${API_URL}/cars/${id}`, { credentials: 'include' })
      .then((res) => { if (!res.ok) throw new Error('Not found'); return res.json() })
      .then((data) => { setCar(data); setLoading(false) })
      .catch(() => { setCar(null); setLoading(false) })
  }, [id])

  // own effect, not chained onto the car fetch - a slow/failed POST here shouldn't block the listing
  useEffect(() => {
    fetch(`${API_URL}/cars/${id}/view`, { method: 'POST', credentials: 'include' }).catch(() => { })
  }, [id])

  // reset showContact synchronously during render (not an effect) so a new
  // car's page never flashes the old car's "revealed" contact state
  if (id !== contactResetId) {
    setContactResetId(id)
    setShowContact(false)
  }

  const canManage = user && car && (isAdmin || user.id === car.ownerId)

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Listing',
      message: 'Delete this listing? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/cars/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (res.ok) navigate('/cars')
  }

  if (loading) {
    return <div className="text-center py-20 sm:py-32 px-4 text-gray-400">Loading...</div>
  }

  if (!car) {
    return (
      <div className="text-center py-20 sm:py-32 px-4">
        <p className="text-2xl font-bold text-gray-700">Car not found</p>
        <Link to="/cars" className="text-green-700 underline mt-4 inline-block">
          Back to Listings
        </Link>
      </div>
    )
  }

  const specs = [
    { icon: IoLocationOutline, label: 'City', value: car.city },
    { icon: IoSpeedometerOutline, label: 'Mileage', value: `${Number(car.mileage).toLocaleString()} km` },
    { icon: IoCogOutline, label: 'Transmission', value: car.transmission },
    { icon: IoWaterOutline, label: 'Fuel Type', value: car.fuelType },
    { icon: IoColorPaletteOutline, label: 'Color', value: car.color },
    { icon: IoCogOutline, label: 'Engine', value: car.engineCapacity },
    { icon: IoCarSportOutline, label: 'Body Type', value: car.bodyType },
    { icon: IoCalendarOutline, label: 'Year', value: car.year },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      <Link to="/cars" className="text-green-700 text-sm font-medium hover:underline mb-6 inline-block">
        ← Back to Listings
      </Link>

      {/* car.images falls back to [car.image] for any car that predates the gallery feature */}
      <div className="mt-4">
        <CarImageGallery key={car.id} images={car.images} alt={`${car.make} ${car.model}`} />
      </div>

      <div className="mt-6 flex flex-col gap-5">

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {car.year} {car.make} {car.model}
            </h1>
            <p className="text-gray-500 mt-1">{car.variant}</p>
          </div>

          <p className="text-green-700 font-bold text-3xl sm:text-right flex-shrink-0">
            PKR {Number(car.price).toLocaleString()}
          </p>
        </div>

        {/* 8 boxes: 2 per row on mobile, 4 per row (2 rows) from sm: up */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {specs.map(({ icon: Icon, label, value }) => (
            <div key={label} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 uppercase">
                <Icon className="text-green-700 flex-shrink-0" /> {label}
              </span>
              <p className="font-semibold text-gray-700 mt-1 break-words">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-1">
          {canManage && (
            <>
              <Link
                to={`/cars/${id}/edit`}
                className="flex-1 flex items-center justify-center text-center border border-green-700 text-green-700 py-2.5 rounded font-medium hover:bg-green-50 transition"
              >
                Edit Listing
              </Link>
              <button
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center border border-red-300 text-red-500 py-2.5 rounded font-medium hover:bg-red-50 transition"
              >
                Delete Listing
              </button>
            </>
          )}

          {car.ownerId && (!user || user.id !== car.ownerId) && (
            <button
              onClick={handleMessageSeller}
              disabled={messaging}
              className="flex-1 flex items-center justify-center border border-green-700 text-green-700 py-2.5 rounded font-semibold hover:bg-green-50 transition disabled:opacity-50"
            >
              {messaging ? 'Opening chat...' : 'Message Seller'}
            </button>
          )}

          {showContact ? (
            <div className="flex-1 bg-green-50 border border-green-200 rounded p-3 text-center relative">
              <button
                onClick={() => setShowContact(false)}
                aria-label="Hide seller contact"
                className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 leading-none text-lg"
              >
                ×
              </button>
              <p className="text-xs text-gray-400 uppercase mb-1">Seller Contact</p>
              <p className="font-bold text-gray-800">{car.sellerName}</p>
              <p className="text-green-700 font-semibold">{car.sellerPhone}</p>
            </div>
          ) : (
            <button
              onClick={() => setShowContact(true)}
              className="flex-1 flex items-center justify-center bg-green-700 text-white py-2.5 rounded font-semibold hover:bg-green-600 transition"
            >
              Contact Seller
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Seller Description</h2>
        <p className="text-gray-600 leading-relaxed">{car.description}</p>
      </div>

      <SimilarCars carId={id} />
      <PickedForYou excludeCarId={id} />
      <Comments carId={id} />

    </div>
  )
}

export default CarDetails
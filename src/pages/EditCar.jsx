import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CarForm from '../components/CarForm'

import { API_URL } from '../constants/api'

function EditCar() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, isAdmin } = useAuth()
    const [car, setCar] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/cars/${id}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => { setCar(data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [id])

    const handleUpdate = async (form) => {
        const res = await fetch(`${API_URL}/cars/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update listing')
        navigate(`/cars/${id}`)
    }

    if (loading) return <div className="text-center py-32 text-gray-400">Loading...</div>
    if (!car) return <div className="text-center py-32 text-gray-700">Listing not found.</div>

    const canEdit = user && (isAdmin || user.id === car.ownerId)
    if (!canEdit) {
        return (
            <div className="text-center py-32">
                <p className="text-xl font-semibold text-gray-700 mb-4">You don&apos;t have permission to edit this listing.</p>
                <Link to={`/cars/${id}`} className="text-green-700 underline">Back to listing</Link>
            </div>
        )
    }

    // eslint-disable-next-line no-unused-vars
    const { id: _id, createdAt: _createdAt, ownerId: _ownerId, image: _image, ...initialValues } = car

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Edit Your Listing</h1>
            <CarForm initialValues={initialValues} onSubmit={handleUpdate} submitLabel="Save Changes" />
        </div>
    )
}

export default EditCar
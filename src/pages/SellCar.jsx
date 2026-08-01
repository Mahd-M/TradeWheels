import { useState } from 'react'
import CarForm from '../components/CarForm'

import { API_URL } from '../constants/api'

function SellCar() {
    const [submitted, setSubmitted] = useState(false)
    const [lastCar, setLastCar] = useState(null)

    const handleCreate = async (form) => {
        const res = await fetch(`${API_URL}/cars`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to submit')
        setLastCar(data)
        setSubmitted(true)
    }

    if (submitted) {
        return (
            <div className="text-center py-32">
                <div className="text-green-700 text-6xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Ad Posted Successfully!</h2>
                <p className="text-gray-500 mb-6">
                    Your listing for the {lastCar.year} {lastCar.make} {lastCar.model} has been submitted.
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="bg-green-700 text-white px-6 py-2 rounded hover:bg-green-600 transition font-medium"
                >
                    Post Another Ad
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Post Your Car Ad</h1>
            <p className="text-gray-500 text-sm mb-8">Fill in the details below to list your car for sale</p>
            <CarForm onSubmit={handleCreate} submitLabel="Post My Ad" />
        </div>
    )
}

export default SellCar
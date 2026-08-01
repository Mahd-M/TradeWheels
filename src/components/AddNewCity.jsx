import { useState } from 'react'

function AddNewCity({ value, cityOptions, onCitySelect, onCityAdded }) {
  const [showCityInput, setShowCityInput] = useState(false)
  const [newCity, setNewCity] = useState('')

  const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"

  const handleCityChange = (e) => {
    if (e.target.value === 'add-city') {
      setShowCityInput(true)
      setNewCity('')
      return
    }
    onCitySelect(e.target.value)
  }

  const handleAddCity = () => {
    const trimmedCity = newCity.trim()
    if (!trimmedCity) return

    const formattedCity = trimmedCity
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    onCityAdded(formattedCity)
    setNewCity('')
    setShowCityInput(false)
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-1.5">City</label>
      <select name="city" value={value} onChange={handleCityChange} className={inputClass}>
        <option value="">Select City</option>
        {cityOptions.map((city) => (
          <option key={city} value={city}>{city}</option>
        ))}
        <option value="add-city">Add City</option>
      </select>

      {showCityInput && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCity()}
            placeholder="Enter new city name"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="button"
            onClick={handleAddCity}
            className="bg-green-700 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition font-medium"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

export default AddNewCity
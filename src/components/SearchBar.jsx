import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

const handleSearch = () => {
  const trimmed = searchQuery.trim()
  navigate(`/cars?search=${encodeURIComponent(trimmed)}`)
}
  return (
    <div className="flex justify-center gap-2 max-w-xl mx-auto">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Search by make, model or city..."
        className="w-full px-4 py-3 rounded text-black outline-none"
      />
      <button
        onClick={handleSearch}
        className="bg-yellow-400 text-black px-6 py-3 rounded font-semibold hover:bg-yellow-300 transition"
      >
        Search
      </button>
    </div>
  )
}

export default SearchBar
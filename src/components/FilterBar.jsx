import { useListingsFilter } from '../context/ListingsFilterContext'

const defaultCityOptions = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Quetta']

function FilterBar() {
  const { search, setSearch, cityFilter, setCityFilter, bodyFilter, setBodyFilter, transmissionFilter, setTransmissionFilter, sortOrder, setSortOrder } = useListingsFilter()

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        placeholder="Search make, model or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border px-4 py-2 rounded outline-none focus:border-green-600 flex-1 min-w-48"
      />

      <select
        value={cityFilter}
        onChange={(e) => setCityFilter(e.target.value)}
        className="border px-4 py-2 rounded outline-none focus:border-green-600"
      >
        <option value="">All Cities</option>
        {defaultCityOptions.map((city) => (
          <option key={city} value={city}>{city}</option>
        ))}
        <option value="other-cities">Other Cities</option>
      </select>

      <select
        value={bodyFilter}
        onChange={(e) => setBodyFilter(e.target.value)}
        className="border px-4 py-2 rounded outline-none focus:border-green-600"
      >
        <option value="">All Types</option>
        <option value="Sedan">Sedan</option>
        <option value="Hatchback">Hatchback</option>
        <option value="SUV">SUV</option>
        <option value="Pickup">Pickup</option>
        <option value="Van">Van</option>
        <option value="Super Car">Super Car</option>
        <option value="Sports Car">Sports Car</option>
        <option value="Hyper Car">Hyper Car</option>
      </select>

      <select
        value={transmissionFilter}
        onChange={(e) => setTransmissionFilter(e.target.value)}
        className="border px-4 py-2 rounded outline-none focus:border-green-600"
      >
        <option value="">All Transmissions</option>
        <option value="Automatic">Automatic</option>
        <option value="Manual">Manual</option>
      </select>

      <select
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        className="border px-4 py-2 rounded outline-none focus:border-green-600"
      >
        <option value="">Sort by Price</option>
        <option value="low">Price: Low to High</option>
        <option value="high">Price: High to Low</option>
      </select>
    </div>
  )
}

export default FilterBar

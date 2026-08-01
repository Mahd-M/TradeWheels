import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import Pagination from './Pagination'
import { API_URL } from '../constants/api'
import { useConfirm } from '../context/ConfirmContext'

const PAGE_SIZE = 20

function AdminCarsTable() {
  // browser address bar, not the `params` built below for the API fetch - two separate objects
  const [browserParams, setBrowserParams] = useSearchParams()

  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const { confirm } = useConfirm()

  const debouncedSearch = useDebounce(search, 300)

  // derive from ?page= instead of its own state, so a refresh doesn't bounce back to page 1
  const pageParam = parseInt(browserParams.get('page'), 10)
  const currentPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    const params = new URLSearchParams()
    params.set('page', currentPage)
    params.set('pageSize', PAGE_SIZE)
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())

    fetch(`${API_URL}/cars?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setCars(data.cars)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [currentPage, debouncedSearch])

  // replace: true so paging doesn't spam browser history with one entry per click
  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setBrowserParams((prev) => {
      const next = new URLSearchParams(prev)
      if (page <= 1) next.delete('page')
      else next.set('page', String(page))
      return next
    }, { replace: true })
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    // resets to page 1 by clearing ?page= from the URL
    setBrowserParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('page')
      return next
    }, { replace: true })
  }

  const handleDelete = async (id, label) => {
    const confirmed = await confirm({
      title: 'Delete Listing',
      message: `Delete "${label}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!confirmed) return

    const res = await fetch(`${API_URL}/cars/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      setCars((prev) => prev.filter((car) => car.id !== id))
      setTotalCount((prev) => prev - 1)
    }
  }

  return (
    <div className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          {debouncedSearch.trim() ? `${totalCount} listings match "${debouncedSearch.trim()}"` : `Total Listings = ${totalCount}`}
        </h2>
        <input
          type="text"
          placeholder="Search make, model or city..."
          value={search}
          onChange={handleSearchChange}
          className="border px-4 py-2 rounded outline-none focus:border-green-600 w-full sm:w-72"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading listings...</div>
      ) : cars.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No listings match that search.</div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-200 text-left text-black-500">
                <tr>
                  <th className="px-4 py-3">Car</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Posted by</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr key={car.id} className="border-t hover:bg-green-100 transition ">
                    <td className="px-4 py-3 font-medium text-gray-800 cursor-pointer">
                      <Link to={`/cars/${car.id}`} className="hover:underline">
                        {car.year} {car.make} {car.model}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{car.city}</td>
                    <td className="px-4 py-3 text-gray-600">PKR {Number(car.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{car.ownerName || 'Unowned (seed data)'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        <Link to={`/cars/${car.id}/edit`} className="text-green-700 hover:underline">Edit</Link>
                        <button onClick={() => handleDelete(car.id, `${car.year} ${car.make} ${car.model}`)} className="text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {cars.map((car) => (
              <div key={car.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      <Link to={`/cars/${car.id}`} className="hover:underline cursor-pointer">
                        {car.year} {car.make} {car.model}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-500">{car.city}</p>
                  </div>
                  <p className="text-green-700 font-bold text-sm flex-shrink-0">PKR {Number(car.price).toLocaleString()}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Posted by {car.ownerName || 'Unowned (seed data)'}</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-sm">
                  <Link to={`/cars/${car.id}/edit`} className="text-green-700 font-medium hover:underline">Edit</Link>
                  <button onClick={() => handleDelete(car.id, `${car.year} ${car.make} ${car.model}`)} className="text-red-500 font-medium hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}
    </div>
  )
}

export default AdminCarsTable
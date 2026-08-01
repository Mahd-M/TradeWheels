import { useState } from 'react'

function Pagination({ currentPage, totalPages, onPageChange }) {
  const [gotoInput, setGotoInput] = useState('')
  const [gotoError, setGotoError] = useState('')

  if (totalPages <= 1) return null

  const delta = 2
  const pages = []
  let last = 0

  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      if (last && i - last === 2) pages.push(last + 1)
      else if (last && i - last > 2) pages.push('...')
      pages.push(i)
      last = i
    }
  }

  const handleGoto = () => {
    const page = Number(gotoInput)
    if (!Number.isInteger(page) || page < 1 || page > totalPages) {
      setGotoError("This page doesn't exist. Choose a number between 1 and " + totalPages + ".")
      return
    }
    setGotoError('')
    setGotoInput('')
    onPageChange(page)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
          &laquo; Previous
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 border rounded ${p === currentPage ? 'bg-green-700 text-white' : 'hover:bg-gray-50'}`}
            >
              {p}
            </button>
          )
        )}

        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
          Next &raquo;
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3 text-sm">
        <input
          type="number"
          min="1"
          max={totalPages}
          value={gotoInput}
          onChange={(e) => { setGotoInput(e.target.value); setGotoError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleGoto()}
          placeholder="Go to page..."
          className="border px-3 py-1 rounded outline-none focus:border-green-600 w-32 text-center"
        />
        <button onClick={handleGoto} className="px-3 py-1 border rounded hover:bg-gray-50 font-medium">
          Go
        </button>
        {gotoError && <span className="text-red-500 text-xs">{gotoError}</span>}
      </div>
    </div>
  )
}

export default Pagination
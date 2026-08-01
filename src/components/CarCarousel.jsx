import { useState, useEffect } from 'react'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

function getItemsPerView() {
  if (typeof window === 'undefined') return 3
  if (window.innerWidth < 640) return 1
  if (window.innerWidth < 1024) return 2
  return 3
}

// takes pre-built <CarCard> elements, not raw car data, so it stays reusable for any rail
function CarCarousel({ title, items }) {
  const [itemsPerView, setItemsPerView] = useState(getItemsPerView)
  const [index, setIndex] = useState(0)
  const total = items.length

  useEffect(() => {
    const handleResize = () => setItemsPerView(getItemsPerView())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (total === 0) return null

  // clamp so we don't try to render more cards than exist, loop/arrows just turn off
  const visibleCount = Math.min(itemsPerView, total)
  const canLoop = total > visibleCount

  const next = () => setIndex((i) => (i + 1) % total)
  const prev = () => setIndex((i) => (i - 1 + total) % total)

  const visible = Array.from({ length: visibleCount }, (_, k) => items[(index + k) % total])
  const trackPercent = (visibleCount / total) * 100
  const offsetPercent = (index / total) * 100

  return (
    <section className="mt-10 border-t pt-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mt-1">{title}</h2>
        </div>
      </div>

      <div className="relative">
        {canLoop && (
          <button
            onClick={prev}
            aria-label="Previous cars"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:scale-105 transition"
          >
            <IoChevronBack />
          </button>
        )}

        <div className="overflow-hidden">
          <div key={index} className="flex gap-4 sm:gap-6 carousel-row">
            {visible.map((item, i) => (
              <div key={i} style={{ width: `${100 / visibleCount}%` }} className="flex-shrink-0">
                {item}
              </div>
            ))}
          </div>
        </div>

        {canLoop && (
          <button
            onClick={next}
            aria-label="Next cars"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:scale-105 transition"
          >
            <IoChevronForward />
          </button>
        )}
      </div>

      {canLoop && (
        <div className="mx-1 mt-4 h-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-700 transition-all duration-300 ease-out"
            style={{ width: `${trackPercent}%`, marginLeft: `${offsetPercent}%` }}
          />
        </div>
      )}
    </section>
  )
}

export default CarCarousel
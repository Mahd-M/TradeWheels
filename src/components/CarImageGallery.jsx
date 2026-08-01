import { useState } from 'react'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

function CarImageGallery({ images, alt }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const safeImages = images && images.length > 0 ? images : []
  if (safeImages.length === 0) {
    return (
      <div className="w-full h-64 sm:h-96 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
        No photo available
      </div>
    )
  }

  const total = safeImages.length
  const canNavigate = total > 1

  const next = () => setActiveIndex((i) => (i + 1) % total)
  const prev = () => setActiveIndex((i) => (i - 1 + total) % total)

  return (
    <div>
      {/* fixed height so portrait/landscape photos don't resize the box and jump the arrows around */}
      <div className="relative w-full h-72 sm:h-96 md:h-[28rem] lg:h-[32rem] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden shadow">
        <img
          src={safeImages[activeIndex]}
          alt={alt}
          className="max-w-full max-h-full object-contain"
        />

        {canNavigate && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:scale-105 transition"
            >
              <IoChevronBack />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md hover:scale-105 transition"
            >
              <IoChevronForward />
            </button>
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {activeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>

      {canNavigate && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {safeImages.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition ${i === activeIndex ? 'border-green-700' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={src} alt={`${alt} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CarImageGallery
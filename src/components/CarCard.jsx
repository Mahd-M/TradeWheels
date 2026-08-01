import { useState } from 'react'

function CarCard({ car, overlay = null, footer = null }) {
  const [isHovered, setIsHovered] = useState(false)

  // tracked in state instead of Tailwind's group-hover, more reliable across devices
  const showHoverImage = isHovered && Boolean(car.hoverImage)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="border rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:scale-105 transform transition relative"
    >
      {overlay}
      <div className="relative w-full h-48 overflow-hidden">
        <img
          src={car.image}
          alt={`${car.make} ${car.model}`}
          className={`w-full h-48 object-cover transition-opacity duration-300 ${showHoverImage ? 'opacity-0' : 'opacity-100'}`}
        />
        {car.hoverImage && (
          <img
            src={car.hoverImage}
            alt={`${car.make} ${car.model} additional view`}
            className={`absolute inset-0 w-full h-48 object-cover transition-opacity duration-300 ${showHoverImage ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg">{car.year} {car.make} {car.model}</h3>
        <p className="text-sm text-gray-500 mb-2">{car.variant}</p>
        <p className="text-green-700 font-bold text-xl mb-3">PKR {Number(car.price).toLocaleString()}</p>
        <div className="flex gap-4 text-sm text-gray-500 mb-4">
          <span>{car.city}</span>
          <span>{Number(car.mileage).toLocaleString()} km</span>
          <span>{car.transmission}</span>
        </div>
        {footer}
      </div>
    </div>
  )
}

export default CarCard
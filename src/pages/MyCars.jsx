import { ListingsFilterProvider } from '../context/ListingsFilterContext'
import FilterBar from '../components/FilterBar'
import MyCarsGrid from '../components/MyCars'

function MyCarsContent() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Cars</h1>
      <FilterBar />
      <MyCarsGrid />
    </div>
  )
}

function MyCars() {
  return (
    <ListingsFilterProvider endpoint="/cars/mine">
      <MyCarsContent />
    </ListingsFilterProvider>
  )
}

export default MyCars
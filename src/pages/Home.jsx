import FeaturedCars from '../components/FeaturedCars'
import ForYou from '../components/HomeForYou'
import BecauseYouLooked from '../components/BecauseYouLooked'
import SearchBar from '../components/SearchBar'

function Home() {
  return (
    <div>
      <div className="bg-green-800 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Find Your Perfect Car</h1>
          <SearchBar />
        </div>
      </div>

      <ForYou />
      <BecauseYouLooked />
      <FeaturedCars />
    </div>
  )
}

export default Home
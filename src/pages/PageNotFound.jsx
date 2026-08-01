import { Link } from 'react-router-dom'

function PageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-gray-800 py-8">Error 404 - Page Not Found</h1>
      <p className="text-lg text-gray-600 py-4">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 transition">
        Go to Home
      </Link>
    </div>
  )
}

export default PageNotFound
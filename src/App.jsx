import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FavouritesProvider } from './context/FavouritesContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Listings from './pages/Listings'
import CarDetails from './pages/CarDetails'
import SellCar from './pages/SellCar'
import Favourites from './pages/Favourites'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import EditCar from './pages/EditCar'
import AdminDashboard from './pages/AdminDashboard'
import { SocketProvider } from './context/SocketContext'
import { MessagesProvider } from './context/MessagesContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Messages from './pages/Messages'
import Conversation from './pages/Conversation'
import PageNotFound from './pages/PageNotFound'
import MyCars from './pages/MyCars'


const router = createBrowserRouter([
  { path: '/', element: <><Navbar /><Home/></> },
  { path: '/cars', element: <><Navbar /><Listings/></> },
  { path: '/cars/:id', element: <><Navbar /><CarDetails/></> },
  { path: '/cars/:id/edit', element: <><Navbar/><ProtectedRoute><EditCar/></ProtectedRoute></> },
  { path: '/sell', element: <><Navbar /><ProtectedRoute><SellCar/></ProtectedRoute></> },
  { path: '/favourites', element: <><Navbar/><ProtectedRoute><Favourites/></ProtectedRoute></> },
  { path: '/login', element: <><Navbar/><Login/></> },
  { path: '/register', element: <><Navbar/><Register/></> },
  { path: '/admin', element: <><Navbar/><ProtectedRoute adminOnly><AdminDashboard/></ProtectedRoute></> },
  { path: '/messages', element: <><Navbar/><ProtectedRoute><Messages/></ProtectedRoute></> },
  { path: '/messages/:id', element: <><Navbar/><ProtectedRoute><Conversation/></ProtectedRoute></> },
  { path: '/my-cars', element: <><Navbar/><ProtectedRoute><MyCars/></ProtectedRoute></> },
  { path: '*', element: <><Navbar /><PageNotFound /></> }
])

function App() {
  return (
    <ConfirmProvider> 
      <AuthProvider>
        <SocketProvider>
          <MessagesProvider>
            <FavouritesProvider>
              <RouterProvider router={router} />
            </FavouritesProvider>
          </MessagesProvider>
        </SocketProvider>
      </AuthProvider>
    </ConfirmProvider>
  )
}

export default App
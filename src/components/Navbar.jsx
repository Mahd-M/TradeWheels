import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { IoMenu, IoClose } from 'react-icons/io5'
import { useFavourites } from '../context/FavouritesContext'
import { useAuth } from '../context/AuthContext'
import { useMessages } from '../context/MessagesContext'
import { useConfirm } from '../context/ConfirmContext'
import logo from '../assets/sportive-car-car-svgrepo-com.svg'

function Navbar() {
  const { favourites } = useFavourites()
  const { user, isAdmin, loading, logout } = useAuth()
  const { unreadTotal } = useMessages()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Log Out',
      message: 'Do you want to logout?',
      confirmLabel: 'Logout',
    })
    if (!confirmed) return
    closeMenu()
    await logout()
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    isActive ? 'text-yellow-400' : 'hover:text-yellow-300 transition'

  return (
    <nav className="bg-green-700 text-white">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <NavLink to="/" onClick={closeMenu} className="flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight">
          <img src={logo} alt="TradeWheels Logo" className="h-10 w-10" />
          Trade<span className="text-yellow-400">Wheels</span>
        </NavLink>

        {/* Desktop nav - hidden below 1024px */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {!loading && user && <span className="font-bold">Hi, {user.name}</span>}

          <NavLink to="/" className={navLinkClass}>Home</NavLink>
          <NavLink to="/cars" className={navLinkClass}>Used Cars</NavLink>

          {user && (
            <NavLink to="/my-cars" className={navLinkClass}>My Cars</NavLink>
          )}

          <NavLink to="/messages" className={({ isActive }) => `${navLinkClass({ isActive })} relative`}>
            Messages
            {unreadTotal > 0 && (
              <span className="absolute -top-2 -right-4 bg-yellow-400 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadTotal}
              </span>
            )}
          </NavLink>

          <NavLink to="/favourites" className={({ isActive }) => `${navLinkClass({ isActive })} relative`}>
            Saved
            {favourites.length > 0 && (
              <span className="absolute -top-2 -right-4 bg-yellow-400 text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {favourites.length}
              </span>
            )}
          </NavLink>

          {isAdmin && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}

          <NavLink to="/sell" className="bg-yellow-400 text-black px-4 py-2 rounded font-semibold hover:bg-yellow-300 transition">
            + Post an Ad
          </NavLink>

          {!loading && (
            user ? (
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition">
                Logout
              </button>
            ) : (
              <NavLink to="/login" className={({ isActive }) => isActive ? 'bg-yellow-400 text-black px-4 py-2 rounded font-semibold' : 'bg-gray-200 text-black px-4 py-2 rounded font-semibold hover:bg-gray-300 transition'}>
                Login
              </NavLink>
            )
          )}
        </div>

        {/* Hamburger - only visible below 1024px */}
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="lg:hidden text-3xl p-1"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <IoClose /> : <IoMenu />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="lg:hidden bg-green-800 px-6 py-4 flex flex-col gap-4 text-sm font-medium border-t border-green-600">
          {!loading && user && <span className="font-bold">Hi, {user.name}</span>}

          <NavLink to="/" onClick={closeMenu} className={navLinkClass}>Home</NavLink>
          <NavLink to="/cars" onClick={closeMenu} className={navLinkClass}>Used Cars</NavLink>
          {user && (
            <NavLink to="/my-cars" onClick={closeMenu} className={navLinkClass}>My Cars</NavLink>
          )}
          <NavLink to="/messages" onClick={closeMenu} className={navLinkClass}>
            Messages{unreadTotal > 0 && ` (${unreadTotal})`}
          </NavLink>

          <NavLink to="/favourites" onClick={closeMenu} className={navLinkClass}>
            Saved{favourites.length > 0 && ` (${favourites.length})`}
          </NavLink>

          {isAdmin && <NavLink to="/admin" onClick={closeMenu} className={navLinkClass}>Admin</NavLink>}

          <NavLink to="/sell" onClick={closeMenu} className="bg-yellow-400 text-black px-4 py-2 rounded font-semibold text-center">
            + Post an Ad
          </NavLink>

          {!loading && (
            user ? (
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded font-semibold text-left">
                Logout
              </button>
            ) : (
              <NavLink to="/login" onClick={closeMenu} className="bg-yellow-400 text-black px-4 py-2 rounded font-semibold text-center">
                Login
              </NavLink>
            )
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
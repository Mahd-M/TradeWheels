/* global require, process */
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')

const { UPLOAD_DIR } = require('./upload')
const { registerSocketHandlers } = require('./sockets')

const authRoutes = require('./routes/auth')
const carsRoutes = require('./routes/cars')
const recommendationsRoutes = require('./routes/recommendations')
const favouritesRoutes = require('./routes/favourites')
const commentsRoutes = require('./routes/comments')
const conversationsRoutes = require('./routes/conversations')
const adminRoutes = require('./routes/admin')
const uploadsRoutes = require('./routes/uploads')

const app = express()
app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://192.168.0.223:5173' // local network IP, for testing on other devices
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
})

// routes reach io via req.app.get('io') to avoid a require cycle with routes/conversations.js
app.set('io', io)

// no auth here on purpose, car photos are meant to be public
app.use('/uploads', express.static(UPLOAD_DIR))

// socket auth middleware + connection handlers live in ./sockets/index.js
registerSocketHandlers(io)

// recommendations must mount before cars - otherwise cars.js's GET /:id
// swallows /api/cars/featured and /api/cars/trending as if "featured"/
// "trending" were ids
app.use('/api/cars', recommendationsRoutes)
app.use('/api/cars', carsRoutes)
app.use('/api/favourites', favouritesRoutes)
app.use('/api', commentsRoutes)
app.use('/api', conversationsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/upload', uploadsRoutes)

const PORT = 5000

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Socket.IO ready on ws://localhost:${PORT}`)
})

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 5000 is already in use.')
  } else {
    console.error('HTTP server error:', err)
  }
  process.exit(1)
})
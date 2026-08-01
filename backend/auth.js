const COOKIE_NAME = process.env.COOKIE_NAME || 'token'


/* global require, module, process */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const SALT_ROUNDS = 10

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS)
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash)
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}



module.exports = { hashPassword, comparePassword, signToken, verifyToken, COOKIE_NAME }

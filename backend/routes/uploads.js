/* global require, module */
const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware')
const { upload, deleteUploadedFile } = require('../upload')

router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file received' })
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    res.status(201).json({ imageUrl })
  })
})

router.delete('/', requireAuth, async (req, res) => {
  const { url } = req.body
  if (!url) {
    return res.status(400).json({ error: 'url is required' })
  }
  await deleteUploadedFile(url)
  res.json({ message: 'File deleted' })
})

module.exports = router
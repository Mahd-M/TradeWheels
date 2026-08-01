/* global require, module, __dirname */
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, uniqueName)
  }
})

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'))
    return
  }
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

// deletes one uploaded file off disk, given the URL /api/upload returned.
// never rejects - a missing file is already the end state callers want,
// so a stale cleanup shouldn't fail their delete/edit
function deleteUploadedFile(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) return resolve()

    // basename() strips '../' traversal attempts, startsWith is just extra safety
    const filename = path.basename(imageUrl)
    const filePath = path.join(UPLOAD_DIR, filename)

    if (!filePath.startsWith(UPLOAD_DIR)) return resolve()

    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete uploaded file:', filePath, err.message)
      }
      resolve()
    })
  })
}

module.exports = { upload, UPLOAD_DIR, deleteUploadedFile }
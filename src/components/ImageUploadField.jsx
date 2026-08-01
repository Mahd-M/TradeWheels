import { useState } from 'react'
import { API_URL } from '../constants/api'

// tells "a file we uploaded" (safe to delete) apart from "a pasted external URL" (not ours to delete)
const UPLOAD_ORIGIN = API_URL.replace(/\/api$/, '')
const isOwnUpload = (url) => typeof url === 'string' && url.startsWith(`${UPLOAD_ORIGIN}/uploads/`)

function ImageUploadField({ images, onImagesChange, onUploadingChange }) {
  const [imageMode, setImageMode] = useState('upload') // 'upload' | 'url'
  const [pasteUrl, setPasteUrl] = useState('')
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"

  const setUploading = (delta) => {
    setUploadingCount((prev) => {
      const next = Math.max(0, prev + delta)
      onUploadingChange?.(next > 0)
      return next
    })
  }

  const uploadOneFile = async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', credentials: 'include', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data.imageUrl
  }

  // each file uploads independently and appends as soon as it's done, a slow
  // one doesn't block the rest - onImagesChange always takes an updater fn so
  // concurrent completions don't clobber each other
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = '' // lets the same file be re-picked later if removed then re-added

    setUploadError('')
    await Promise.all(files.map(async (file) => {
      setUploading(1)
      try {
        const imageUrl = await uploadOneFile(file)
        onImagesChange((prev) => [...prev, imageUrl])
      } catch (err) {
        setUploadError(err.message)
      } finally {
        setUploading(-1)
      }
    }))
  }

  const handleRemove = async (index) => {
    const url = images[index]
    onImagesChange((prev) => prev.filter((_, i) => i !== index))

    // only delete files we actually uploaded, not pasted external URLs
    if (isOwnUpload(url)) {
      fetch(`${API_URL}/upload`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }).catch(() => {}) // best-effort, worst case an orphaned file sits on disk
    }
  }

  const handleMakeCover = (index) => {
    onImagesChange((prev) => {
      const next = [...prev]
      const [chosen] = next.splice(index, 1)
      return [chosen, ...next]
    })
  }

  const handleAddUrl = () => {
    const trimmed = pasteUrl.trim()
    if (!trimmed) return
    onImagesChange((prev) => [...prev, trimmed])
    setPasteUrl('')
  }

  const toggleMode = () => {
    setImageMode((prev) => (prev === 'upload' ? 'url' : 'upload'))
    setUploadError('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-600">Car Photos</label>
        <button type="button" onClick={toggleMode} className="text-xs text-green-700 hover:underline">
          {imageMode === 'upload' ? 'Paste a URL instead' : 'Upload photos instead'}
        </button>
      </div>

      {imageMode === 'upload' ? (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFilesSelected}
          className={`${inputClass} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:font-medium file:cursor-pointer hover:file:bg-green-600 cursor-pointer`}
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            placeholder="Paste a link to a photo of your car"
            className={inputClass}
          />
          <button type="button" onClick={handleAddUrl} className="bg-green-700 text-white px-4 rounded-lg hover:bg-green-600 transition font-medium flex-shrink-0">
            Add
          </button>
        </div>
      )}

      {uploadingCount > 0 && <p className="text-sm text-gray-400 mt-2">Uploading {uploadingCount} photo{uploadingCount > 1 ? 's' : ''}...</p>}
      {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
          {images.map((src, i) => (
            <div key={src} className="relative group">
              <img
                src={src}
                alt={`Car photo ${i + 1}`}
                className="w-full h-24 sm:h-28 object-cover rounded-lg border border-gray-200"
                onError={(e) => { e.target.style.opacity = '0.3' }}
              />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-green-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none hover:bg-black/80"
              >
                ×
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => handleMakeCover(i)}
                  className="absolute bottom-1 inset-x-1 bg-white/90 text-[10px] font-medium text-gray-700 rounded py-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  Make Cover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageUploadField
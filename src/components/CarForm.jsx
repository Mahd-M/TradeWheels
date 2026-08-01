import { useState } from 'react'
import AddNewCity from './AddNewCity'
import ImageUploadField from './ImageUploadField'

const defaultCityOptions = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Quetta']

const emptyForm = {
    make: '', model: '', variant: '', year: '', price: '', city: '', mileage: '',
    transmission: '', fuelType: '', bodyType: '', color: '', engineCapacity: '',
    description: '', images: [], sellerName: '', sellerPhone: '',
}

const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"

const FIRST_CAR_YEAR = 1885

function CarForm({ initialValues, onSubmit, submitLabel }) {
    const [form, setForm] = useState(initialValues || emptyForm)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [imageUploading, setImageUploading] = useState(false)
    const [cityOptions, setCityOptions] = useState(() => {
        const initialCity = initialValues?.city?.trim()
        return initialCity && !defaultCityOptions.includes(initialCity)
            ? [...defaultCityOptions, initialCity]
            : defaultCityOptions
    })

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleCitySelect = (city) => {
        setForm((prev) => ({ ...prev, city }))
    }

    const handleCityAdded = (city) => {
        setCityOptions((prev) => (prev.includes(city) ? prev : [...prev, city]))
        setForm((prev) => ({ ...prev, city }))
    }

    const handleImagesChange = (updater) => {
        setForm((prev) => ({ ...prev, images: updater(prev.images) }))
    }

    const handleSubmit = () => {
        setError('')

        if (imageUploading) {
            setError('Please wait for all photos to finish uploading before submitting.')
            return
        }

        // images is an array, checked separately below instead of the empty-string check
        const { images, ...restFields } = form
        const isEmpty = Object.values(restFields).some((val) => String(val).trim() === '')
        if (isEmpty) {
            setError('Please fill in all fields before submitting.')
            return
        }
        if (!images || images.length === 0) {
            setError('Please add at least one photo of your car.')
            return
        }

        const currentYear = new Date().getFullYear()
        const yearNum = Number(form.year)
        const priceNum = Number(form.price)
        const mileageNum = Number(form.mileage)

        if (Number.isNaN(yearNum) || Number.isNaN(priceNum) || Number.isNaN(mileageNum)) {
            setError('Year, Price and Mileage must be valid numbers.')
            return
        }
        if (yearNum <= 0) {
            setError('Year cannot be zero or negative.')
            return
        }
        if (yearNum < FIRST_CAR_YEAR) {
            setError("🚗 Nice try but the first gasoline-powered car wasn't built until 1885. Karl Benz patented his three-wheeled Benz Patent-Motorwagen on January 29, 1886, widely recognized as the birth of the modern automobile. Please enter a real year :)")
            return
        }
        if (yearNum > currentYear) {
            setError(`Year cannot be later than ${currentYear}.`)
            return
        }
        if (priceNum <= 0) {
            setError('Price must be greater than zero.')
            return
        }
        if (mileageNum < 0) {
            setError('Mileage cannot be negative.')
            return
        }

        setShowConfirmModal(true)
    }

    const handleConfirmedSubmit = async () => {
        setSubmitting(true)
        try {
            await onSubmit(form)
            setShowConfirmModal(false)
        } catch (err) {
            setShowConfirmModal(false)
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Car Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Make</label>
                        <input type="text" name="make" value={form.make} onChange={handleChange}
                            placeholder="e.g. Toyota" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Model</label>
                        <input type="text" name="model" value={form.model} onChange={handleChange}
                            placeholder="e.g. Corolla" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Variant</label>
                        <input type="text" name="variant" value={form.variant} onChange={handleChange}
                            placeholder="e.g. Altis Grande 1.8 CVT" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Year</label>
                        <input type="number" name="year" value={form.year} onChange={handleChange}
                            placeholder="e.g. 2022" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Price (PKR)</label>
                        <input type="number" name="price" value={form.price} onChange={handleChange}
                            placeholder="e.g. 5800000" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Mileage (km)</label>
                        <input type="number" name="mileage" value={form.mileage} onChange={handleChange}
                            placeholder="e.g. 35000" className={inputClass} />
                    </div>
                    <AddNewCity
                        value={form.city}
                        cityOptions={cityOptions}
                        onCitySelect={handleCitySelect}
                        onCityAdded={handleCityAdded}
                    />
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Transmission</label>
                        <select name="transmission" value={form.transmission} onChange={handleChange} className={inputClass}>
                            <option value="">Select Transmission</option>
                            <option>Automatic</option><option>Manual</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Fuel Type</label>
                        <select name="fuelType" value={form.fuelType} onChange={handleChange} className={inputClass}>
                            <option value="">Select Fuel Type</option>
                            <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>PHEV (Plug-in Hybrid)</option><option>Electric</option><option>CNG</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Body Type</label>
                        <select name="bodyType" value={form.bodyType} onChange={handleChange} className={inputClass}>
                            <option value="">Select Body Type</option>
                            <option>Sedan</option><option>Hatchback</option><option>SUV</option><option>Pickup</option><option>Van</option><option>Super Car</option><option>Sports Car</option><option>Hyper Car</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Color</label>
                        <input type="text" name="color" value={form.color} onChange={handleChange}
                            placeholder="e.g. Pearl White" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Engine Capacity</label>
                        <input type="text" name="engineCapacity" value={form.engineCapacity} onChange={handleChange}
                            placeholder="e.g. 1800cc | 1000hp" className={inputClass} />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="text-sm font-medium text-gray-600 block mb-1.5">Description</label>
                    <textarea name="description" value={form.description} onChange={handleChange}
                        placeholder="Describe your car's condition, features, and any other details..."
                        rows={4}
                        className={`${inputClass} resize-none`} />
                </div>

                <div className="mt-4">
                    <ImageUploadField
                        images={form.images}
                        onImagesChange={handleImagesChange}
                        onUploadingChange={setImageUploading}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Seller Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Your Name</label>
                        <input type="text" name="sellerName" value={form.sellerName} onChange={handleChange}
                            placeholder="e.g. Ahmed Khan" className={inputClass} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1.5">Phone Number</label>
                        <input type="text" name="sellerPhone" value={form.sellerPhone} onChange={handleChange}
                            placeholder="e.g. 0300-1234567" className={inputClass} />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded p-3 mb-4">
                    {error}
                </div>
            )}

            <button onClick={handleSubmit} disabled={submitting || imageUploading}
                className="w-full bg-green-700 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-green-600 transition text-base sm:text-lg disabled:opacity-50">
                {imageUploading ? 'Waiting for photos to upload...' : submitLabel}
            </button>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">Confirm Your Listing Details</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            By submitting this listing, you hereby declare that all information provided regarding the vehicle&apos;s specifications is complete and true.
                        </p>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Please Note:</p>
                        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-2 mb-6">
                            <li><span className="font-semibold text-gray-700">Zero Tolerance for Fraud:</span> Intentionally providing false information may result in the immediate removal of your listing and a permanent account ban.</li>
                            <li><span className="font-semibold text-gray-700">Legal Rights:</span> TradeWheels and affected buyers reserve all rights to pursue legal action against fraudulent listings.</li>
                        </ul>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={submitting}
                                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmedSubmit}
                                disabled={submitting}
                                className="flex-1 bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'I Agree & Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CarForm
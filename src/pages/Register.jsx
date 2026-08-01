import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FormField from '../components/FormField'

function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const { register } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async () => {
        setError('')

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setSubmitting(true)
        try {
            await register(form.name, form.email, form.password)
            navigate('/')
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Account</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded p-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <FormField label="Name" name="name" value={form.name} onChange={handleChange} />
                    <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
                    <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} />
                    <FormField
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                    >
                        {submitting ? 'Creating account...' : 'Create Account'}
                    </button>
                </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
                Already have an account? <Link to="/login" className="text-green-700 font-medium hover:underline">Log in</Link>
            </p>
        </div>
    )
}

export default Register
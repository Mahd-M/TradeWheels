import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FormField from '../components/FormField'

function Login() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async () => {
        setError('')
        setSubmitting(true)
        try {
            await login(form.email, form.password)
            const destination = location.state?.from?.pathname || '/'
            navigate(destination, { replace: true })
        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Log In</h1>

                {location.state?.message && (
                    <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                        {location.state.message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded p-3 mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <FormField
                        label="Email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                    />

                    <FormField
                        label="Password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
                    >
                        {submitting ? 'Logging in...' : 'Log In'}
                    </button>
                </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
                Don&apos;t have an account? <Link to="/register" className="text-green-700 font-medium hover:underline">Register</Link>
            </p>
        </div>
    )
}

export default Login
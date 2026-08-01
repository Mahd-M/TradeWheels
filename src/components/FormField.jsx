function FormField({ label, name, type = 'text', value, onChange, placeholder, onKeyDown }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium text-gray-600 block mb-1.5">
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
      />
    </div>
  )
}

export default FormField
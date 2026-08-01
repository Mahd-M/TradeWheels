import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const closeWith = (result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setDialog(null)
  }

  // resolves true/false based on which button was clicked, await it like window.confirm
  const confirm = useCallback(({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({ mode: 'confirm', title, message, confirmLabel, cancelLabel, danger })
    })
  }, [])

  // replaces alert(...), resolves once dismissed
  const alertUser = useCallback(({ title = 'Notice', message = '', okLabel = 'OK', danger = false } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({ mode: 'alert', title, message, okLabel, danger })
    })
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm, alertUser }}>
      {children}

      {dialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">{dialog.title}</h3>
            {dialog.message && (
              <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{dialog.message}</p>
            )}

            {dialog.mode === 'confirm' ? (
              <div className="flex gap-3">
                <button
                  onClick={() => closeWith(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  {dialog.cancelLabel}
                </button>
                <button
                  onClick={() => closeWith(true)}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-white transition ${
                    dialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'
                  }`}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={() => closeWith(undefined)}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-white transition ${
                    dialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'
                  }`}
                >
                  {dialog.okLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  return useContext(ConfirmContext)
}

export { ConfirmContext }
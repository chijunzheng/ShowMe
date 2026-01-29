/**
 * ErrorScreen component - Shows error state with retry option
 * Displayed when uiState is ERROR (F052)
 */
import { UI_STATE } from '../../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {string} props.errorMessage - Error message to display
 * @param {Function} props.retryLastRequest - Function to retry the failed request
 * @param {Function} props.setUiState - Setter for UI state
 */
export default function ErrorScreen({
  errorMessage,
  retryLastRequest,
  setUiState,
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 md:px-0">
      {/* Error icon */}
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <p className="text-lg text-gray-700 text-center">{errorMessage}</p>

      {/* Retry button - F057: 44px touch target */}
      <button
        onClick={retryLastRequest}
        className="px-6 py-3 min-h-[44px] bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        Try Again
      </button>

      {/* Option to go back to home state */}
      <button
        onClick={() => setUiState(UI_STATE.HOME)}
        className="px-4 py-2 min-h-[44px] text-gray-500 hover:text-gray-700 transition-colors"
      >
        Ask a different question
      </button>
    </div>
  )
}

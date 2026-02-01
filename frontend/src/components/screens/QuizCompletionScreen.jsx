/**
 * QuizCompletionScreen component
 * Displayed while quiz results are being saved and the world updates.
 */
export default function QuizCompletionScreen() {
  return (
    <div className="flex flex-col items-center gap-4 px-4 md:px-0 py-8 animate-fade-in">
      <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-lg text-gray-600">Wrapping up your quiz...</p>
        <p className="text-sm text-gray-500 mt-1">Updating your world and XP</p>
      </div>
    </div>
  )
}

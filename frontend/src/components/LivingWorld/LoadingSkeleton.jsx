/**
 * LoadingSkeleton Component
 *
 * Displays a loading skeleton placeholder while the world image is loading.
 * Used by LivingWorldView during initial fetch.
 */

export default function LoadingSkeleton() {
  return (
    <div
      data-testid="living-world-skeleton"
      className="
        w-full aspect-video
        bg-slate-200 dark:bg-slate-700
        rounded-lg
        animate-pulse
        flex flex-col items-center justify-center gap-4
      "
    >
      {/* Placeholder shapes */}
      <div className="w-3/4 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      <div className="w-1/2 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      <div className="w-2/3 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
    </div>
  )
}

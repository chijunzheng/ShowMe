/**
 * ComicPage - Renders a 4-panel manga image with optional caption overlays.
 *
 * Falls back to plain single-image rendering when panel captions are absent.
 */

const PANEL_SLOTS = [0, 1, 2, 3];

function normalizeCaptions(panelCaptions) {
  if (!Array.isArray(panelCaptions)) return [];
  return panelCaptions
    .filter((caption) => typeof caption === "string" && caption.trim())
    .map((caption) => caption.trim())
    .slice(0, 4);
}

/**
 * @param {Object} props
 * @param {string|null} props.imageUrl
 * @param {string[]} props.panelCaptions
 * @param {string} props.chapterTitle
 * @param {string} props.sceneDescription
 */
export default function ComicPage({
  imageUrl = null,
  panelCaptions = [],
  chapterTitle = "",
  sceneDescription = "",
}) {
  const captions = normalizeCaptions(panelCaptions);
  const hasPanelCaptions = captions.length > 0;

  return (
    <div className="relative aspect-video bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden shadow-2xl mb-6">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={sceneDescription || chapterTitle || "Story comic page"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-700">
          <span className="text-gray-400 text-4xl">🎨</span>
        </div>
      )}

      {chapterTitle && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-black/75 text-white text-xs font-semibold tracking-wide shadow-lg backdrop-blur-sm">
          {chapterTitle}
        </div>
      )}

      {hasPanelCaptions && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/85 shadow-[0_0_8px_rgba(0,0,0,0.35)]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/85 shadow-[0_0_8px_rgba(0,0,0,0.35)]" />

          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {PANEL_SLOTS.map((slotIndex) => (
              <div key={slotIndex} className="relative">
                {captions[slotIndex] && (
                  <div className="absolute left-1.5 right-1.5 bottom-1.5 sm:left-2 sm:right-2 sm:bottom-2 px-2 py-1 rounded-md bg-black/72 text-white text-[10px] leading-tight sm:text-xs shadow-lg">
                    <span className="font-semibold mr-1">{slotIndex + 1}.</span>
                    <span>{captions[slotIndex]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

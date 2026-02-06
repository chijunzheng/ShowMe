/**
 * PredictionCards - Interactive 2x2 grid of prediction cards for Wonder Lab
 *
 * Displays 4 prediction options in a grid layout. Users tap to toggle selection
 * with visual feedback (border highlight + checkmark). Includes haptic feedback
 * on tap. "Run the Experiment" button is disabled until at least 1 card selected.
 */

import { useState } from "react";
import { vibrateShort } from "../../../utils/haptics";

/**
 * @param {Object} props
 * @param {Array} props.cards - Array of 4 prediction cards: [{ id, text }]
 * @param {Function} props.onSubmit - Callback with array of selected card IDs
 * @param {boolean} props.disabled - Disable all interactions
 */
export default function PredictionCards({
  cards = [],
  onSubmit,
  disabled = false,
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  // Toggle card selection
  const handleCardToggle = (cardId) => {
    if (disabled) return;

    vibrateShort();

    setSelectedIds((prev) => {
      if (prev.includes(cardId)) {
        // Deselect
        return prev.filter((id) => id !== cardId);
      } else {
        // Select
        return [...prev, cardId];
      }
    });
  };

  // Handle submit
  const handleSubmit = () => {
    if (disabled || selectedIds.length === 0) return;

    vibrateShort();
    onSubmit(selectedIds);
  };

  const isCardSelected = (cardId) => selectedIds.includes(cardId);
  const isSubmitDisabled = disabled || selectedIds.length === 0;

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          What do you think will happen?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tap to select one or more predictions
        </p>
      </div>

      {/* 2x2 Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const selected = isCardSelected(card.id);

          return (
            <button
              key={card.id}
              onClick={() => handleCardToggle(card.id)}
              disabled={disabled}
              className={`
                relative p-5 rounded-xl border-2 text-left
                transition-all duration-200 transform
                ${
                  selected
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-lg scale-105"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-100"}
              `}
            >
              {/* Checkmark indicator */}
              {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}

              {/* Card text */}
              <p className="text-base text-gray-800 dark:text-gray-100 leading-relaxed pr-8">
                {card.text}
              </p>
            </button>
          );
        })}
      </div>

      {/* Run the Experiment Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
          isSubmitDisabled
            ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:shadow-xl hover:scale-105 active:scale-95"
        }`}
      >
        {selectedIds.length === 0
          ? "Select at least one prediction"
          : `🧪 Run the Experiment (${selectedIds.length} selected)`}
      </button>
    </div>
  );
}

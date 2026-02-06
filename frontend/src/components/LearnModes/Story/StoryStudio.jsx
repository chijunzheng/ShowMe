/**
 * StoryStudio - Main Story Studio learning mode container (state machine)
 *
 * State flow: LOADING → INTRO → CHAPTER_1 → ILLUSTRATING_1 → CHAPTER_2 →
 *            ILLUSTRATING_2 → CHAPTER_3 → ILLUSTRATING_3 → PLAYBACK → SHARE
 *
 * Flow:
 * 1. Load story setup (prompt, concept checklist, ch1, scene image, TTS)
 * 2. Show intro with mission hook and concept cards
 * 3. Present 3 chapters with choice cards
 * 4. After each choice, generate illustration + next chapter
 * 5. Show playback with all 3 illustrated chapters
 * 6. Award XP based on concepts found
 */

import {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import useStoryNarration from "./useStoryNarration";
import { getStoryLoaderFacts, getStoryLoaderStages } from "./storyLoaderFacts";
import StoryLoader from "./StoryLoader";
import StoryIntro from "./StoryIntro";
import ChapterScreen from "./ChapterScreen";
import StoryPlayback from "./StoryPlayback";
import ShareStory from "./ShareStory";
import logger from "../../../utils/logger";
import { buildLearnSlidesPayload } from "../../../utils/learnSlidesPayload";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";
const LOADING_TIMEOUT_MS = 30000;

// State machine states
const STATE = {
  LOADING: "LOADING",
  INTRO: "INTRO",
  CHAPTER_1: "CHAPTER_1",
  ILLUSTRATING_1: "ILLUSTRATING_1",
  CHAPTER_2: "CHAPTER_2",
  ILLUSTRATING_2: "ILLUSTRATING_2",
  CHAPTER_3: "CHAPTER_3",
  ILLUSTRATING_3: "ILLUSTRATING_3",
  PLAYBACK: "PLAYBACK",
  SHARE: "SHARE",
  ERROR: "ERROR",
};

// Action types
const ACTION = {
  STORY_LOADED: "STORY_LOADED",
  START_STORY: "START_STORY",
  SELECT_CHOICE: "SELECT_CHOICE",
  CHAPTER_READY: "CHAPTER_READY",
  ALL_CHAPTERS_DONE: "ALL_CHAPTERS_DONE",
  SHOW_SHARE: "SHOW_SHARE",
  ERROR: "ERROR",
  RETRY: "RETRY",
  BACK_TO_PLAYBACK: "BACK_TO_PLAYBACK",
};

// Initial state
const initialState = {
  currentState: STATE.LOADING,
  storySetup: null,
  sceneImage: null,
  missionHookAudio: null,
  chapters: {},
  selections: [],
  illustrations: [],
  conceptsFound: [],
  funFact: null,
  error: null,
};

// Reducer function
function storyReducer(state, action) {
  switch (action.type) {
    case ACTION.STORY_LOADED:
      return {
        ...state,
        storySetup: action.payload.storySetup,
        sceneImage: action.payload.sceneImage,
        missionHookAudio: action.payload.missionHookAudio,
        chapters: { 1: action.payload.chapter1 },
        funFact: action.payload.funFact,
        currentState: STATE.INTRO,
        error: null,
      };

    case ACTION.START_STORY:
      return {
        ...state,
        currentState: STATE.CHAPTER_1,
      };

    case ACTION.SELECT_CHOICE: {
      const { chapter, choice } = action.payload;
      const newSelections = [
        ...state.selections,
        { chapter, selectedText: choice.text, choice },
      ];

      // Determine next state
      let nextState = STATE.ILLUSTRATING_1;
      if (chapter === 2) nextState = STATE.ILLUSTRATING_2;
      if (chapter === 3) nextState = STATE.ILLUSTRATING_3;

      return {
        ...state,
        selections: newSelections,
        currentState: nextState,
        error: null,
      };
    }

    case ACTION.CHAPTER_READY: {
      const { illustration, nextChapter, conceptsFound } = action.payload;
      const newIllustrations = [...state.illustrations, illustration];
      const newConceptsFound = [
        ...new Set([...state.conceptsFound, ...conceptsFound]),
      ];
      const newChapters = {
        ...state.chapters,
        [nextChapter.chapterNumber]: nextChapter,
      };

      // Determine next state
      let nextState = STATE.CHAPTER_2;
      if (nextChapter.chapterNumber === 3) nextState = STATE.CHAPTER_3;

      return {
        ...state,
        illustrations: newIllustrations,
        chapters: newChapters,
        conceptsFound: newConceptsFound,
        currentState: nextState,
        error: null,
      };
    }

    case ACTION.ALL_CHAPTERS_DONE: {
      const { illustration, conceptsFound } = action.payload;
      const newIllustrations = [...state.illustrations, illustration];
      const newConceptsFound = [
        ...new Set([...state.conceptsFound, ...conceptsFound]),
      ];

      return {
        ...state,
        illustrations: newIllustrations,
        conceptsFound: newConceptsFound,
        currentState: STATE.PLAYBACK,
        error: null,
      };
    }

    case ACTION.SHOW_SHARE:
      return {
        ...state,
        currentState: STATE.SHARE,
      };

    case ACTION.BACK_TO_PLAYBACK:
      return {
        ...state,
        currentState: STATE.PLAYBACK,
      };

    case ACTION.ERROR:
      return {
        ...state,
        error: action.payload,
        currentState: STATE.ERROR,
      };

    case ACTION.RETRY:
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

/**
 * @param {Object} props
 * @param {Array} props.slides - Content slides from the lesson
 * @param {string} props.topicName - Name of the topic learned
 * @param {Function} props.onComplete - Callback when story complete (xpEarned)
 * @param {Function} props.onBack - Callback to return to mode selector
 * @param {string} props.explanationLevel - 'simple' | 'standard' | 'deep'
 */
export default function StoryStudio({
  slides = [],
  topicName = "",
  onComplete,
  onBack,
  explanationLevel = "standard",
}) {
  const [state, dispatch] = useReducer(storyReducer, initialState);
  const { narrate, stop, prefetch, isPlaying } = useStoryNarration();

  const slidePayload = useMemo(() => buildLearnSlidesPayload(slides), [slides]);
  const loadRequestIdRef = useRef(0);
  const storyDataRef = useRef(null);

  // Stage text rotation for loader
  const [currentStage, setCurrentStage] = useState(0);
  const loaderStages = useMemo(
    () => getStoryLoaderStages(explanationLevel),
    [explanationLevel],
  );
  const loaderFacts = useMemo(
    () => getStoryLoaderFacts(explanationLevel),
    [explanationLevel],
  );

  // Rotate stage text during loading
  useEffect(() => {
    if (state.currentState !== STATE.LOADING) return;

    const intervalId = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % loaderStages.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [state.currentState, loaderStages.length]);

  // Phase 1: Load story setup on mount
  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const controller = new AbortController();
    let timeoutId = null;

    const isStale = () =>
      loadRequestIdRef.current !== requestId || controller.signal.aborted;

    const loadStorySetup = async () => {
      try {
        logger.info("STORY", "Loading story setup", {
          topicName,
          slideCount: slidePayload.length,
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          if (!isStale()) {
            controller.abort();
            dispatch({
              type: ACTION.ERROR,
              payload:
                "Story setup is taking longer than expected. Please try again.",
            });
          }
        }, LOADING_TIMEOUT_MS);

        // Fetch story setup and fun fact in parallel
        const [storyResponse, engagementResponse] = await Promise.all([
          fetch(`${API_BASE}/api/learn/story`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slides: slidePayload,
              topicName,
              explanationLevel,
            }),
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/api/generate/engagement`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicName,
              explanationLevel,
            }),
            signal: controller.signal,
          }).catch(() => null), // Optional endpoint
        ]);

        if (!storyResponse.ok) {
          const errorData = await storyResponse.json().catch(() => ({}));
          const message = mapStoryError(
            storyResponse.status,
            errorData?.error,
            errorData?.message,
          );
          throw new Error(message);
        }

        const storyData = await storyResponse.json();

        if (isStale()) {
          return;
        }

        // Store full data in ref
        storyDataRef.current = storyData;

        // Parse fun fact from engagement endpoint
        let funFact = null;
        if (engagementResponse?.ok) {
          const engagementData = await engagementResponse
            .json()
            .catch(() => ({}));
          if (engagementData?.funFact) {
            funFact = {
              emoji: engagementData.funFact.emoji || "💡",
              text: engagementData.funFact.fact || engagementData.funFact.text,
            };
          }
        }

        // Fallback to local facts if no API fact
        if (!funFact) {
          const randomFact =
            loaderFacts[Math.floor(Math.random() * loaderFacts.length)];
          funFact = randomFact;
        }

        // Prefetch mission hook narration if available
        if (storyData.missionHookAudio) {
          try {
            await prefetch(storyData.missionHookAudio, "mission-hook");
          } catch {
            // Prefetch failed, proceed without
          }
        }

        clearTimeout(timeoutId);

        // Dispatch loaded data
        dispatch({
          type: ACTION.STORY_LOADED,
          payload: {
            storySetup: {
              storyPrompt: storyData.storyPrompt,
              conceptChecklist: storyData.conceptChecklist || [],
              conceptCards: storyData.conceptCards || [],
              imageStyle:
                storyData.imageStyle ||
                "children's book illustration, colorful, friendly",
              missionHook: storyData.missionHook || "",
              starterSuggestion: storyData.starterSuggestion || "",
            },
            chapter1: storyData.chapters?.["1"] || {},
            sceneImage: storyData.sceneImage || null,
            missionHookAudio: storyData.missionHookAudio || null,
            funFact,
          },
        });
      } catch (error) {
        if (isStale() || error.name === "AbortError") {
          logger.debug("STORY", "Story setup load aborted");
          return;
        }

        logger.error("STORY", "Failed to load story setup", {
          error: error.message,
        });
        dispatch({
          type: ACTION.ERROR,
          payload: error.message || "Failed to load story setup",
        });
      }
    };

    loadStorySetup();

    return () => {
      controller.abort();
      stop();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [slidePayload, topicName, explanationLevel, stop, prefetch, loaderFacts]);

  // Auto-narrate mission hook in INTRO state
  useEffect(() => {
    if (state.currentState === STATE.INTRO && state.storySetup?.missionHook) {
      if (state.missionHookAudio) {
        narrate(state.storySetup.missionHook, "mission-hook");
      }
    }
  }, [
    state.currentState,
    state.storySetup?.missionHook,
    state.missionHookAudio,
    narrate,
  ]);

  // Generate chapter illustration after selection
  useEffect(() => {
    const illustratingStates = [
      STATE.ILLUSTRATING_1,
      STATE.ILLUSTRATING_2,
      STATE.ILLUSTRATING_3,
    ];
    if (!illustratingStates.includes(state.currentState)) {
      return;
    }

    const controller = new AbortController();

    const generateChapterIllustration = async () => {
      try {
        const currentChapterNum = state.selections.length;
        const isFinalChapter = currentChapterNum === 3;

        logger.info("STORY", "Generating chapter illustration", {
          chapter: currentChapterNum,
          isFinalChapter,
        });

        // Build previous chapters payload
        const previousChapters = state.selections.map((sel) => ({
          chapterNumber: sel.chapter,
          selectedChoice: sel.choice,
        }));

        const response = await fetch(`${API_BASE}/api/learn/story/chapter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicName,
            conceptChecklist: state.storySetup?.conceptChecklist || [],
            previousChapters,
            currentChapter: currentChapterNum + 1,
            imageStyle:
              state.storySetup?.imageStyle || "children's book illustration",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to generate chapter illustration",
          );
        }

        const data = await response.json();

        const illustration = {
          imageUrl: data.illustration?.imageUrl || null,
          sceneDescription: data.illustration?.sceneDescription || "",
          chapterTitle: `Chapter ${currentChapterNum}: ${getChapterLabel(currentChapterNum)}`,
        };

        if (isFinalChapter) {
          // Final chapter - no next chapter
          dispatch({
            type: ACTION.ALL_CHAPTERS_DONE,
            payload: {
              illustration,
              conceptsFound: data.conceptsFound || [],
            },
          });
        } else {
          // More chapters to go
          dispatch({
            type: ACTION.CHAPTER_READY,
            payload: {
              illustration,
              nextChapter: {
                chapterNumber:
                  data.nextChapter?.chapterNumber || currentChapterNum + 1,
                ...data.nextChapter,
              },
              conceptsFound: data.conceptsFound || [],
            },
          });
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        logger.error("STORY", "Chapter illustration generation failed", {
          error: error.message,
        });
        dispatch({
          type: ACTION.ERROR,
          payload: error.message || "Failed to generate illustration",
        });
      }
    };

    generateChapterIllustration();

    return () => {
      controller.abort();
    };
  }, [state.currentState, state.selections, state.storySetup, topicName]);

  // Handlers
  const handleStartStory = useCallback(() => {
    stop();
    dispatch({ type: ACTION.START_STORY });
  }, [stop]);

  const handleSelectChoice = useCallback((choice, chapter) => {
    dispatch({ type: ACTION.SELECT_CHOICE, payload: { chapter, choice } });
  }, []);

  const handleShowShare = useCallback(() => {
    dispatch({ type: ACTION.SHOW_SHARE });
  }, []);

  const handleBackToPlayback = useCallback(() => {
    dispatch({ type: ACTION.BACK_TO_PLAYBACK });
  }, []);

  const handleRetry = useCallback(() => {
    stop();
    dispatch({ type: ACTION.RETRY });
  }, [stop]);

  const handleComplete = useCallback(() => {
    stop();
    const xpEarned = calculateXP(
      state.conceptsFound.length,
      state.storySetup?.conceptChecklist?.length || 0,
    );
    onComplete?.({ xpEarned });
  }, [stop, state.conceptsFound, state.storySetup, onComplete]);

  const handleBack = useCallback(() => {
    const needsConfirmation = [
      STATE.CHAPTER_1,
      STATE.CHAPTER_2,
      STATE.CHAPTER_3,
      STATE.ILLUSTRATING_1,
      STATE.ILLUSTRATING_2,
      STATE.ILLUSTRATING_3,
    ].includes(state.currentState);

    if (needsConfirmation) {
      const confirmed = window.confirm(
        "Are you sure you want to exit? Your progress will be lost.",
      );
      if (!confirmed) return;
    }

    stop();
    onBack?.();
  }, [state.currentState, stop, onBack]);

  // Build playback scenes
  const playbackScenes = useMemo(() => {
    return state.illustrations.map((illustration, index) => ({
      imageUrl: illustration.imageUrl,
      sceneDescription: illustration.sceneDescription,
      narrativeText: state.selections[index]?.selectedText || "",
      chapterTitle: illustration.chapterTitle,
    }));
  }, [state.illustrations, state.selections]);

  // Render states
  if (state.currentState === STATE.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{state.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 rounded-full font-medium bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-full font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.currentState === STATE.LOADING) {
    return (
      <StoryLoader
        stageText={loaderStages[currentStage]}
        funFact={state.funFact}
        factSource={state.funFact ? "local" : "local"}
        onCancel={handleBack}
      />
    );
  }

  if (state.currentState === STATE.INTRO) {
    return (
      <>
        <StoryIntro
          storyTitle={topicName}
          missionHook={state.storySetup?.missionHook || ""}
          sceneImage={state.sceneImage}
          conceptCards={state.storySetup?.conceptCards || []}
          isTtsPlaying={isPlaying}
          onNext={handleStartStory}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </>
    );
  }

  if (state.currentState === STATE.CHAPTER_1) {
    return (
      <>
        <ChapterScreen
          chapter={1}
          chapterData={state.chapters[1]}
          conceptCards={state.storySetup?.conceptCards || []}
          conceptsFound={new Set(state.conceptsFound)}
          previousIllustration={null}
          onSelectChoice={(choice) => handleSelectChoice(choice, 1)}
          onCustomInput={(choice) => handleSelectChoice(choice, 1)}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </>
    );
  }

  if (state.currentState === STATE.ILLUSTRATING_1) {
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
        factSource="local"
        onCancel={null}
      />
    );
  }

  if (state.currentState === STATE.CHAPTER_2) {
    return (
      <>
        <ChapterScreen
          chapter={2}
          chapterData={state.chapters[2]}
          conceptCards={state.storySetup?.conceptCards || []}
          conceptsFound={new Set(state.conceptsFound)}
          previousIllustration={state.illustrations[0]?.imageUrl || null}
          onSelectChoice={(choice) => handleSelectChoice(choice, 2)}
          onCustomInput={(choice) => handleSelectChoice(choice, 2)}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </>
    );
  }

  if (state.currentState === STATE.ILLUSTRATING_2) {
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
        factSource="local"
        onCancel={null}
      />
    );
  }

  if (state.currentState === STATE.CHAPTER_3) {
    return (
      <>
        <ChapterScreen
          chapter={3}
          chapterData={state.chapters[3]}
          conceptCards={state.storySetup?.conceptCards || []}
          conceptsFound={new Set(state.conceptsFound)}
          previousIllustration={state.illustrations[1]?.imageUrl || null}
          onSelectChoice={(choice) => handleSelectChoice(choice, 3)}
          onCustomInput={(choice) => handleSelectChoice(choice, 3)}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </>
    );
  }

  if (state.currentState === STATE.ILLUSTRATING_3) {
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
        factSource="local"
        onCancel={null}
      />
    );
  }

  if (state.currentState === STATE.PLAYBACK) {
    return (
      <StoryPlayback
        topicName={topicName}
        scenes={playbackScenes}
        conceptsUsed={state.conceptsFound.length}
        totalConcepts={state.storySetup?.conceptChecklist?.length || 0}
        onShare={handleShowShare}
        onRetry={handleRetry}
        onFinish={handleComplete}
      />
    );
  }

  if (state.currentState === STATE.SHARE) {
    return (
      <ShareStory
        topicName={topicName}
        scenes={playbackScenes}
        onBack={handleBackToPlayback}
        onComplete={handleComplete}
      />
    );
  }

  return null;
}

// Helper: Map chapter number to label
function getChapterLabel(chapterNum) {
  const labels = {
    1: "The Beginning",
    2: "The Adventure",
    3: "The Ending",
  };
  return labels[chapterNum] || `Chapter ${chapterNum}`;
}

// Helper: Calculate XP earned
function calculateXP(conceptsFound, totalConcepts) {
  const baseXP = 20;
  const perConceptXP = 10;
  const allConceptsBonus = 15;

  let totalXP = baseXP + conceptsFound * perConceptXP;

  if (conceptsFound === totalConcepts && totalConcepts > 0) {
    totalXP += allConceptsBonus;
  }

  return totalXP;
}

// Helper: Map story error codes to messages
function mapStoryError(status, errorCode, fallbackMessage) {
  if (status === 413) {
    return "Lesson content is too large to process. Try a shorter lesson or fewer details.";
  }
  if (status === 503 || errorCode === "API_NOT_AVAILABLE") {
    return "AI service is unavailable right now. Please try again in a bit.";
  }
  if (status === 429 || errorCode === "RATE_LIMITED") {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (
    status === 502 ||
    errorCode === "PARSE_ERROR" ||
    errorCode === "INVALID_RESPONSE" ||
    errorCode === "STORY_GENERATION_FAILED"
  ) {
    return "Had trouble generating a story. Please try again.";
  }

  return errorCode || fallbackMessage || "Failed to load story";
}

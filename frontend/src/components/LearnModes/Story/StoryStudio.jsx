/**
 * StoryStudio - Main Story Studio learning mode container (state machine)
 *
 * State flow (batch mode): LOADING → INTRO → CHAPTER_1 → CHAPTER_2 →
 *            CHAPTER_3 → FINALIZING → PLAYBACK → SHARE
 *
 * Legacy flow (flag off): LOADING → INTRO → CHAPTER_1 → ILLUSTRATING_1 →
 *            CHAPTER_2 → ILLUSTRATING_2 → CHAPTER_3 → ILLUSTRATING_3 → PLAYBACK → SHARE
 *
 * Flow:
 * 1. Load story setup (prompt, concept checklist, ch1, scene image, TTS)
 * 2. Show intro with mission hook and concept cards
 * 3. Present 3 chapters with choice cards
 * 4. Batch mode: collect all 3 chapter answers, then generate all illustrations once
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
import useStoryStorage from "../../../hooks/useStoryStorage";
import { toApiUrl } from "../../../utils/api";

const LOADING_TIMEOUT_MS = 30000;
const STORY_BATCH_MODE = import.meta.env.VITE_STORY_BATCH_MODE !== "false";

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
  FINALIZING: "FINALIZING",
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
  FINALIZED_STORY: "FINALIZED_STORY",
  SHOW_SHARE: "SHOW_SHARE",
  ERROR: "ERROR",
  RETRY: "RETRY",
  BACK_TO_PLAYBACK: "BACK_TO_PLAYBACK",
  UPDATE_FUN_FACT: "UPDATE_FUN_FACT",
};

// Initial state
const initialState = {
  currentState: STATE.LOADING,
  storySetup: null,
  sceneImage: null,
  chapters: {},
  selections: [],
  illustrations: [],
  conceptsFound: [],
  funFact: null,
  error: null,
};

function normalizeFunFact(rawFact) {
  const text = rawFact?.fact || rawFact?.text;
  if (!text || typeof text !== "string") return null;
  return {
    emoji: rawFact?.emoji || "💡",
    text: text.trim(),
  };
}

function pickNextFunFact({
  apiFact,
  fallbackFacts = [],
  usedTexts,
  currentFactText = null,
}) {
  const fallbackPool = fallbackFacts.filter((fact) => fact?.text);
  const candidates = apiFact ? [apiFact, ...fallbackPool] : fallbackPool;

  if (candidates.length === 0) {
    return null;
  }

  const unusedFact = candidates.find((fact) => !usedTexts.has(fact.text));
  if (unusedFact) {
    return unusedFact;
  }

  const differentFact = candidates.find((fact) => fact.text !== currentFactText);
  if (differentFact) {
    return differentFact;
  }

  return candidates[0];
}

const FUN_FACT_API_MAX_ATTEMPTS = 2;

function buildDistinctFactQuery(baseQuery, excludedFacts = []) {
  if (excludedFacts.length === 0) {
    return baseQuery;
  }

  const priorFacts = excludedFacts
    .slice(-2)
    .map((fact) => fact.slice(0, 120))
    .join(" | ");

  return `${baseQuery}\nGive a different fun fact than these: ${priorFacts}`;
}

// Reducer function
function storyReducer(state, action) {
  switch (action.type) {
    case ACTION.STORY_LOADED:
      return {
        ...state,
        storySetup: action.payload.storySetup,
        sceneImage: action.payload.sceneImage,
        chapters: action.payload.chapters || {},
        currentState: STATE.INTRO,
        error: null,
      };

    case ACTION.START_STORY:
      return {
        ...state,
        currentState: STATE.CHAPTER_1,
      };

    case ACTION.SELECT_CHOICE: {
      const { chapter, choice, batchMode } = action.payload;
      const newSelections = [
        ...state.selections,
        { chapter, selectedText: choice.text, choice },
      ];

      // Determine next state
      let nextState = STATE.ILLUSTRATING_1;
      if (batchMode) {
        if (chapter === 1) nextState = STATE.CHAPTER_2;
        if (chapter === 2) nextState = STATE.CHAPTER_3;
        if (chapter === 3) nextState = STATE.FINALIZING;
      } else {
        if (chapter === 2) nextState = STATE.ILLUSTRATING_2;
        if (chapter === 3) nextState = STATE.ILLUSTRATING_3;
      }

      return {
        ...state,
        selections: newSelections,
        funFact: null,
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

    case ACTION.FINALIZED_STORY: {
      const { scenes, conceptsFound } = action.payload;
      const newConceptsFound = [
        ...new Set([...(conceptsFound || [])]),
      ];

      return {
        ...state,
        illustrations: Array.isArray(scenes) ? scenes : [],
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

    case ACTION.UPDATE_FUN_FACT:
      return {
        ...state,
        funFact: action.payload,
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
  const { saveStory } = useStoryStorage();

  const slidePayload = useMemo(() => buildLearnSlidesPayload(slides), [slides]);
  const loadRequestIdRef = useRef(0);
  const storyDataRef = useRef(null);
  const usedFunFactTextsRef = useRef(new Set());
  const currentFunFactTextRef = useRef(null);

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

  useEffect(() => {
    currentFunFactTextRef.current = state.funFact?.text || null;
  }, [state.funFact?.text]);

  // Reset fun fact history for a fresh run (initial load or retry)
  useEffect(() => {
    if (state.currentState === STATE.LOADING && state.selections.length === 0) {
      usedFunFactTextsRef.current.clear();
      currentFunFactTextRef.current = null;
    }
  }, [state.currentState, state.selections.length]);

  const fetchNextFunFact = useCallback(async ({
    signal,
    query,
    currentFactText = null,
  }) => {
    const baseQuery = query || topicName;
    const excludedFacts = [];
    let uniqueApiFact = null;

    for (let attempt = 0; attempt < FUN_FACT_API_MAX_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) {
        return null;
      }

      try {
        const res = await fetch(toApiUrl('/api/generate/engagement'), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: buildDistinctFactQuery(baseQuery, excludedFacts),
            explanationLevel,
            skipTTS: true,
          }),
          signal,
        });
        const data = res.ok ? await res.json() : null;
        const candidate = data?.fallback ? null : normalizeFunFact(data?.funFact);

        if (!candidate?.text) {
          break;
        }

        const isDuplicate =
          usedFunFactTextsRef.current.has(candidate.text) ||
          candidate.text === currentFactText;

        if (!isDuplicate) {
          uniqueApiFact = candidate;
          break;
        }

        excludedFacts.push(candidate.text);
      } catch {
        break;
      }
    }

    const fallbackFact = pickNextFunFact({
      apiFact: null,
      fallbackFacts: loaderFacts,
      usedTexts: usedFunFactTextsRef.current,
      currentFactText,
    });

    const nextFact = uniqueApiFact
      ? { ...uniqueApiFact, source: "api" }
      : fallbackFact
        ? { ...fallbackFact, source: "local" }
        : null;

    if (!nextFact?.text) {
      return null;
    }

    usedFunFactTextsRef.current.add(nextFact.text);

    void prefetch(
      `Fun fact. ${nextFact.text}`,
      `fun-fact-${nextFact.text.slice(0, 20)}`,
    ).catch(() => {
      // Non-critical: keep the visual fact even if TTS prefetch fails.
    });

    return nextFact;
  }, [topicName, explanationLevel, loaderFacts, prefetch]);

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

        // Fire engagement fetch independently so fun fact shows during loading
        const loadFunFact = async () => {
          const fact = await fetchNextFunFact({
            signal: controller.signal,
            query: topicName,
            currentFactText: null,
          });

          if (isStale() || !fact?.text) {
            return;
          }

          dispatch({ type: ACTION.UPDATE_FUN_FACT, payload: fact });
        };
        void loadFunFact();

        // Fetch story setup (slower, ~5-10s)
        const storyResponse = await fetch(toApiUrl('/api/learn/story'), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slides: slidePayload,
            topicName,
            explanationLevel,
          }),
          signal: controller.signal,
        });

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

        clearTimeout(timeoutId);

        // Pipeline: prefetch mission hook TTS so it plays instantly on INTRO
        if (storyData.missionHook && !isStale()) {
          await prefetch(storyData.missionHook, "mission-hook");
        }

        if (isStale()) return;

        // Dispatch loaded data
        const loadedChapters = buildStoryChaptersMap(storyData);

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
            chapters: loadedChapters,
            sceneImage: storyData.sceneImage || null,
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
  }, [
    slidePayload,
    topicName,
    explanationLevel,
    stop,
    prefetch,
    fetchNextFunFact,
  ]);

  // Auto-narrate mission hook in INTRO state (pre-cached by pipeline)
  // Also prefetch chapter 1 prompt TTS while user reads the intro
  useEffect(() => {
    if (state.currentState !== STATE.INTRO) return;
    if (state.storySetup?.missionHook) {
      narrate(state.storySetup.missionHook, "mission-hook");
    }
    // Pipeline: prefetch chapter 1 prompt TTS in background
    const ch1Prompt = state.chapters[1]?.prompt;
    if (ch1Prompt) {
      prefetch(ch1Prompt, "chapter-1-prompt");
    }
  }, [state.currentState, state.storySetup?.missionHook, state.chapters, narrate, prefetch]);

  // Auto-narrate chapter prompt when entering CHAPTER states
  useEffect(() => {
    const chapterStates = {
      [STATE.CHAPTER_1]: 1,
      [STATE.CHAPTER_2]: 2,
      [STATE.CHAPTER_3]: 3,
    };
    const chapterNum = chapterStates[state.currentState];
    if (!chapterNum) return;

    const chapterData = state.chapters[chapterNum];
    if (chapterData?.prompt) {
      narrate(chapterData.prompt, `chapter-${chapterNum}-prompt`);
    }
  }, [state.currentState, state.chapters, narrate]);

  // Auto-narrate fun fact during loading/illustrating states
  useEffect(() => {
    const loadingStates = [
      STATE.LOADING,
      STATE.ILLUSTRATING_1,
      STATE.ILLUSTRATING_2,
      STATE.ILLUSTRATING_3,
      STATE.FINALIZING,
    ];
    if (!loadingStates.includes(state.currentState)) return;
    if (!state.funFact?.text) return;
    narrate(
      `Fun fact. ${state.funFact.text}`,
      `fun-fact-${state.funFact.text.slice(0, 20)}`,
    );
  }, [state.currentState, state.funFact?.text, narrate]);

  // Generate chapter illustration after selection
  useEffect(() => {
    if (STORY_BATCH_MODE) {
      return;
    }

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

        void (async () => {
          const selectedText =
            state.selections[currentChapterNum - 1]?.selectedText || "";
          const fact = await fetchNextFunFact({
            signal: controller.signal,
            query: `${topicName} ${selectedText}`.trim(),
            currentFactText: currentFunFactTextRef.current,
          });

          if (
            controller.signal.aborted ||
            !fact?.text ||
            fact.text === currentFunFactTextRef.current
          ) {
            return;
          }

          currentFunFactTextRef.current = fact.text;
          dispatch({ type: ACTION.UPDATE_FUN_FACT, payload: fact });
        })();

        // Build previous chapters payload
        const previousChapters = state.selections.map((sel) => ({
          chapter: sel.chapter,
          selectedText: sel.selectedText,
        }));

        const response = await fetch(toApiUrl('/api/learn/story/chapter'), {
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
          panelCaptions: data.illustration?.panelCaptions || [],
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
        } else if (!data.nextChapter) {
          // Backend returned null nextChapter - treat as error
          logger.error("STORY", "Backend returned null nextChapter", {
            chapter: currentChapterNum,
          });
          dispatch({
            type: ACTION.ERROR,
            payload: "Story generation hit a snag. Please try again.",
          });
        } else {
          // Pipeline: prefetch next chapter prompt TTS before dispatching
          const nextChapterNum =
            data.nextChapter.chapterNumber || currentChapterNum + 1;
          if (data.nextChapter.prompt) {
            await prefetch(
              data.nextChapter.prompt,
              `chapter-${nextChapterNum}-prompt`,
            );
          }

          // More chapters to go
          dispatch({
            type: ACTION.CHAPTER_READY,
            payload: {
              illustration,
              nextChapter: {
                chapterNumber: nextChapterNum,
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
  }, [
    state.currentState,
    state.selections,
    state.storySetup,
    topicName,
    prefetch,
    fetchNextFunFact,
  ]);

  // Batch mode: generate all story scenes once after chapter 3 answer.
  useEffect(() => {
    if (!STORY_BATCH_MODE || state.currentState !== STATE.FINALIZING) {
      return;
    }

    const controller = new AbortController();

    const finalizeStory = async () => {
      try {
        logger.info("STORY", "Finalizing full story in one batch", {
          answerCount: state.selections.length,
        });

        void (async () => {
          const joinedSelections = state.selections
            .map((selection) => selection.selectedText)
            .join(" ");
          const fact = await fetchNextFunFact({
            signal: controller.signal,
            query: `${topicName} ${joinedSelections}`.trim(),
            currentFactText: currentFunFactTextRef.current,
          });

          if (
            controller.signal.aborted ||
            !fact?.text ||
            fact.text === currentFunFactTextRef.current
          ) {
            return;
          }

          currentFunFactTextRef.current = fact.text;
          dispatch({ type: ACTION.UPDATE_FUN_FACT, payload: fact });
        })();

        const answers = state.selections
          .map((selection) => ({
            chapterNumber: selection.chapter,
            choiceId: selection.choice?.id || `${selection.chapter}a`,
            selectedText: selection.selectedText,
            conceptHints: Array.isArray(selection.choice?.conceptHints)
              ? selection.choice.conceptHints
              : [],
          }))
          .sort((a, b) => a.chapterNumber - b.chapterNumber);

        const response = await fetch(toApiUrl('/api/learn/story/finalize'), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicName,
            conceptChecklist: state.storySetup?.conceptChecklist || [],
            imageStyle:
              state.storySetup?.imageStyle || "children's book illustration",
            answers,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode =
            errorData?.error || errorData?.message || "Failed to finalize story";
          throw new Error(errorCode);
        }

        const data = await response.json();
        const scenes = Array.isArray(data.scenes)
          ? data.scenes.map((scene, index) => ({
              chapterNumber:
                typeof scene.chapterNumber === "number"
                  ? scene.chapterNumber
                  : index + 1,
              chapterTitle:
                typeof scene.chapterTitle === "string" && scene.chapterTitle
                  ? scene.chapterTitle
                  : `Chapter ${index + 1}: ${getChapterLabel(index + 1)}`,
              narrativeText:
                typeof scene.narrativeText === "string"
                  ? scene.narrativeText
                  : state.selections[index]?.selectedText || "",
              sceneDescription:
                typeof scene.sceneDescription === "string"
                  ? scene.sceneDescription
                  : "",
              panelCaptions: Array.isArray(scene.panelCaptions)
                ? scene.panelCaptions
                : [],
              imageUrl: scene.imageUrl || null,
            }))
          : [];

        if (scenes.length !== 3) {
          throw new Error("Story finalization returned incomplete scenes.");
        }

        dispatch({
          type: ACTION.FINALIZED_STORY,
          payload: {
            scenes,
            conceptsFound: Array.isArray(data.conceptsFound)
              ? data.conceptsFound
              : [],
          },
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        logger.error("STORY", "Story finalization failed", {
          error: error.message,
        });
        dispatch({
          type: ACTION.ERROR,
          payload:
            error.message === "RATE_LIMITED"
              ? "Too many requests. Please wait a moment and try again."
              : error.message || "Failed to finalize story",
        });
      }
    };

    finalizeStory();

    return () => {
      controller.abort();
    };
  }, [
    state.currentState,
    state.selections,
    state.storySetup,
    topicName,
    fetchNextFunFact,
  ]);

  // Build playback scenes (must be declared before handlers that reference it)
  const playbackScenes = useMemo(() => {
    return state.illustrations.map((illustration, index) => ({
      imageUrl: illustration.imageUrl,
      sceneDescription: illustration.sceneDescription,
      panelCaptions: illustration.panelCaptions || [],
      narrativeText:
        illustration.narrativeText || state.selections[index]?.selectedText || "",
      chapterTitle:
        illustration.chapterTitle ||
        `Chapter ${index + 1}: ${getChapterLabel(index + 1)}`,
    }));
  }, [state.illustrations, state.selections]);

  // Handlers
  const handleStartStory = useCallback(() => {
    stop();
    dispatch({ type: ACTION.START_STORY });
  }, [stop]);

  const handleSelectChoice = useCallback((choice, chapter) => {
    dispatch({
      type: ACTION.SELECT_CHOICE,
      payload: { chapter, choice, batchMode: STORY_BATCH_MODE },
    });
  }, []);

  const handleShowShare = useCallback(() => {
    // Auto-save story (non-blocking)
    const xpEarned = calculateXP(
      state.conceptsFound.length,
      state.storySetup?.conceptChecklist?.length || 0,
    );
    const storyDoc = {
      id: crypto.randomUUID(),
      topicName,
      createdAt: Date.now(),
      scenes: playbackScenes,
      conceptsFound: [...state.conceptsFound],
      totalConcepts: state.storySetup?.conceptChecklist?.length || 0,
      xpEarned,
      storySetup: {
        storyPrompt: state.storySetup?.storyPrompt || "",
        conceptChecklist: [...(state.storySetup?.conceptChecklist || [])],
        imageStyle: state.storySetup?.imageStyle || "",
      },
      version: 2,
    };
    saveStory(storyDoc);

    dispatch({ type: ACTION.SHOW_SHARE });
  }, [state.conceptsFound, state.storySetup, topicName, playbackScenes, saveStory]);

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
    const totalConcepts = state.storySetup?.conceptChecklist?.length || 1;
    onComplete?.({
      completed: true,
      xpEarned,
      score: state.conceptsFound.length / totalConcepts,
      session: {
        completedAt: Date.now(),
        conceptsFound: [...state.conceptsFound],
        totalConcepts,
        xpEarned,
        scenes: playbackScenes,
      },
    });
  }, [stop, state.conceptsFound, state.storySetup, onComplete, playbackScenes]);

  const handleBack = useCallback(() => {
    const needsConfirmation = [
      STATE.CHAPTER_1,
      STATE.CHAPTER_2,
      STATE.CHAPTER_3,
      STATE.ILLUSTRATING_1,
      STATE.ILLUSTRATING_2,
      STATE.ILLUSTRATING_3,
      STATE.FINALIZING,
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
          key="chapter-1"
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
    if (STORY_BATCH_MODE) return null;
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
      />
    );
  }

  if (state.currentState === STATE.CHAPTER_2) {
    return (
      <>
        <ChapterScreen
          key="chapter-2"
          chapter={2}
          chapterData={state.chapters[2]}
          conceptCards={state.storySetup?.conceptCards || []}
          conceptsFound={new Set(state.conceptsFound)}
          previousIllustration={
            STORY_BATCH_MODE ? null : state.illustrations[0]?.imageUrl || null
          }
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
    if (STORY_BATCH_MODE) return null;
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
      />
    );
  }

  if (state.currentState === STATE.CHAPTER_3) {
    return (
      <>
        <ChapterScreen
          key="chapter-3"
          chapter={3}
          chapterData={state.chapters[3]}
          conceptCards={state.storySetup?.conceptCards || []}
          conceptsFound={new Set(state.conceptsFound)}
          previousIllustration={
            STORY_BATCH_MODE ? null : state.illustrations[1]?.imageUrl || null
          }
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
    if (STORY_BATCH_MODE) return null;
    return (
      <StoryLoader
        stageText="Illustrating your choice..."
        funFact={state.funFact}
      />
    );
  }

  if (state.currentState === STATE.FINALIZING) {
    return (
      <StoryLoader
        stageText="Creating your full 3-page manga story..."
        funFact={state.funFact}
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

function buildStoryChaptersMap(storyData) {
  const chapters = {};

  if (Array.isArray(storyData?.questionFlow) && storyData.questionFlow.length > 0) {
    for (const chapterItem of storyData.questionFlow) {
      if (!chapterItem || typeof chapterItem !== "object") continue;
      const chapterNumber = Number(chapterItem.chapterNumber);
      if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 3) continue;

      chapters[chapterNumber] = {
        prompt: typeof chapterItem.prompt === "string" ? chapterItem.prompt : "",
        icon: typeof chapterItem.icon === "string" ? chapterItem.icon : "📖",
        choices: Array.isArray(chapterItem.choices) ? chapterItem.choices : [],
      };
    }
  }

  if (Object.keys(chapters).length === 0 && storyData?.chapters && typeof storyData.chapters === "object") {
    for (const chapterNumber of [1, 2, 3]) {
      const chapterData = storyData.chapters?.[String(chapterNumber)];
      if (!chapterData || typeof chapterData !== "object") continue;
      chapters[chapterNumber] = chapterData;
    }
  }

  return chapters;
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

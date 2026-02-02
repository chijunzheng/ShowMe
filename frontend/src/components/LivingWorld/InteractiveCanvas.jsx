/**
 * InteractiveCanvas Component
 *
 * A touch-friendly wrapper around react-zoom-pan-pinch that provides pan, zoom,
 * and pinch gestures for the Living World panorama. This component handles all
 * gesture interactions while leaving content rendering to its children.
 *
 * Features:
 * - Pan: Touch drag or mouse drag with momentum
 * - Zoom: Pinch gesture, scroll wheel, or double-tap
 * - Kid-friendly: Smooth animations with soft bounds
 * - Exposes transform state and control methods via ref
 *
 * Usage:
 * ```jsx
 * const canvasRef = useRef(null)
 *
 * <InteractiveCanvas
 *   ref={canvasRef}
 *   onZoomChange={(zoom) => console.log('Zoom:', zoom)}
 * >
 *   <img src="panorama.jpg" alt="World" />
 * </InteractiveCanvas>
 *
 * // Later: canvasRef.current.resetTransform()
 * ```
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch'

/**
 * Default animation settings for kid-friendly smooth interactions
 */
const SMOOTH_ANIMATION = {
  animationType: 'easeOut',
  animationTime: 200,
}

/**
 * Internal component to expose controls via the useControls hook
 */
function CanvasControls({ onControlsReady }) {
  const controls = useControls()

  // Pass controls to parent on mount using useEffect (not useCallback)
  useEffect(() => {
    onControlsReady?.(controls)
  }, [controls, onControlsReady])

  return null
}

/**
 * InteractiveCanvas - Touch-friendly pan/zoom/pinch wrapper for panorama content
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the canvas
 * @param {Function} [props.onZoomChange] - Callback when zoom level changes: (zoom) => void
 * @param {Function} [props.onTransformStart] - Callback when transform gesture starts
 * @param {Function} [props.onTransformEnd] - Callback when transform gesture ends
 * @param {Function} [props.onTransformed] - Callback when transform state changes (continuous): ({ scale, positionX, positionY }) => void
 * @param {number} [props.minZoom=1] - Minimum zoom level
 * @param {number} [props.maxZoom=3] - Maximum zoom level
 * @param {number} [props.initialZoom=1] - Starting zoom level
 * @param {boolean} [props.centerOnInit=true] - Center content on mount
 * @param {boolean} [props.limitToBounds=true] - Soft bounds to prevent content escape
 * @param {boolean} [props.doubleClick=true] - Enable double-tap to zoom
 * @param {boolean} [props.panning=true] - Enable panning
 * @param {boolean} [props.pinch=true] - Enable pinch gestures
 * @param {boolean} [props.wheel=true] - Enable scroll wheel zoom
 * @param {string} [props.className] - Optional class for wrapper
 * @param {React.Ref} ref - Ref to access transform controls
 */
const InteractiveCanvas = forwardRef(function InteractiveCanvas(
  {
    children,
    onZoomChange,
    onTransformStart,
    onTransformEnd,
    onTransformed,
    minZoom = 1,
    maxZoom = 3,
    initialZoom = 1,
    centerOnInit = true,
    limitToBounds = true,
    doubleClick = true,
    panning = true,
    pinch = true,
    wheel = true,
    className,
  },
  ref
) {
  // Store controls from useControls hook
  const controlsRef = useRef(null)

  // Store current transform state
  const transformStateRef = useRef({
    scale: initialZoom,
    positionX: 0,
    positionY: 0,
  })

  /**
   * Handle zoom change event
   * Fires when zoom animation completes
   */
  const handleZoomStop = useCallback(
    (ref, event) => {
      const { scale } = ref.state
      transformStateRef.current = { ...ref.state }
      onZoomChange?.(scale)
    },
    [onZoomChange]
  )

  /**
   * Handle transform start (pan/zoom begins)
   */
  const handleTransformStart = useCallback(
    (ref, event) => {
      onTransformStart?.(ref.state, event)
    },
    [onTransformStart]
  )

  /**
   * Handle transform end (pan/zoom ends)
   */
  const handleTransformEnd = useCallback(
    (ref, event) => {
      transformStateRef.current = { ...ref.state }
      onTransformEnd?.(ref.state, event)
    },
    [onTransformEnd]
  )

  /**
   * Handle panning stop to update state
   */
  const handlePanningStop = useCallback((ref) => {
    transformStateRef.current = { ...ref.state }
  }, [])

  /**
   * Handle continuous transform updates
   * Fires whenever scale or position changes, during any transform type
   */
  const handleTransformed = useCallback(
    (ref, state) => {
      transformStateRef.current = { ...state }
      onTransformed?.(state)
    },
    [onTransformed]
  )

  /**
   * Store controls reference when ready
   */
  const handleControlsReady = useCallback((controls) => {
    controlsRef.current = controls
  }, [])

  /**
   * Expose methods and state via ref
   */
  useImperativeHandle(
    ref,
    () => ({
      /**
       * Reset transform to initial state
       * @param {number} [animationTime] - Optional animation duration in ms
       */
      resetTransform: (animationTime) => {
        controlsRef.current?.resetTransform(animationTime)
      },

      /**
       * Zoom in by one step
       * @param {number} [step] - Zoom step amount
       * @param {number} [animationTime] - Animation duration in ms
       */
      zoomIn: (step, animationTime) => {
        controlsRef.current?.zoomIn(step, animationTime)
      },

      /**
       * Zoom out by one step
       * @param {number} [step] - Zoom step amount
       * @param {number} [animationTime] - Animation duration in ms
       */
      zoomOut: (step, animationTime) => {
        controlsRef.current?.zoomOut(step, animationTime)
      },

      /**
       * Center the view
       * @param {number} [scale] - Optional scale to apply
       * @param {number} [animationTime] - Animation duration in ms
       */
      centerView: (scale, animationTime) => {
        controlsRef.current?.centerView(scale, animationTime)
      },

      /**
       * Set specific transform values
       * @param {number} x - X position
       * @param {number} y - Y position
       * @param {number} scale - Zoom scale
       * @param {number} [animationTime] - Animation duration in ms
       */
      setTransform: (x, y, scale, animationTime) => {
        controlsRef.current?.setTransform(x, y, scale, animationTime)
      },

      /**
       * Get current transform state
       * @returns {{ scale: number, positionX: number, positionY: number }}
       */
      getTransformState: () => ({ ...transformStateRef.current }),
    }),
    []
  )

  return (
    <TransformWrapper
      initialScale={initialZoom}
      minScale={minZoom}
      maxScale={maxZoom}
      centerOnInit={centerOnInit}
      limitToBounds={limitToBounds}
      doubleClick={{
        disabled: !doubleClick,
        mode: 'toggle', // Zoom in on first tap, reset on second
        step: 0.5,
        animationTime: SMOOTH_ANIMATION.animationTime,
        animationType: SMOOTH_ANIMATION.animationType,
      }}
      panning={{
        disabled: !panning,
        velocityDisabled: false, // Enable momentum scrolling
      }}
      pinch={{
        disabled: !pinch,
      }}
      wheel={{
        disabled: !wheel,
        step: 0.1,
        smoothStep: 0.004, // Smoother trackpad scrolling
      }}
      onZoomStop={handleZoomStop}
      onPanningStart={handleTransformStart}
      onPanningStop={handlePanningStop}
      onPinchingStart={handleTransformStart}
      onPinchingStop={handleTransformEnd}
      onWheelStart={handleTransformStart}
      onWheelStop={handleTransformEnd}
      onTransformed={handleTransformed}
      smooth={true}
      alignmentAnimation={SMOOTH_ANIMATION}
      velocityAnimation={{
        sensitivity: 1,
        animationTime: 300,
        animationType: 'easeOut',
        equalToMove: true,
      }}
    >
      {() => (
        <>
          <CanvasControls onControlsReady={handleControlsReady} />
          <TransformComponent
            wrapperClass={className}
            wrapperStyle={{
              width: '100%',
              height: '100%',
            }}
            contentStyle={{
              width: '100%',
              height: '100%',
            }}
          >
            {children}
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  )
})

export default InteractiveCanvas

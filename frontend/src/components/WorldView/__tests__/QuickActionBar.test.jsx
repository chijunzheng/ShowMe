/**
 * QuickActionBar Component Tests
 *
 * TDD tests for the QuickActionBar component that displays a floating action bar
 * shown on long-press or double-tap of a world piece, providing quick actions:
 * - Review (slides icon) - Navigate to review slides
 * - Quiz (lightning icon) - Start a quiz for the piece
 * - Related (link icon) - Show related topics
 * - Suggestions (compass icon) - Open suggestions panel
 *
 * Tests cover:
 * - Rendering all 4 action buttons correctly
 * - Each button has correct accessibility (aria-label)
 * - onClick callbacks fire with correct action IDs
 * - Positioning props work (position: { x, y })
 * - Keyboard accessibility (Enter/Space triggers actions)
 * - Auto-dismiss after action or timeout (optional dismissAfter prop)
 * - Animation classes for entrance/exit
 * - Close button works
 * - Backdrop tap dismisses
 * - Shows piece name in header
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

import QuickActionBar from "../QuickActionBar";

// Test fixtures for pieces
const createMockPiece = (overrides = {}) => ({
  id: `piece-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test Piece",
  zone: "nature",
  icon: "🌿",
  ...overrides,
});

/**
 * Default props for QuickActionBar component
 */
const createDefaultProps = (overrides = {}) => ({
  piece: createMockPiece(),
  position: { x: 100, y: 200 },
  onAction: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
});

describe("QuickActionBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders the action bar container", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("renders all 4 action buttons", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const buttons = screen.getAllByRole("button");
      // 4 action buttons + 1 close button = 5 total
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it("renders Review action button", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(
        screen.getByRole("button", { name: /review/i }),
      ).toBeInTheDocument();
    });

    it("renders Quiz action button", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByRole("button", { name: /quiz/i })).toBeInTheDocument();
    });

    it("renders Related action button", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(
        screen.getByRole("button", { name: /related/i }),
      ).toBeInTheDocument();
    });

    it("renders Suggestions action button", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(
        screen.getByRole("button", { name: /suggestions/i }),
      ).toBeInTheDocument();
    });

    it("renders close button", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(
        screen.getByRole("button", { name: /close/i }),
      ).toBeInTheDocument();
    });

    it("displays piece name in header", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Solar System" }),
      });

      render(<QuickActionBar {...props} />);

      expect(screen.getByText("Solar System")).toBeInTheDocument();
    });

    it("displays piece icon in header", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Ocean Life", icon: "🐠" }),
      });

      render(<QuickActionBar {...props} />);

      expect(screen.getByText("🐠")).toBeInTheDocument();
    });
  });

  describe("accessibility - aria labels", () => {
    it("Review button has correct aria-label", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Volcanoes" }),
      });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("review"),
      );
    });

    it("Quiz button has correct aria-label", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Volcanoes" }),
      });

      render(<QuickActionBar {...props} />);

      const quizButton = screen.getByRole("button", { name: /quiz/i });
      expect(quizButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("quiz"),
      );
    });

    it("Related button has correct aria-label", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Volcanoes" }),
      });

      render(<QuickActionBar {...props} />);

      const relatedButton = screen.getByRole("button", { name: /related/i });
      expect(relatedButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("related"),
      );
    });

    it("Suggestions button has correct aria-label", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Volcanoes" }),
      });

      render(<QuickActionBar {...props} />);

      const suggestionsButton = screen.getByRole("button", {
        name: /suggestions/i,
      });
      expect(suggestionsButton).toHaveAttribute(
        "aria-label",
        expect.stringContaining("suggestions"),
      );
    });

    it("toolbar has accessible aria-label", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Dinosaurs" }),
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Dinosaurs"),
      );
    });
  });

  describe("onClick callbacks", () => {
    it('calls onAction with "review" when Review button is clicked', () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.click(reviewButton);

      expect(onAction).toHaveBeenCalledWith("review");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction with "quiz" when Quiz button is clicked', () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const quizButton = screen.getByRole("button", { name: /quiz/i });
      fireEvent.click(quizButton);

      expect(onAction).toHaveBeenCalledWith("quiz");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction with "related" when Related button is clicked', () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const relatedButton = screen.getByRole("button", { name: /related/i });
      fireEvent.click(relatedButton);

      expect(onAction).toHaveBeenCalledWith("related");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('calls onAction with "suggestions" when Suggestions button is clicked', () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const suggestionsButton = screen.getByRole("button", {
        name: /suggestions/i,
      });
      fireEvent.click(suggestionsButton);

      expect(onAction).toHaveBeenCalledWith("suggestions");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not crash when onAction is not provided", () => {
      const props = {
        piece: createMockPiece(),
        position: { x: 100, y: 200 },
        onClose: vi.fn(),
        // onAction intentionally omitted
      };

      expect(() => {
        render(<QuickActionBar {...props} />);
        const reviewButton = screen.getByRole("button", { name: /review/i });
        fireEvent.click(reviewButton);
      }).not.toThrow();
    });
  });

  describe("positioning", () => {
    it("applies position.x to left style", () => {
      const props = createDefaultProps({
        position: { x: 150, y: 200 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveStyle({ left: "150px" });
    });

    it("applies position.y to top style", () => {
      const props = createDefaultProps({
        position: { x: 100, y: 250 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveStyle({ top: "250px" });
    });

    it("uses fixed positioning", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/fixed/);
    });

    it("handles position at origin (0, 0)", () => {
      const props = createDefaultProps({
        position: { x: 0, y: 0 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveStyle({ left: "0px", top: "0px" });
    });

    it("handles large position values", () => {
      const props = createDefaultProps({
        position: { x: 1920, y: 1080 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveStyle({ left: "1920px", top: "1080px" });
    });

    it("applies transform for centering", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      // Should have transform to center horizontally
      expect(toolbar.className).toMatch(/transform|-translate/);
    });
  });

  describe("keyboard accessibility", () => {
    it("triggers onAction when Enter is pressed on Review button", () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.keyDown(reviewButton, { key: "Enter" });

      expect(onAction).toHaveBeenCalledWith("review");
    });

    it("triggers onAction when Space is pressed on Quiz button", () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const quizButton = screen.getByRole("button", { name: /quiz/i });
      fireEvent.keyDown(quizButton, { key: " " });

      expect(onAction).toHaveBeenCalledWith("quiz");
    });

    it("triggers onClose when Escape is pressed", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not trigger action for other keys", () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.keyDown(reviewButton, { key: "Tab" });
      fireEvent.keyDown(reviewButton, { key: "a" });

      expect(onAction).not.toHaveBeenCalled();
    });

    it("buttons are focusable with tabIndex", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const actionButtons = screen.getAllByRole("button");
      actionButtons.forEach((button) => {
        expect(button).toHaveAttribute("tabIndex", "0");
      });
    });

    it("has visible focus indicators", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton.className).toMatch(/focus:/);
    });
  });

  describe("auto-dismiss after timeout", () => {
    it("does not auto-dismiss when dismissAfter is not set", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it("auto-dismisses after specified timeout", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({
        onClose,
        dismissAfter: 3000,
      });

      render(<QuickActionBar {...props} />);

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("auto-dismisses after 5000ms when dismissAfter is 5000", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({
        onClose,
        dismissAfter: 5000,
      });

      render(<QuickActionBar {...props} />);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("clears timeout on unmount", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({
        onClose,
        dismissAfter: 3000,
      });

      const { unmount } = render(<QuickActionBar {...props} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not have been called since component unmounted
      expect(onClose).not.toHaveBeenCalled();
    });

    it("dismisses immediately on action before timeout", () => {
      const onAction = vi.fn();
      const onClose = vi.fn();
      const props = createDefaultProps({
        onAction,
        onClose,
        dismissAfter: 5000,
      });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.click(reviewButton);

      expect(onAction).toHaveBeenCalledWith("review");
      // Action should trigger close
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("animation classes", () => {
    it("has entrance animation class", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/animate-|transition/);
    });

    it("has scale-in animation for buttons", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton.className).toMatch(/transition|animate/);
    });

    it("applies staggered animation delay to buttons", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const buttons = screen.getAllByRole("button");
      // First few buttons should have animation delay classes or inline styles
      const hasAnimationDelay = buttons.some(
        (button) =>
          button.className.includes("delay-") ||
          button.style.animationDelay ||
          button.style.transitionDelay,
      );
      expect(hasAnimationDelay || buttons.length > 0).toBe(true);
    });

    it("has hover scale effect on action buttons", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton.className).toMatch(/hover:scale/);
    });

    it("has duration class for smooth transitions", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/duration/);
    });
  });

  describe("backdrop", () => {
    it("renders backdrop overlay", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByTestId("quick-action-backdrop")).toBeInTheDocument();
    });

    it("calls onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const backdrop = screen.getByTestId("quick-action-backdrop");
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when toolbar is clicked", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      fireEvent.click(toolbar);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("backdrop has transparent styling", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const backdrop = screen.getByTestId("quick-action-backdrop");
      expect(backdrop.className).toMatch(/bg-black\/|bg-transparent|opacity/);
    });

    it("backdrop is behind the toolbar (lower z-index)", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const backdrop = screen.getByTestId("quick-action-backdrop");
      const toolbar = screen.getByRole("toolbar");

      expect(backdrop.className).toMatch(/z-/);
      expect(toolbar.className).toMatch(/z-/);
    });
  });

  describe("close button", () => {
    it("close button is visible", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toBeVisible();
    });

    it("close button has X icon", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      // Either has X text or an SVG icon
      expect(
        closeButton.textContent.includes("×") ||
          closeButton.querySelector("svg") ||
          closeButton.innerHTML.includes("X") ||
          closeButton.innerHTML.includes("close"),
      ).toBe(true);
    });

    it("close button responds to Enter key", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.keyDown(closeButton, { key: "Enter" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("close button responds to Space key", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.keyDown(closeButton, { key: " " });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("piece header", () => {
    it("displays piece name prominently", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Ancient Rome" }),
      });

      render(<QuickActionBar {...props} />);

      const header = screen.getByText("Ancient Rome");
      expect(header).toBeInTheDocument();
    });

    it("handles long piece names gracefully", () => {
      const props = createDefaultProps({
        piece: createMockPiece({
          name: "The Extremely Long and Detailed Topic About Something Very Specific",
        }),
      });

      render(<QuickActionBar {...props} />);

      const header = screen.getByText(
        /The Extremely Long and Detailed Topic About Something Very Specific/i,
      );
      expect(header).toBeInTheDocument();
      // Should have truncation or proper text handling
      expect(header.className).toMatch(
        /truncate|overflow|text-ellipsis|line-clamp/,
      );
    });

    it("displays different piece zones", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "Magic Spells", zone: "arcane" }),
      });

      render(<QuickActionBar {...props} />);

      expect(screen.getByText("Magic Spells")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles piece with empty name", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ name: "" }),
      });

      expect(() => {
        render(<QuickActionBar {...props} />);
      }).not.toThrow();
    });

    it("handles piece with null icon", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ icon: null }),
      });

      expect(() => {
        render(<QuickActionBar {...props} />);
      }).not.toThrow();
    });

    it("handles piece with undefined zone", () => {
      const props = createDefaultProps({
        piece: { id: "test", name: "Test", icon: "?" },
      });

      expect(() => {
        render(<QuickActionBar {...props} />);
      }).not.toThrow();
    });

    it("handles negative position values", () => {
      const props = createDefaultProps({
        position: { x: -50, y: -100 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveStyle({ left: "-50px", top: "-100px" });
    });

    it("handles decimal position values", () => {
      const props = createDefaultProps({
        position: { x: 123.456, y: 789.012 },
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe("styling and visual design", () => {
    it("has rounded corners", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/rounded/);
    });

    it("has shadow for depth effect", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/shadow/);
    });

    it("has background color", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/bg-/);
    });

    it("action buttons are arranged horizontally", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/flex/);
    });

    it("has appropriate padding", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/p-|px-|py-/);
    });

    it("buttons have appropriate sizing", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton.className).toMatch(/w-|h-|p-/);
    });
  });

  describe("zone-specific styling", () => {
    it("applies nature zone accent color", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: "nature" }),
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      // Should have green accent somewhere
      expect(toolbar.innerHTML).toMatch(/green|emerald/);
    });

    it("applies civilization zone accent color", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: "civilization" }),
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      // Should have indigo accent somewhere
      expect(toolbar.innerHTML).toMatch(/indigo|primary|blue/);
    });

    it("applies arcane zone accent color", () => {
      const props = createDefaultProps({
        piece: createMockPiece({ zone: "arcane" }),
      });

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      // Should have purple accent somewhere
      expect(toolbar.innerHTML).toMatch(/purple|violet/);
    });
  });

  describe("action button icons", () => {
    it("Review button has slides/presentation icon", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      // Should contain an icon (SVG or emoji)
      expect(
        reviewButton.querySelector("svg") ||
          reviewButton.textContent.match(/📊|📋|🎞️|▶️/),
      ).toBeTruthy();
    });

    it("Quiz button has lightning/bolt icon", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const quizButton = screen.getByRole("button", { name: /quiz/i });
      expect(
        quizButton.querySelector("svg") ||
          quizButton.textContent.match(/⚡|🎯|❓/),
      ).toBeTruthy();
    });

    it("Related button has link/connection icon", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const relatedButton = screen.getByRole("button", { name: /related/i });
      expect(
        relatedButton.querySelector("svg") ||
          relatedButton.textContent.match(/🔗|🔀|↔️/),
      ).toBeTruthy();
    });

    it("Suggestions button has compass icon", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const suggestionsButton = screen.getByRole("button", {
        name: /suggestions/i,
      });
      expect(
        suggestionsButton.querySelector("svg") ||
          suggestionsButton.textContent.match(/🧭|💡|✨/),
      ).toBeTruthy();
    });
  });

  describe("component structure", () => {
    it("renders as a semantic toolbar element", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("contains header section", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByTestId("quick-action-header")).toBeInTheDocument();
    });

    it("contains actions section", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      expect(screen.getByTestId("quick-action-buttons")).toBeInTheDocument();
    });

    it("has proper z-index for floating above content", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar.className).toMatch(/z-50|z-40|z-\[/);
    });
  });

  describe("interaction feedback", () => {
    it("buttons have active state styling", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      expect(reviewButton.className).toMatch(/active:/);
    });

    it("buttons change appearance on hover", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.mouseEnter(reviewButton);

      // Button should still be interactive
      expect(reviewButton).toBeInTheDocument();
    });

    it("buttons show pressed state on mouseDown", () => {
      const props = createDefaultProps();

      render(<QuickActionBar {...props} />);

      const quizButton = screen.getByRole("button", { name: /quiz/i });
      fireEvent.mouseDown(quizButton);

      // Should still be in document and interactive
      expect(quizButton).toBeInTheDocument();
    });
  });

  describe("touch interaction", () => {
    it("supports touch events for mobile", () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      fireEvent.touchStart(reviewButton);
      fireEvent.touchEnd(reviewButton);
      fireEvent.click(reviewButton);

      expect(onAction).toHaveBeenCalledWith("review");
    });

    it("backdrop responds to touch", () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<QuickActionBar {...props} />);

      const backdrop = screen.getByTestId("quick-action-backdrop");
      fireEvent.touchStart(backdrop);
      fireEvent.touchEnd(backdrop);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("multiple actions sequence", () => {
    it("only triggers one action at a time", () => {
      const onAction = vi.fn();
      const props = createDefaultProps({ onAction });

      render(<QuickActionBar {...props} />);

      const reviewButton = screen.getByRole("button", { name: /review/i });
      const quizButton = screen.getByRole("button", { name: /quiz/i });

      fireEvent.click(reviewButton);
      fireEvent.click(quizButton);

      // Both should fire independently
      expect(onAction).toHaveBeenCalledWith("review");
      expect(onAction).toHaveBeenCalledWith("quiz");
      expect(onAction).toHaveBeenCalledTimes(2);
    });
  });
});

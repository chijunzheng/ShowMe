import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TimelineRebuild from '../TimelineRebuild'

vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

describe('TimelineRebuild', () => {
  it('validates event order before continuing', () => {
    const onSubmit = vi.fn()

    render(
      <TimelineRebuild
        explanationLevel="simple"
        timeline={{
          events: [
            { id: 't1', text: 'First event', order: 1 },
            { id: 't2', text: 'Second event', order: 2 },
          ],
          causalLinks: [{ from: 't1', to: 't2' }],
        }}
        onSubmit={onSubmit}
      />
    )

    const continueButton = screen.getByRole('button', { name: /continue to warrant/i })
    expect(continueButton).toBeDisabled()

    fireEvent.click(screen.getAllByText('↑')[1])

    expect(continueButton).not.toBeDisabled()

    fireEvent.click(continueButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].orderedEventIds[0]).toBe('t1')
  })
})

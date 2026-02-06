import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CrimeSceneScan from '../CrimeSceneScan'

vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

describe('CrimeSceneScan', () => {
  it('tracks required hotspots and prevents double-count', () => {
    const onSubmit = vi.fn()

    render(
      <CrimeSceneScan
        explanationLevel="standard"
        crimeScene={{
          requiredHotspotCount: 2,
          hotspots: [
            { id: 'h1', x: 20, y: 30, radius: 8, evidenceId: 'e1' },
            { id: 'h2', x: 40, y: 60, radius: 8, evidenceId: 'e2' },
            { id: 'h3', x: 70, y: 40, radius: 8, evidenceId: 'e3', bonus: true },
          ],
          evidenceCards: [
            { id: 'e1', title: 'E1', text: 'Evidence 1' },
            { id: 'e2', title: 'E2', text: 'Evidence 2' },
            { id: 'e3', title: 'E3', text: 'Evidence 3' },
          ],
        }}
        onSubmit={onSubmit}
      />
    )

    const coreSpots = screen.getAllByLabelText('Core hotspot')

    fireEvent.click(coreSpots[0])
    fireEvent.click(coreSpots[0])

    expect(screen.getByText(/1\/2 core clues/i)).toBeInTheDocument()

    fireEvent.click(coreSpots[1])

    const continueButton = screen.getByRole('button', { name: /continue to witness room/i })
    expect(continueButton).not.toBeDisabled()

    fireEvent.click(continueButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ foundHotspotIds: expect.arrayContaining(['h1', 'h2']) })
    )
  })
})

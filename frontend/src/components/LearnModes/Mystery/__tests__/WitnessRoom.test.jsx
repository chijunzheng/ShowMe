import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WitnessRoom from '../WitnessRoom'

vi.mock('../../../../utils/haptics', () => ({
  vibrateShort: vi.fn(),
}))

describe('WitnessRoom', () => {
  it('requires contradiction resolution in deep mode', () => {
    const onSubmit = vi.fn()

    render(
      <WitnessRoom
        explanationLevel="deep"
        witnesses={[
          {
            id: 'w1',
            name: 'Witness 1',
            role: 'Observer',
            questionCards: ['Q1', 'Q2'],
            responses: [
              { question: 'Q1', statement: 'Statement A', reliability: 0.8, tags: ['a'], contradictionKey: 'A' },
              { question: 'Q2', statement: 'Statement B', reliability: 0.7, tags: ['b'], contradictionKey: 'B' },
            ],
          },
        ]}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByText('Q1'))
    fireEvent.click(screen.getByText('Q2'))

    const continueButton = screen.getByRole('button', { name: /continue to timeline/i })
    expect(continueButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /resolve contradiction/i }))
    expect(continueButton).not.toBeDisabled()

    fireEvent.click(continueButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ resolvedContradictions: 1 })
    )
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WarrantDecision from '../WarrantDecision'

vi.mock('../../../../utils/soundEffects', () => ({
  playMicOnSound: vi.fn(),
}))

vi.mock('../../../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('WarrantDecision', () => {
  it('requires rationale in deep mode before submit', () => {
    const onSubmit = vi.fn()

    render(
      <WarrantDecision
        topicName="Heat Transfer"
        explanationLevel="deep"
        verdict={{
          options: ['A', 'B', 'C', 'D'],
          expectedConcepts: ['heat transfer'],
        }}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByText('B'))

    const submitButton = screen.getByRole('button', { name: /file warrant/i })
    expect(submitButton).toBeDisabled()

    fireEvent.change(
      screen.getByPlaceholderText(/required in deep mode/i),
      { target: { value: 'The open window caused convection heat loss.' } }
    )

    expect(submitButton).not.toBeDisabled()

    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ selectedIndex: 1, rationale: expect.stringContaining('convection') })
    )
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SolveVoiceText from '../SolveVoiceText'

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

describe('SolveVoiceText', () => {
  it('renders without throwing initialization errors', () => {
    render(
      <SolveVoiceText
        topicName="Heat Transfer"
        expectedConcepts={['heat transfer']}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText('Your Theory')).toBeInTheDocument()
  })
})

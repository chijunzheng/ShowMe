import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComicPage from '../ComicPage'

describe('ComicPage', () => {
  it('renders chapter badge and panel captions when provided', () => {
    render(
      <ComicPage
        imageUrl="data:image/png;base64,test"
        chapterTitle="Chapter 1: The Beginning"
        sceneDescription="A bright comic scene"
        panelCaptions={[
          'Panel one text',
          'Panel two text',
          'Panel three text',
          'Panel four text',
        ]}
      />
    )

    expect(screen.getByText('Chapter 1: The Beginning')).toBeInTheDocument()
    expect(screen.getByText('Panel one text')).toBeInTheDocument()
    expect(screen.getByText('Panel two text')).toBeInTheDocument()
    expect(screen.getByText('Panel three text')).toBeInTheDocument()
    expect(screen.getByText('Panel four text')).toBeInTheDocument()
  })

  it('falls back to plain image rendering when captions are missing', () => {
    render(
      <ComicPage
        imageUrl="data:image/png;base64,test"
        chapterTitle="Chapter 2: Fallback"
        sceneDescription="Fallback scene"
      />
    )

    expect(screen.getByText('Chapter 2: Fallback')).toBeInTheDocument()
    expect(screen.queryByText('1.')).not.toBeInTheDocument()
  })
})

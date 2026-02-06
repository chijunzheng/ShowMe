import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateContent = vi.fn()
const mockGetAccessToken = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent: mockGenerateContent }
    }
  },
}))

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    async getClient() {
      return {
        getAccessToken: mockGetAccessToken,
      }
    }
  },
}))

describe('generateTTS model fallback chain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllGlobals()

    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GENAI_TTS_PRIMARY_MODEL = 'gemini-2.5-pro-preview-tts'
    process.env.GENAI_TTS_FALLBACK_MODELS = 'gemini-2.5-flash-preview-tts'
    process.env.GOOGLE_CLOUD_PROJECT = 'adk-coding-agent'
  })

  it('uses GenAI flash preview fallback before Cloud TTS', async () => {
    const rateLimited = Object.assign(new Error('RESOURCE_EXHAUSTED: quota exceeded'), { status: 429 })

    mockGenerateContent
      .mockRejectedValueOnce(rateLimited)
      .mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/pcm',
                    data: Buffer.from('pcm-audio').toString('base64'),
                  },
                },
              ],
            },
          },
        ],
      })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { generateTTS } = await import('../gemini.js')
    const result = await generateTTS('Detective clue narration')

    expect(result.error).toBeNull()
    expect(result.audioUrl).toContain('data:audio/wav;base64,')
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-2.5-pro-preview-tts')
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-2.5-flash-preview-tts')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to Cloud TTS only after all GenAI models fail', async () => {
    const rateLimited = Object.assign(new Error('RESOURCE_EXHAUSTED: quota exceeded'), { status: 429 })
    mockGenerateContent
      .mockRejectedValueOnce(rateLimited)
      .mockRejectedValueOnce(rateLimited)

    mockGetAccessToken.mockResolvedValue('test-access-token')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ audioContent: Buffer.from('cloud-audio').toString('base64') }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { generateTTS } = await import('../gemini.js')
    const result = await generateTTS('Final fallback narration')

    expect(result.error).toBeNull()
    expect(result.audioUrl).toContain('data:audio/mpeg;base64,')
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://texttospeech.googleapis.com/v1/text:synthesize')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-access-token')
  })
})

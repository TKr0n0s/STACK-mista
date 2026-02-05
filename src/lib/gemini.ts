import 'server-only'
import { GoogleGenerativeAI, type ResponseSchema } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not configured')
    }
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _client
}

export function getGeminiModel() {
  const client = getGeminiClient()
  return client.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
  })
}

export function getGeminiJsonModel(responseSchema: ResponseSchema) {
  const client = getGeminiClient()
  return client.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  })
}

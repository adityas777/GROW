import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000')

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export const api = {
  post: (url, data, config) => client.post(url, data, config).then(r => r.data),
  get: (url, config) => client.get(url, config).then(r => r.data),

  async createSession() {
    const { data } = await client.post('/auth/session')
    return data
  },

  async sendMessage({ text, session_id, lang = 'hinglish', user_email, user_name }) {
    const { data } = await client.post('/chat', { text, session_id, lang, user_email, user_name })
    return data
  },

  async confirmOrder({ session_id, confirm_token, plan, user_email, user_name }) {
    const { data } = await client.post('/chat/confirm', { session_id, confirm_token, plan, user_email, user_name })
    return data
  },

  async speechToText(audioBlob) {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    const { data } = await client.post('/voice/stt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async textToSpeech({ text, lang = 'hi-IN' }) {
    try {
      const resp = await client.post('/voice/tts', { text, lang }, { responseType: 'blob' })
      if (resp.headers['x-provider'] === 'browser' || resp.data?.use_browser_tts) {
        return { use_browser_tts: true, text }
      }
      return { audio_blob: resp.data }
    } catch {
      return { use_browser_tts: true, text }
    }
  },

  async triggerPaycheck({ amount, source, session_id, user_email, user_name }) {
    const { data } = await client.post('/paycheck/event', { amount, source, session_id, user_email, user_name })
    return data
  },

  async approvePaycheckSplit({ session_id, sip_amount }) {
    const { data } = await client.post('/paycheck/approve', { session_id, sip_amount })
    return data
  },

  async simulatePaycheckSMS({ text, sender = 'HDFCBK', session_id }) {
    const { data } = await client.post('/paycheck/simulate', { text, sender, session_id })
    return data
  },

  async syncGmailPaycheck({ email, password, session_id, max_search = 15, simulate_sample } = {}) {
    const { data } = await client.post('/paycheck/sync-gmail', {
      email,
      password,
      session_id,
      max_search,
      simulate_sample,
    })
    return data
  },

  async getPortfolio(session_id) {
    const { data } = await client.get(`/portfolio/${session_id}`)
    return data
  },

  async seedPortfolio(session_id) {
    const { data } = await client.post(`/portfolio/${session_id}/seed`)
    return data
  },

  async getOpsDashboard() {
    const { data } = await client.get('/ops/dashboard')
    return data
  },

  async runEvals() {
    const { data } = await client.post('/ops/evals/run')
    return data
  },

  async getFunds() {
    const { data } = await client.get('/ops/funds')
    return data
  },
}

// Helper to strip emojis and markdown symbols for natural TTS speech
export function cleanTextForSpeech(text) {
  if (!text) return ''
  return text
    // Strip markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip bold and italics
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip headings, quotes, bullets
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    // Currency conversion for natural pronunciation
    .replace(/₹\s*([\d,]+)/g, '$1 rupees')
    .replace(/Rs\.?\s*([\d,]+)/gi, '$1 rupees')
    .replace(/%/g, ' percent')
    // Strip ALL emojis and pictographs so TTS never says "rocket emoji"
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    // Collapse multi-spaces
    .replace(/\s+/g, ' ')
    .trim()
}

// Browser TTS helper
export function speakText(text, lang = 'hi-IN') {
  if (!('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const clean = cleanTextForSpeech(text)
  if (!clean) return

  const utterance = new SpeechSynthesisUtterance(clean)

  // Language auto-detection
  const isDevanagari = /[\u0900-\u097F]/.test(clean)
  const targetLang = (lang === 'en' || (!isDevanagari && lang !== 'hi')) ? 'en-IN' : 'hi-IN'
  utterance.lang = targetLang

  // Find best matching voice
  const voices = window.speechSynthesis.getVoices()
  const matchingVoice = voices.find(v => v.lang === targetLang) ||
                        voices.find(v => v.lang.startsWith(targetLang.slice(0, 2))) ||
                        voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'))

  if (matchingVoice) {
    utterance.voice = matchingVoice
  }

  utterance.rate = 1.0
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
}


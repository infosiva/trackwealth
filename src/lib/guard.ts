// Gate item 36 (LLM input guard). Treat all user/retrieved text as untrusted.
const INJECTION = /(ignore (all |any )?(previous|prior|above) (instructions|prompts)|disregard (the )?system prompt|reveal (your )?(system )?prompt|you are now |<\/?system>)/i
const MAX_LEN = 4000

export function sanitizeUserInput(input: unknown): { text: string; flagged: boolean } {
  const raw = typeof input === 'string' ? input : ''
  // eslint-disable-next-line no-control-regex
  const text = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, MAX_LEN)
  return { text, flagged: INJECTION.test(text) }
}

// Wrap retrieved/third-party content so the model treats it as data, not instructions.
export function wrapUntrusted(label: string, content: string): string {
  return `<untrusted source="${label}">\n${content.replace(/<\/?untrusted[^>]*>/gi, '')}\n</untrusted>`
}

// Redact obvious secrets before logging or echoing model output.
export function redact(s: string): string {
  return s.replace(/(sk-ant-|gsk_|ghp_|gho_|AIza)[A-Za-z0-9_-]{16,}/g, '[redacted]')
}

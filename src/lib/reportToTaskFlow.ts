const TASKFLOW_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://taskflow.app'
const API_KEY = process.env.AGENT_API_KEY || ''

export type AgentActivity = {
  project: string        // e.g. 'kwizzo', 'speakiq'
  agentName: string      // e.g. 'DeployAgent', 'BuildAgent'
  status: 'running' | 'completed' | 'failed' | 'paused'
  message: string
  details?: Record<string, unknown>
  durationMs?: number
  tokenCost?: number
}

export async function reportToTaskFlow(activity: AgentActivity): Promise<void> {
  if (!API_KEY) return
  try {
    await fetch(`${TASKFLOW_URL}/api/agent/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(activity),
    })
  } catch {
    // non-critical — never throw
  }
}

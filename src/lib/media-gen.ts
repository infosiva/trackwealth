// Shared media generation client — image/video/carousel, free-first.
// Any project imports this and calls generateImage(prompt), generateVideo(prompt), generateCarousel(prompts).
// Routes through OpenMontage's image_selector / video_selector, which auto-pick the
// best AVAILABLE provider. Free local providers (local_diffusion, ltx_video_local) only
// unless allowPaidFallback is set — paid APIs (flux, recraft, openai, kling, etc.) never
// fire by default, matching the agents/ portfolio's free-first AI provider policy.
//
// Usage:
//   import { generateImage, generateVideo, generateCarousel } from '@/lib/media-gen'
//   const { path } = await generateImage('a red apple on white background')
//   const { paths } = await generateCarousel(['slide 1 prompt', 'slide 2 prompt', ...])
//
// Requires OPENMONTAGE_PATH env var pointing at the OpenMontage repo
// (defaults to ../OpenMontage relative to cwd) and its .venv set up (make setup + make install-gpu).

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Paths resolved at call-time from env vars so Turbopack never follows symlinks
// across project root during static module graph analysis.
// OPENMONTAGE_PATH — path to OpenMontage repo (set in .env.local)
// OPENMONTAGE_PYTHON — real python3 binary (no symlink). Default: system python3.
// Get the real path: readlink -f <repo>/.venv/bin/python3
function getPaths() {
  const omPath = process.env.OPENMONTAGE_PATH as string
  const python = process.env.OPENMONTAGE_PYTHON || 'python3'
  return { omPath, python }
}

const FREE_IMAGE_PROVIDERS = ['local_diffusion', 'pexels', 'pixabay']
const FREE_VIDEO_PROVIDERS = ['ltx_video_local', 'pexels', 'pixabay']

export type GenerateImageOptions = {
  negativePrompt?: string
  width?: number
  height?: number
  seed?: number
  outputPath?: string
  /** Allow paid providers (flux, recraft, openai) if free ones are unavailable. Default: false. */
  allowPaidFallback?: boolean
}

export type GenerateVideoOptions = {
  durationSeconds?: number
  width?: number
  height?: number
  outputPath?: string
  /** Allow paid providers (kling, runway, veo, etc.) if free ones are unavailable. Default: false. */
  allowPaidFallback?: boolean
}

export type GenerateResult = {
  path: string
  provider: string
  cost: number
  durationSeconds: number
}

export type GenerateCarouselResult = {
  paths: string[]
  results: GenerateResult[]
  totalCost: number
}

/** Generate one image from a text prompt via image_selector (free providers by default). */
export async function generateImage(
  prompt: string,
  opts: GenerateImageOptions = {}
): Promise<GenerateResult> {
  const outputPath = opts.outputPath || `/tmp/image-gen-${Date.now()}.png`

  const inputs: Record<string, unknown> = {
    prompt,
    output_path: outputPath,
    preferred_provider: 'auto',
  }
  if (!opts.allowPaidFallback) inputs.allowed_providers = FREE_IMAGE_PROVIDERS
  if (opts.negativePrompt) inputs.negative_prompt = opts.negativePrompt
  if (opts.width) inputs.width = opts.width
  if (opts.height) inputs.height = opts.height
  if (opts.seed !== undefined) inputs.seed = opts.seed

  const result = await runTool('image_selector', inputs)
  if (!result.success) {
    throw new Error(`Image generation failed: ${result.error}`)
  }
  return {
    path: outputPath,
    provider: String(result.data?.selected_provider ?? result.data?.provider ?? 'unknown'),
    cost: result.cost_usd ?? 0,
    durationSeconds: result.duration_seconds ?? 0,
  }
}

/** Generate a sequence of images for a carousel/slideshow — sequential calls, same routing as generateImage. */
export async function generateCarousel(
  prompts: string[],
  opts: GenerateImageOptions = {}
): Promise<GenerateCarouselResult> {
  const results: GenerateResult[] = []
  for (let i = 0; i < prompts.length; i++) {
    const slideOpts = {
      ...opts,
      outputPath: opts.outputPath
        ? opts.outputPath.replace(/(\.\w+)?$/, `-${i + 1}$1`)
        : `/tmp/carousel-${Date.now()}-${i + 1}.png`,
    }
    results.push(await generateImage(prompts[i], slideOpts))
  }
  return {
    paths: results.map((r) => r.path),
    results,
    totalCost: results.reduce((sum, r) => sum + r.cost, 0),
  }
}

/** Generate a short video from a text prompt via video_selector (free local providers by default). */
export async function generateVideo(
  prompt: string,
  opts: GenerateVideoOptions = {}
): Promise<GenerateResult> {
  const outputPath = opts.outputPath || `/tmp/video-gen-${Date.now()}.mp4`

  const inputs: Record<string, unknown> = {
    prompt,
    output_path: outputPath,
    preferred_provider: 'auto',
  }
  if (!opts.allowPaidFallback) inputs.allowed_providers = FREE_VIDEO_PROVIDERS
  if (opts.durationSeconds) inputs.duration_seconds = opts.durationSeconds
  if (opts.width) inputs.width = opts.width
  if (opts.height) inputs.height = opts.height

  const result = await runTool('video_selector', inputs)
  if (!result.success) {
    throw new Error(
      `Video generation failed: ${result.error}. ` +
        `Local video model may not be downloaded yet — run "make install-gpu" + first-use download in OpenMontage, ` +
        `or pass allowPaidFallback: true to use a paid provider.`
    )
  }
  return {
    path: outputPath,
    provider: String(result.data?.selected_provider ?? result.data?.provider ?? 'unknown'),
    cost: result.cost_usd ?? 0,
    durationSeconds: result.duration_seconds ?? 0,
  }
}

/**
 * Invokes an OpenMontage BaseTool (or selector) by name with the given inputs.
 * Runs in the OpenMontage repo's isolated venv via a small Python bridge.
 */
async function runTool(
  toolName: string,
  inputs: Record<string, unknown>
): Promise<{
  success: boolean
  error?: string
  duration_seconds?: number
  cost_usd?: number
  data?: Record<string, unknown>
}> {
  const { omPath, python } = getPaths()

  if (!omPath) {
    throw new Error('OPENMONTAGE_PATH env var not set. Add to .env.local: OPENMONTAGE_PATH=/path/to/OpenMontage')
  }

  const script = `
import sys, json
sys.path.insert(0, ${JSON.stringify('__OM_PATH__')})
from tools.tool_registry import registry
registry.discover()
tool = registry.get(${JSON.stringify(toolName)})
result = tool.execute(json.loads(sys.argv[1]))
print(json.dumps({
    "success": result.success,
    "error": result.error,
    "duration_seconds": result.duration_seconds,
    "cost_usd": result.cost_usd,
    "data": result.data,
}))
`.replace('__OM_PATH__', omPath)

  const { stdout } = await execFileAsync(
    python,
    ['-c', script, JSON.stringify(inputs)],
    { cwd: omPath, maxBuffer: 1024 * 1024 * 10 }
  )

  const lastLine = stdout.trim().split('\n').pop() || '{}'
  return JSON.parse(lastLine)
}

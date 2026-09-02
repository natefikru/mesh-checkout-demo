export const SANDBOX_BASE_URL = 'https://sandbox-integration-api.meshconnect.com'

type EnvSource = Record<string, string | undefined>

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in, ` +
        `or set it in the Vercel project settings.`,
    )
    this.name = 'MissingEnvError'
  }
}

export function requireEnv(name: string, source: EnvSource = process.env): string {
  const value = source[name]
  if (value === undefined || value.trim() === '') throw new MissingEnvError(name)
  return value
}

export interface MeshConfig {
  clientId: string
  apiKey: string
  baseUrl: string
}

/**
 * Read at call time rather than module scope so a missing variable surfaces as a
 * handled request error instead of breaking `next build`.
 */
export function meshConfig(source: EnvSource = process.env): MeshConfig {
  const baseUrl = source.MESH_BASE_URL?.trim() || SANDBOX_BASE_URL
  return {
    clientId: requireEnv('MESH_CLIENT_ID', source),
    apiKey: requireEnv('MESH_API_KEY', source),
    baseUrl: baseUrl.replace(/\/+$/, ''),
  }
}

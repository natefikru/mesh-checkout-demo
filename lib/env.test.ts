import { describe, expect, it } from 'vitest'
import { MissingEnvError, SANDBOX_BASE_URL, meshConfig, requireEnv } from './env'

describe('requireEnv', () => {
  it('returns the value when set', () => {
    expect(requireEnv('A', { A: 'x' })).toBe('x')
  })

  it('throws MissingEnvError when absent', () => {
    expect(() => requireEnv('A', {})).toThrow(MissingEnvError)
  })

  it('treats whitespace-only as absent', () => {
    expect(() => requireEnv('A', { A: '   ' })).toThrow(MissingEnvError)
  })

  it('names the variable in the message so the fix is obvious', () => {
    expect(() => requireEnv('MESH_API_KEY', {})).toThrow(/MESH_API_KEY/)
  })
})

describe('meshConfig', () => {
  const creds = { MESH_CLIENT_ID: 'id', MESH_API_KEY: 'key' }

  it('defaults to the sandbox base URL', () => {
    expect(meshConfig(creds).baseUrl).toBe(SANDBOX_BASE_URL)
  })

  it('honours an explicit base URL', () => {
    const cfg = meshConfig({ ...creds, MESH_BASE_URL: 'https://integration-api.meshconnect.com' })
    expect(cfg.baseUrl).toBe('https://integration-api.meshconnect.com')
  })

  it('strips trailing slashes so path joining stays predictable', () => {
    expect(meshConfig({ ...creds, MESH_BASE_URL: 'https://example.com///' }).baseUrl).toBe('https://example.com')
  })

  it('falls back to sandbox when MESH_BASE_URL is blank', () => {
    expect(meshConfig({ ...creds, MESH_BASE_URL: '  ' }).baseUrl).toBe(SANDBOX_BASE_URL)
  })

  it('requires credentials', () => {
    expect(() => meshConfig({ MESH_CLIENT_ID: 'id' })).toThrow(MissingEnvError)
    expect(() => meshConfig({ MESH_API_KEY: 'key' })).toThrow(MissingEnvError)
  })
})

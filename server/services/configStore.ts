/**
 * File-based store for multiple named chaos proxy configurations
 * Configurations are persisted to a JSON file and loaded on startup
 */

import * as fs from 'fs'
import * as path from 'path'

const CONFIG_FILE = path.join(process.cwd(), 'chaos-configs.json')

export interface ChaosProxyConfig {
  name: string
  instanceUrl: string
  sourceUrl: string
  protocol: 'hls' | 'dash'
  streamType?: 'live' | 'vod'
  description?: string
  delays: Array<{
    i?: number | '*'
    sq?: number
    rsq?: number
    br?: number
    l?: number
    ms?: number
  }>
  statusCodes: Array<{
    i?: number | '*'
    sq?: number
    rsq?: number
    br?: number
    code?: number
  }>
  timeouts: Array<{
    i?: number | '*'
    sq?: number
    rsq?: number
    br?: number
  }>
  throttles: Array<{
    i?: number | '*'
    sq?: number
    rsq?: number
    br?: number
    rate?: number
  }>
}

class ConfigStore {
  private configs: Map<string, ChaosProxyConfig> = new Map()
  private baseUrl: string = ''

  constructor() {
    this.loadFromFile()
    this.initializeBaseUrl()
  }

  /**
   * Initialize base URL from environment variables
   */
  private initializeBaseUrl(): void {
    const hostname = process.env.PUBLIC_HOSTNAME || 'localhost'
    const port = process.env.PUBLIC_PORT || process.env.PORT || '3001'
    const protocol = process.env.PUBLIC_PROTOCOL || 'http'

    // Build the base URL
    let url = `${protocol}://${hostname}`
    if ((protocol === 'http' && port !== '80' && port !== 80) ||
        (protocol === 'https' && port !== '443' && port !== 443)) {
      url += `:${port}`
    }

    this.baseUrl = url
    console.log(`Base URL for redirects: ${this.baseUrl}`)
  }

  /**
   * Generate a composite key from name and protocol
   * This allows same name for different protocols
   */
  private getKey(name: string, protocol: 'hls' | 'dash'): string {
    return `${name}:${protocol}`
  }

  /**
   * Load configurations from JSON file
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
        const configs: ChaosProxyConfig[] = JSON.parse(data)

        configs.forEach(config => {
          const key = this.getKey(config.name, config.protocol)
          this.configs.set(key, config)
        })

        console.log(`Loaded ${configs.length} configuration(s) from ${CONFIG_FILE}`)
      } else {
        console.log('No existing configuration file found, starting with empty store')
      }
    } catch (error) {
      console.error('Error loading configurations from file:', error)
      console.log('Starting with empty configuration store')
    }
  }

  /**
   * Save all configurations to JSON file
   * Sorts by newest first (most recently saved at the top)
   */
  private saveToFile(): void {
    try {
      const configs = Array.from(this.configs.values())
      // Reverse to show newest first
      const sortedConfigs = configs.reverse()
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(sortedConfigs, null, 2), 'utf-8')
      console.log(`Saved ${configs.length} configuration(s) to ${CONFIG_FILE}`)
    } catch (error) {
      console.error('Error saving configurations to file:', error)
    }
  }

  saveConfig(config: ChaosProxyConfig): void {
    const key = this.getKey(config.name, config.protocol)

    // If updating existing config, remove it first so it gets added at the end
    // (which becomes the top after reverse in saveToFile)
    if (this.configs.has(key)) {
      this.configs.delete(key)
    }

    this.configs.set(key, config)
    console.log(`Configuration '${config.name}' (${config.protocol}) saved`)
    this.saveToFile()
  }

  getConfig(name: string, protocol: 'hls' | 'dash'): ChaosProxyConfig | null {
    const key = this.getKey(name, protocol)
    return this.configs.get(key) || null
  }

  listConfigs(): ChaosProxyConfig[] {
    // Return configs in reverse order (newest first)
    return Array.from(this.configs.values()).reverse()
  }

  deleteConfig(name: string, protocol: 'hls' | 'dash'): boolean {
    const key = this.getKey(name, protocol)
    const deleted = this.configs.delete(key)
    if (deleted) {
      console.log(`Configuration '${name}' (${protocol}) deleted`)
      this.saveToFile()
    }
    return deleted
  }

  hasConfig(name: string, protocol: 'hls' | 'dash'): boolean {
    const key = this.getKey(name, protocol)
    return this.configs.has(key)
  }

  // Helper to convert object to JSON-like string without quotes on property names
  private toUnquotedJson(obj: any): string {
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.toUnquotedJson(item)).join(',') + ']'
    }
    if (typeof obj === 'object' && obj !== null) {
      const entries = Object.entries(obj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          if (typeof value === 'number') {
            return `${key}:${value}`
          }
          if (typeof value === 'string') {
            // Handle wildcard '*' without quotes
            if (value === '*') {
              return `${key}:*`
            }
            return `${key}:"${value}"`
          }
          if (typeof value === 'boolean') {
            return `${key}:${value}`
          }
          return `${key}:${this.toUnquotedJson(value)}`
        })
      return '{' + entries.join(',') + '}'
    }
    return JSON.stringify(obj)
  }

  generateProxyUrl(name: string, protocol: 'hls' | 'dash'): string | null {
    const config = this.getConfig(name, protocol)

    if (!config || !config.sourceUrl) {
      return null
    }

    const endpoint = config.protocol === 'hls'
      ? '/api/v2/manifests/hls/proxy-master.m3u8'
      : '/api/v2/manifests/dash/proxy-master.mpd'

    const queryParts: string[] = []

    // Add source URL without encoding
    queryParts.push(`url=${config.sourceUrl}`)

    // Add delay corruptions
    if (config.delays.length > 0) {
      const delays = config.delays.map(d => {
        const obj: any = {}
        if (d.i !== undefined) obj.i = d.i
        if (d.sq !== undefined) obj.sq = d.sq
        if (d.rsq !== undefined) obj.rsq = d.rsq
        if (d.br !== undefined) obj.br = d.br
        if (d.l !== undefined) obj.l = d.l
        if (d.ms !== undefined) obj.ms = d.ms
        return obj
      })
      queryParts.push(`delay=${this.toUnquotedJson(delays)}`)
    }

    // Add status code corruptions
    if (config.statusCodes.length > 0) {
      const statusCodes = config.statusCodes.map(s => {
        const obj: any = {}
        if (s.i !== undefined) obj.i = s.i
        if (s.sq !== undefined) obj.sq = s.sq
        if (s.rsq !== undefined) obj.rsq = s.rsq
        if (s.br !== undefined) obj.br = s.br
        if (s.code !== undefined) obj.code = s.code
        return obj
      })
      queryParts.push(`statusCode=${this.toUnquotedJson(statusCodes)}`)
    }

    // Add timeout corruptions
    if (config.timeouts.length > 0) {
      const timeouts = config.timeouts.map(t => {
        const obj: any = {}
        if (t.i !== undefined) obj.i = t.i
        if (t.sq !== undefined) obj.sq = t.sq
        if (t.rsq !== undefined) obj.rsq = t.rsq
        if (t.br !== undefined) obj.br = t.br
        return obj
      })
      queryParts.push(`timeout=${this.toUnquotedJson(timeouts)}`)
    }

    // Add throttle corruptions
    if (config.throttles.length > 0) {
      const throttles = config.throttles.map(t => {
        const obj: any = {}
        if (t.i !== undefined) obj.i = t.i
        if (t.sq !== undefined) obj.sq = t.sq
        if (t.rsq !== undefined) obj.rsq = t.rsq
        if (t.br !== undefined) obj.br = t.br
        if (t.rate !== undefined) obj.rate = t.rate
        return obj
      })
      queryParts.push(`throttle=${this.toUnquotedJson(throttles)}`)
    }

    return `${config.instanceUrl}${endpoint}?${queryParts.join('&')}`
  }

  /**
   * Generate redirect URL for a configuration
   */
  generateRedirectUrl(name: string, protocol: 'hls' | 'dash'): string {
    const extension = protocol === 'hls' ? 'm3u8' : 'mpd'
    return `${this.baseUrl}/redirect/${name}.${extension}`
  }
}

export default new ConfigStore()

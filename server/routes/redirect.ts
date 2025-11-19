import { Router, Request, Response } from 'express'
import configStore from '../services/configStore'

const router = Router()

/**
 * POST /api/config
 * Save a named chaos proxy configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, instanceUrl, sourceUrl, protocol, streamType, description, delays, statusCodes, timeouts, throttles } = req.body

    if (!name || !instanceUrl || !sourceUrl || !protocol) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'name, instanceUrl, sourceUrl, and protocol are required'
      })
    }

    // Validate name format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Configuration name must contain only letters, numbers, hyphens, and underscores'
      })
    }

    configStore.saveConfig({
      name,
      instanceUrl,
      sourceUrl,
      protocol,
      streamType: streamType || 'live',
      description,
      delays: delays || [],
      statusCodes: statusCodes || [],
      timeouts: timeouts || [],
      throttles: throttles || []
    })

    res.json({ success: true, message: `Configuration '${name}' (${protocol}) saved` })
  } catch (error) {
    console.error('Error saving configuration:', error)
    res.status(500).json({
      error: 'Failed to save configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/config
 * List all configurations with generated URLs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const configs = configStore.listConfigs()

    // Add generated URLs to each config
    const configsWithUrls = configs.map(config => ({
      ...config,
      proxyUrl: configStore.generateProxyUrl(config.name, config.protocol),
      redirectUrl: configStore.generateRedirectUrl(config.name, config.protocol)
    }))

    res.json({ configs: configsWithUrls })
  } catch (error) {
    console.error('Error listing configurations:', error)
    res.status(500).json({
      error: 'Failed to list configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/config/:name/:protocol
 * Get a specific configuration by name and protocol with generated URLs
 */
router.get('/:name/:protocol', async (req: Request, res: Response) => {
  try {
    const { name, protocol } = req.params

    if (protocol !== 'hls' && protocol !== 'dash') {
      return res.status(400).json({
        error: 'Invalid protocol',
        message: 'Protocol must be either "hls" or "dash"'
      })
    }

    const config = configStore.getConfig(name, protocol as 'hls' | 'dash')

    if (!config) {
      return res.status(404).json({
        error: 'Not found',
        message: `Configuration '${name}' (${protocol}) not found`
      })
    }

    // Add generated URLs
    const configWithUrls = {
      ...config,
      proxyUrl: configStore.generateProxyUrl(config.name, config.protocol),
      redirectUrl: configStore.generateRedirectUrl(config.name, config.protocol)
    }

    res.json({ config: configWithUrls })
  } catch (error) {
    console.error('Error getting configuration:', error)
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * DELETE /api/config/:name/:protocol
 * Delete a specific configuration
 */
router.delete('/:name/:protocol', async (req: Request, res: Response) => {
  try {
    const { name, protocol } = req.params

    if (protocol !== 'hls' && protocol !== 'dash') {
      return res.status(400).json({
        error: 'Invalid protocol',
        message: 'Protocol must be either "hls" or "dash"'
      })
    }

    const deleted = configStore.deleteConfig(name, protocol as 'hls' | 'dash')

    if (!deleted) {
      return res.status(404).json({
        error: 'Not found',
        message: `Configuration '${name}' (${protocol}) not found`
      })
    }

    res.json({ success: true, message: `Configuration '${name}' (${protocol}) deleted` })
  } catch (error) {
    console.error('Error deleting configuration:', error)
    res.status(500).json({
      error: 'Failed to delete configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /redirect/:filename
 * Dynamic redirect to chaos proxy URL based on filename
 * Supports: /redirect/name.m3u8 (HLS) and /redirect/name.mpd (DASH)
 * The protocol is determined by the file extension
 */
router.get('/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params

    // Parse filename to extract name and protocol from extension
    let name: string
    let protocol: 'hls' | 'dash'

    if (filename.endsWith('.m3u8')) {
      name = filename.slice(0, -5) // Remove '.m3u8'
      protocol = 'hls'
    } else if (filename.endsWith('.mpd')) {
      name = filename.slice(0, -4) // Remove '.mpd'
      protocol = 'dash'
    } else {
      return res.status(400).send('Invalid filename. Use .m3u8 for HLS or .mpd for DASH')
    }

    // Look up configuration using name + protocol
    const config = configStore.getConfig(name, protocol)

    if (!config) {
      return res.status(404).send(
        `Configuration '${name}' for ${protocol.toUpperCase()} not found. ` +
        `Please create a configuration with this name and protocol first.`
      )
    }

    const proxyUrl = configStore.generateProxyUrl(name, protocol)

    if (!proxyUrl) {
      return res.status(500).send('Failed to generate proxy URL')
    }

    console.log(`Redirecting '${filename}' (${protocol}) to:`, proxyUrl)
    res.redirect(302, proxyUrl)
  } catch (error) {
    console.error('Error redirecting:', error)
    res.status(500).send('Internal server error')
  }
})

export default router

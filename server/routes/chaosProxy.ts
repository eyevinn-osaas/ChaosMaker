import { Router, Request, Response } from 'express'
import oscClient from '../services/oscClient'

const router = Router()

/**
 * POST /api/chaos-proxy/validate
 * Validate a chaos stream proxy URL by checking if it responds with 2xx
 *
 * Body: { url: string }
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { url } = req.body

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required and must be a string'
      })
    }

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'The provided URL is not valid'
      })
    }

    // Make a request to the proxy URL to check if it's responding
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(validUrl.toString(), {
        method: 'GET',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.status >= 200 && response.status < 300) {
        res.json({
          valid: true,
          message: 'Proxy is responding correctly',
          statusCode: response.status
        })
      } else {
        res.json({
          valid: false,
          message: `Proxy responded with status ${response.status}`,
          statusCode: response.status
        })
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        res.json({
          valid: false,
          message: 'Request timed out after 10 seconds'
        })
      } else {
        res.json({
          valid: false,
          message: fetchError instanceof Error ? fetchError.message : 'Failed to connect to proxy'
        })
      }
    }
  } catch (error) {
    console.error('Error validating proxy:', error)
    res.status(500).json({
      error: 'Failed to validate proxy',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/chaos-proxy/instances
 * List all chaos stream proxy instances
 */
router.get('/instances', async (req: Request, res: Response) => {
  try {
    const instances = await oscClient.listInstances()
    res.json({ instances })
  } catch (error) {
    console.error('Error listing instances:', error)
    res.status(500).json({
      error: 'Failed to list instances',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/chaos-proxy/instances
 * Create a new chaos stream proxy instance
 *
 * Body: { name: string, statefulMode: boolean }
 */
router.post('/instances', async (req: Request, res: Response) => {
  try {
    const { name, statefulMode } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Instance name is required and must be a string'
      })
    }

    if (typeof statefulMode !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'statefulMode must be a boolean'
      })
    }

    const instance = await oscClient.createInstance(name, statefulMode)
    res.status(201).json({ instance })
  } catch (error) {
    console.error('Error creating instance:', error)
    res.status(500).json({
      error: 'Failed to create instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * DELETE /api/chaos-proxy/instances/:name
 * Delete a chaos stream proxy instance
 */
router.delete('/instances/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params

    if (!name) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Instance name is required'
      })
    }

    await oscClient.deleteInstance(name)
    res.json({ success: true, message: `Instance ${name} deleted successfully` })
  } catch (error) {
    console.error('Error deleting instance:', error)
    res.status(500).json({
      error: 'Failed to delete instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/chaos-proxy/instances/:name
 * Get details about a specific instance
 */
router.get('/instances/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params

    if (!name) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Instance name is required'
      })
    }

    const instance = await oscClient.describeInstance(name)

    if (!instance) {
      return res.status(404).json({
        error: 'Not found',
        message: `Instance ${name} not found`
      })
    }

    res.json({ instance })
  } catch (error) {
    console.error('Error describing instance:', error)
    res.status(500).json({
      error: 'Failed to get instance details',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router

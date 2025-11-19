import { Router, Request, Response } from 'express'
import oscClient from '../services/oscClient'

const router = Router()

/**
 * POST /api/auth/token
 * Set the OSC access token
 *
 * Body: { token: string }
 */
router.post('/token', (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Token is required and must be a string'
      })
    }

    oscClient.setAccessToken(token)

    res.json({
      success: true,
      message: 'Token set successfully'
    })
  } catch (error) {
    console.error('Error setting token:', error)
    res.status(500).json({
      error: 'Failed to set token',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/auth/token/status
 * Check if token is configured
 */
router.get('/token/status', (req: Request, res: Response) => {
  const hasToken = oscClient.getAccessToken() !== null

  res.json({
    configured: hasToken
  })
})

/**
 * DELETE /api/auth/token
 * Clear the OSC access token
 */
router.delete('/token', (req: Request, res: Response) => {
  try {
    oscClient.setAccessToken('')

    res.json({
      success: true,
      message: 'Token cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing token:', error)
    res.status(500).json({
      error: 'Failed to clear token',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router

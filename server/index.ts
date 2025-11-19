import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import chaosProxyRoutes from './routes/chaosProxy'
import authRoutes from './routes/auth'
import redirectRoutes from './routes/redirect'

dotenv.config()

const app = express()
const PORT = process.env.BACKEND_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/chaos-proxy', chaosProxyRoutes)
app.use('/api/config', redirectRoutes)
app.use('/redirect', redirectRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})

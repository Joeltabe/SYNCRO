const express = require('express')
const dotenv = require('dotenv')
const gmailRoutes = require('./routes/integrations/gmail')
const outlookRoutes = require('./routes/integrations/outlook')
const classificationRoutes = require('./routes/integrations/classification-routes')

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/integrations/gmail', gmailRoutes)
app.use('/api/integrations/outlook', outlookRoutes)
app.use('/api/subscriptions', classificationRoutes)

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  res.status(status).json({
    error: err.message || 'Unexpected server error',
  })
})

app.listen(port, () => {
  console.log(`Synchro backend listening on ${port}`)
})

// cPanel CloudLinux Passenger Entry Point for Next.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('Internal server error')
      }
    })
      .once('error', (err) => {
        console.error('Server error:', err)
        process.exit(1)
      })
      .listen(port, () => {
        console.log(`> TUSU Workspace production server running on port ${port}`)
      })
  })
  .catch((err) => {
    console.error('Next.js preparation failed:', err)
    process.exit(1)
  })

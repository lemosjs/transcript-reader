const express = require('express')
const path = require('path')
const fs = require('fs')

// Set up Express app
const app = express()

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir)
}

// Serve static files from the public directory
app.use(express.static('public'))

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
  console.log(`Open http://localhost:${PORT}/ in your browser`)
})


const express = require('express');
const os = require('os');
const cors = require('cors');
const authRoute = require('./routes/auths');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Enable CORS and parse JSON
app.use(cors());
app.use(express.json());

// Use auth routes
app.use('/auth', authRoute);

// Function to get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`Server is running on http://${localIP}:${PORT}`);
});

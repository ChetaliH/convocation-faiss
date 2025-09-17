// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Face search endpoint
app.post('/api/search-face', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Create form data to send to Flask API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    // Send to Flask API
    const flaskResponse = await axios.post('http://localhost:5000/search', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(flaskResponse.data);
  } catch (error) {
    console.error('Error searching faces:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to search faces',
      details: error.response?.data || error.message 
    });
  }
});

// Proxy endpoint to download images from Flask API
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const flaskResponse = await axios.get(`http://localhost:5000/download/${filename}`, {
      responseType: 'stream'
    });

    res.setHeader('Content-Type', flaskResponse.headers['content-type']);
    flaskResponse.data.pipe(res);
  } catch (error) {
    console.error('Error downloading image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
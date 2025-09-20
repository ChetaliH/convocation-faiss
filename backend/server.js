// // 

// // server.js
// const express = require('express');
// const multer = require('multer');
// const cors = require('cors');
// const axios = require('axios');
// const FormData = require('form-data');
// const fs = require('fs');
// const path = require('path');
// const admin = require('firebase-admin');

// // Initialize Firebase Admin SDK
// // Download your service account key from Firebase Console
// const serviceAccount = require('./firebase-service-account-key.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   // Add other Firebase config if needed
// });

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Firebase Authentication Middleware
// const authenticateToken = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

//     if (!token) {
//       return res.status(401).json({ 
//         error: 'Access token required',
//         message: 'Please provide a valid authentication token'
//       });
//     }

//     // Verify the Firebase ID token
//     const decodedToken = await admin.auth().verifyIdToken(token);
    
//     // Add user info to request object
//     req.user = {
//       uid: decodedToken.uid,
//       email: decodedToken.email,
//       emailVerified: decodedToken.email_verified
//     };

//     console.log(`Authenticated request from user: ${req.user.email}`);
//     next();
//   } catch (error) {
//     console.error('Authentication error:', error.message);
    
//     if (error.code === 'auth/id-token-expired') {
//       return res.status(401).json({ 
//         error: 'Token expired',
//         message: 'Please refresh your authentication token'
//       });
//     }
    
//     return res.status(401).json({ 
//       error: 'Invalid token',
//       message: 'Authentication failed'
//     });
//   }
// };

// // Rate limiting per user (optional but recommended)
// const userRequestCounts = new Map();
// const RATE_LIMIT_WINDOW = 60000; // 1 minute
// const MAX_REQUESTS_PER_MINUTE = 10;

// const rateLimitMiddleware = (req, res, next) => {
//   const userId = req.user.uid;
//   const now = Date.now();
  
//   if (!userRequestCounts.has(userId)) {
//     userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
//     return next();
//   }
  
//   const userLimit = userRequestCounts.get(userId);
  
//   if (now > userLimit.resetTime) {
//     // Reset the counter
//     userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
//     return next();
//   }
  
//   if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) {
//     return res.status(429).json({
//       error: 'Rate limit exceeded',
//       message: `Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute allowed`
//     });
//   }
  
//   userLimit.count++;
//   next();
// };

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Create user-specific upload directory
//     const userId = req.user ? req.user.uid : 'anonymous';
//     const uploadDir = `uploads/${userId}/`;
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   }
// });

// const upload = multer({ 
//   storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Only allow image files
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'));
//     }
//   }
// });

// // Routes

// // Public health check (no authentication required)
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     message: 'Server is running',
//     timestamp: new Date().toISOString(),
//     authenticated: false
//   });
// });

// // Protected health check (requires authentication)
// app.get('/api/protected-health', authenticateToken, (req, res) => {
//   res.json({ 
//     message: 'Protected endpoint is working',
//     user: req.user,
//     timestamp: new Date().toISOString(),
//     authenticated: true
//   });
// });

// // Protected face search endpoint
// app.post('/api/search-face', authenticateToken, rateLimitMiddleware, upload.single('image'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No image file provided' });
//     }

//     console.log(`Processing file: ${req.file.filename} for user: ${req.user.email}`);

//     // Create form data to send to Flask API
//     const formData = new FormData();
//     formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

//     // Send to Flask API
//     const SERVER_API_BASE_URL = process.env.SERVER_API_BASE_URL;
//     const flaskResponse = await axios.post(`${SERVER_API_BASE_URL}/search`, formData, {
//       headers: {
//         ...formData.getHeaders(),
//       },
//       timeout: 30000, // 30 second timeout
//     });

//     console.log(`Flask response for user ${req.user.email}:`, flaskResponse.data);

//     // Clean up uploaded file
//     fs.unlinkSync(req.file.path);

//     // Log the search for audit purposes
//     console.log(`Face search completed for user: ${req.user.email} at ${new Date().toISOString()}`);

//     res.json(flaskResponse.data);
//   } catch (error) {
//     console.error(`Error searching faces for user ${req.user?.email}:`, error.message);
        
//     // Clean up uploaded file in case of error
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }

//     res.status(500).json({
//       error: 'Failed to search faces',
//       details: error.response?.data || error.message
//     });
//   }
// });

// // Protected proxy endpoint to download images from Flask API
// app.get('/api/download/:filename', authenticateToken, async (req, res) => {
//   try {
//     const { filename } = req.params;
//     console.log(`User ${req.user.email} downloading image: ${filename}`);
//     const SERVER_API_BASE_URL = process.env.SERVER_API_BASE_URL;
//     const flaskResponse = await axios.get(`${SERVER_API_BASE_URL}/download/${filename}`, {
//       responseType: 'stream',
//       timeout: 10000, // 10 second timeout
//     });

//     // Set proper headers
//     res.setHeader('Content-Type', flaskResponse.headers['content-type'] || 'image/jpeg');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//     res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
//     // Log the download for audit purposes
//     console.log(`Image download completed for user: ${req.user.email}, file: ${filename} at ${new Date().toISOString()}`);

//     // Pipe the response
//     flaskResponse.data.pipe(res);

//   } catch (error) {
//     console.error(`Error downloading image for user ${req.user?.email}:`, error.message);
        
//     if (error.response?.status === 404) {
//       res.status(404).json({ error: 'Image not found' });
//     } else {
//       res.status(500).json({ 
//         error: 'Failed to download image',
//         details: error.message 
//       });
//     }
//   }
// });

// // Protected test endpoint to check Flask connectivity
// app.get('/api/test-flask', authenticateToken, async (req, res) => {
//   try {
//     const SERVER_API_BASE_URL = process.env.SERVER_API_BASE_URL;
//     const flaskResponse = await axios.get(`${SERVER_API_BASE_URL}/health`);
//     res.json({ 
//       status: 'Flask API is reachable',
//       flaskData: flaskResponse.data,
//       requestedBy: req.user.email
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       status: 'Flask API is not reachable',
//       error: error.message,
//       requestedBy: req.user.email
//     });
//   }
// });

// // Admin endpoint to get user activity (example of role-based access)
// app.get('/api/admin/user-activity', authenticateToken, async (req, res) => {
//   try {
//     // Check if user has admin role (you can implement custom claims in Firebase)
//     const userRecord = await admin.auth().getUser(req.user.uid);
//     const customClaims = userRecord.customClaims || {};
    
//     if (!customClaims.admin) {
//       return res.status(403).json({ 
//         error: 'Insufficient permissions',
//         message: 'Admin access required'
//       });
//     }

//     // Return some basic activity data (implement as needed)
//     res.json({
//       message: 'Admin endpoint accessed successfully',
//       requestCounts: Array.from(userRequestCounts.entries()),
//       adminUser: req.user.email
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       error: 'Failed to fetch admin data',
//       details: error.message 
//     });
//   }
// });

// // Error handling middleware
// app.use((error, req, res, next) => {
//   console.error('Unhandled error:', error);
  
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
//     }
//   }
  
//   res.status(500).json({ 
//     error: 'Internal server error',
//     message: 'Something went wrong'
//   });
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   server.close(() => {
//     console.log('HTTP server closed');
//   });
// });

// const server = app.listen(PORT, () => {
//   console.log(`🚀 Protected server running on port ${PORT}`);
//   console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
//   console.log(`🔒 Protected health check: http://localhost:${PORT}/api/protected-health`);
//   console.log(`🧪 Flask connectivity test: http://localhost:${PORT}/api/test-flask`);
//   console.log(`⚠️  All face search endpoints are now protected with Firebase authentication`);
//   console.log(`📝 Make sure to:`);
//   console.log(`   1. Place your firebase-service-account-key.json in the root directory`);
//   console.log(`   2. Install firebase-admin: npm install firebase-admin`);
//   console.log(`   3. Configure Firebase in your React app`);
// });

// module.exports = app;

// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3001;

// Flask API Configuration
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';
console.log(`Flask API URL: ${FLASK_API_URL}`);

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    console.log(`Authenticated request from user: ${req.user.email}`);
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please refresh your authentication token'
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

// Rate limiting per user
const userRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

const rateLimitMiddleware = (req, res, next) => {
  const userId = req.user.uid;
  const now = Date.now();
  
  if (!userRequestCounts.has(userId)) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const userLimit = userRequestCounts.get(userId);
  
  if (now > userLimit.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute allowed`
    });
  }
  
  userLimit.count++;
  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user ? req.user.uid : 'anonymous';
    const uploadDir = `uploads/${userId}/`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Routes

// Public health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    authenticated: false,
    flask_url: FLASK_API_URL
  });
});

// Protected health check
app.get('/api/protected-health', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Protected endpoint is working',
    user: req.user,
    timestamp: new Date().toISOString(),
    authenticated: true
  });
});

// Protected face search endpoint with better error handling
app.post('/api/search-face', authenticateToken, rateLimitMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log(`Processing file: ${req.file.filename} for user: ${req.user.email}`);

    // Create form data to send to Flask API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    // Add similarity threshold if provided
    const threshold = req.body.threshold || 50;
    formData.append('threshold', threshold);

    console.log(`Sending request to Flask API: ${FLASK_API_URL}/search`);

    // Send to Flask API
    const flaskResponse = await axios.post(`${FLASK_API_URL}/search`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000, // 30 second timeout
    });

    console.log(`Flask response for user ${req.user.email}:`, JSON.stringify(flaskResponse.data, null, 2));

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Extract results from new Flask response format
    let results = [];
    if (flaskResponse.data.results && Array.isArray(flaskResponse.data.results)) {
      results = flaskResponse.data.results;
    } else if (Array.isArray(flaskResponse.data)) {
      // Fallback for old format
      results = flaskResponse.data;
    }

    console.log(`Returning ${results.length} results to frontend`);

    // Log the search for audit purposes
    console.log(`Face search completed for user: ${req.user.email} at ${new Date().toISOString()}`);

    // Return results in format expected by frontend
    res.json(results);

  } catch (error) {
    console.error(`Error searching faces for user ${req.user?.email}:`, error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`Cannot connect to Flask API at ${FLASK_API_URL}`);
      return res.status(503).json({
        error: 'Face recognition service unavailable',
        details: 'Please ensure the Flask API is running'
      });
    }
        
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

// Protected proxy endpoint to download images from Flask API
app.get('/api/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`User ${req.user.email} downloading image: ${filename}`);

    const flaskResponse = await axios.get(`${FLASK_API_URL}/download/${filename}`, {
      responseType: 'stream',
      timeout: 10000, // 10 second timeout
    });

    // Set proper headers
    res.setHeader('Content-Type', flaskResponse.headers['content-type'] || 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
        
    console.log(`Image download completed for user: ${req.user.email}, file: ${filename}`);

    // Pipe the response
    flaskResponse.data.pipe(res);

  } catch (error) {
    console.error(`Error downloading image for user ${req.user?.email}:`, error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Image not found' });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Image service unavailable',
        details: 'Please ensure the Flask API is running' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to download image',
        details: error.message 
      });
    }
  }
});

// Protected test endpoint to check Flask connectivity
app.get('/api/test-flask', authenticateToken, async (req, res) => {
  try {
    console.log(`Testing Flask connectivity at: ${FLASK_API_URL}/health`);
    const flaskResponse = await axios.get(`${FLASK_API_URL}/health`, { timeout: 5000 });
    
    res.json({ 
      status: 'Flask API is reachable',
      url: `${FLASK_API_URL}/health`,
      flaskData: flaskResponse.data,
      requestedBy: req.user.email
    });
  } catch (error) {
    console.error('Flask connectivity test failed:', error.message);
    res.status(500).json({ 
      status: 'Flask API is not reachable',
      url: `${FLASK_API_URL}/health`,
      error: error.message,
      requestedBy: req.user.email
    });
  }
});

// Debug endpoint to check Flask dataset
app.get('/api/debug/flask-dataset', authenticateToken, async (req, res) => {
  try {
    const flaskResponse = await axios.get(`${FLASK_API_URL}/debug/dataset`, { timeout: 10000 });
    res.json(flaskResponse.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch Flask dataset info',
      details: error.message 
    });
  }
});

// Admin endpoint for user activity
app.get('/api/admin/user-activity', authenticateToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    const customClaims = userRecord.customClaims || {};
    
    if (!customClaims.admin) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Admin access required'
      });
    }

    res.json({
      message: 'Admin endpoint accessed successfully',
      requestCounts: Array.from(userRequestCounts.entries()),
      adminUser: req.user.email
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch admin data',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Protected server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Protected health check: http://localhost:${PORT}/api/protected-health`);
  console.log(`🧪 Flask connectivity test: http://localhost:${PORT}/api/test-flask`);
  console.log(`🐍 Flask API URL: ${FLASK_API_URL}`);
  console.log(`📁 Flask dataset debug: http://localhost:${PORT}/api/debug/flask-dataset`);
  console.log(`⚠️  All face search endpoints are protected with Firebase authentication`);
});

module.exports = app;
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Search, Download, X, AlertCircle, Loader, LogOut, User, CheckCircle, Eye, Check } from 'lucide-react';
import { auth } from './firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

// Define API_BASE_URL at the top level - outside of any component
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// Allowed domains for registration
const ALLOWED_DOMAINS = [
  'ksrm.ac.in',
  'kiit.ac.in',
  'ksom.ac.in',
  'kims.ac.in',
  'kids.ac.in',
  'kins.ac.in'
];

// Function to validate email domain
const isValidDomain = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

// Component for displaying authenticated images
const AuthenticatedImage = ({ filename, alt, className, isSelected, onSelect }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError(true);
          setLoading(false);
          return;
        }
        
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/download/${filename}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [filename]);

  if (loading) {
    return (
      <div className={`${className} bg-green-50 flex items-center justify-center border border-green-100`}>
        <Loader className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} bg-green-50 flex items-center justify-center border border-green-100`}>
        <span className="text-green-600 text-sm">Image not available</span>
      </div>
    );
  }

  return (
    <div className="relative group">
      <img src={imageSrc} alt={alt} className={`${className} transition-all duration-200`} />
      {/* Selection overlay */}
      <div 
        className={`absolute inset-0 transition-all duration-300 cursor-pointer ${
          isSelected 
            ? 'bg-gradient-to-br from-green-500/30 to-green-600/40 ring-3 ring-green-500 ring-offset-2' 
            : 'hover:bg-green-500/10 group-hover:ring-2 group-hover:ring-green-300'
        } rounded-lg`}
        onClick={onSelect}
      >
        {/* Selection checkbox */}
        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full transition-all duration-300 shadow-lg ${
          isSelected 
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white scale-110 shadow-green-500/50' 
            : 'bg-white/95 backdrop-blur-sm text-green-600 border-2 border-green-200 hover:border-green-400 hover:scale-105'
        } flex items-center justify-center`}>
          {isSelected ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <div className="w-3 h-3 border-2 border-green-400 rounded-full group-hover:border-green-500 transition-colors"></div>
          )}
        </div>
        
        {/* Elegant selection indicator */}
        {isSelected && (
          <div className="absolute bottom-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg">
              <span className="text-xs font-medium text-green-700">Selected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FaceSearchApp = () => {
  // Add debugging log to verify the environment variable
  console.log('API_BASE_URL:', API_BASE_URL);

  // Authentication state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Face search state
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureSteps, setCaptureSteps] = useState([
    { id: 'front', label: 'Front view', completed: false, active: false },
    { id: 'right', label: 'Right view', completed: false, active: false },
    { id: 'left', label: 'Left view', completed: false, active: false }
  ]);

  // Bulk download state
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthError('');
        console.log('User authenticated:', currentUser.email);
      }
    });

    return () => unsubscribe();
  }, []);

  // Enhanced camera debug monitoring
  useEffect(() => {
    if (videoRef.current && isCameraOn) {
      const video = videoRef.current;
      const updateDebug = () => {
        setDebugInfo(`Video dimensions: ${video.videoWidth}x${video.videoHeight}, Ready state: ${video.readyState}`);
      };
      
      video.addEventListener('loadedmetadata', updateDebug);
      video.addEventListener('canplay', updateDebug);
      
      return () => {
        video.removeEventListener('loadedmetadata', updateDebug);
        video.removeEventListener('canplay', updateDebug);
      };
    }
  }, [isCameraOn]);

  // Get Firebase ID token for API authentication
  const getAuthToken = async () => {
    if (user) {
      try {
        const token = await user.getIdToken(true);
        console.log('Token obtained successfully');
        return token;
      } catch (error) {
        console.error('Error getting auth token:', error);
        setError('Failed to get authentication token. Please try logging out and back in.');
        return null;
      }
    }
    setError('No authenticated user found');
    return null;
  };

  // Enhanced authentication handlers with domain validation
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');

    try {
      // Validate domain for registration
      if (authMode === 'register') {
        if (!isValidDomain(email)) {
          setAuthError(`Registration is only allowed for users with email addresses from: ${ALLOWED_DOMAINS.join(', ')}`);
          setAuthLoading(false);
          return;
        }
      }

      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      let errorMessage = error.message;
      
      // Provide more user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      }
      
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if the Google account uses an allowed domain
      const userEmail = result.user.email;
      if (!isValidDomain(userEmail)) {
        // If domain is not allowed, sign out the user and show error
        await signOut(auth);
        setAuthError(`Access denied. Only users with email addresses from these domains are allowed: ${ALLOWED_DOMAINS.join(', ')}`);
        return;
      }
      
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
      }
      
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setAuthError('Please enter your email address first');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setAuthError('Password reset email sent! Check your inbox.');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSearchResults([]);
      setSelectedImage(null);
      setSelectedImages(new Set());
      setError('');
      setDebugInfo('');
      stopCamera();
    } catch (error) {
      setError('Failed to log out');
    }
  };

  // Modified API call with better error handling
  const searchFace = useCallback(async (imageFile) => {
    setLoading(true);
    setError('');
    setSearchResults([]);
    setSelectedImages(new Set()); // Clear selected images on new search

    try {
      console.log('Starting face search...');
      console.log('Using API URL:', API_BASE_URL); // Add debug log
      
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      console.log('Sending request with token...');
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch(`${API_BASE_URL}/api/search-face`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      console.log('Response status:', response.status);

      if (response.status === 401) {
        setError('Authentication failed. Please log out and back in.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      console.log('Search results:', results);
      
      if (Array.isArray(results) && results.length > 0) {
        setSearchResults(results);
        setDebugInfo(`Found ${results.length} matches`);
      } else {
        setSearchResults([]);
        setDebugInfo('No matches found');
      }

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search faces. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  // Function to handle authenticated downloads
  const handleDownload = async (filename) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required for download');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/download/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download image');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download image');
    }
  };

  // Bulk selection handlers
  const handleImageSelect = (filename) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === searchResults.length) {
      // Deselect all
      setSelectedImages(new Set());
    } else {
      // Select all
      const allFilenames = searchResults.map(result => result.original_filename || result.filename.split('_face')[0]);
      setSelectedImages(new Set(allFilenames));
    }
  };

  // Bulk download handler
  const handleBulkDownload = async () => {
    if (selectedImages.size === 0) return;

    setIsDownloadingBulk(true);
    const token = await getAuthToken();
    
    if (!token) {
      setError('Authentication required for download');
      setIsDownloadingBulk(false);
      return;
    }

    try {
      // Create a delay function for better UX
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (const filename of selectedImages) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/download/${filename}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            console.error(`Failed to download ${filename}`);
            continue;
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          // Small delay between downloads to avoid overwhelming the browser
          await delay(200);
        } catch (error) {
          console.error(`Error downloading ${filename}:`, error);
        }
      }
    } catch (error) {
      setError('Failed to download some images');
    } finally {
      setIsDownloadingBulk(false);
    }
  };

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name);
      setSelectedImage(file);
      searchFace(file);
    }
  }, [searchFace]);

  // Enhanced camera functionality from first document
  const startCamera = useCallback(async () => {
    try {
      setError('');
      setDebugInfo('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' 
        } 
      });
      
      setCameraStream(stream);
      setIsCameraOn(true);
      setDebugInfo('Camera stream obtained, setting up video...');
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        const setupVideo = () => {
          return new Promise((resolve, reject) => {
            let resolved = false;
            
            const cleanup = () => {
              video.removeEventListener('canplay', onCanPlay);
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('playing', onPlaying);
              video.removeEventListener('error', onError);
            };
            
            const resolveOnce = (message) => {
              if (!resolved) {
                resolved = true;
                cleanup();
                setDebugInfo(message);
                resolve();
              }
            };
            
            const onCanPlay = () => resolveOnce('Video can play - ready for capture');
            const onLoadedMetadata = () => {
              setDebugInfo(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
            };
            const onPlaying = () => resolveOnce('Video is playing - ready for capture');
            const onError = (e) => {
              if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`Video error: ${e.message || 'Unknown video error'}`));
              }
            };
            
            video.addEventListener('canplay', onCanPlay);
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('playing', onPlaying);
            video.addEventListener('error', onError);
            
            setTimeout(() => {
              if (!resolved && video.readyState >= 2) {
                resolveOnce(`Video ready (fallback) - readyState: ${video.readyState}`);
              } else if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`Video setup timeout - readyState: ${video.readyState}`));
              }
            }, 5000);
          });
        };
        
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            await playPromise;
            setDebugInfo('Video.play() succeeded, waiting for ready state...');
          }
        } catch (playError) {
          setDebugInfo(`Video.play() failed: ${playError.message}, but continuing...`);
        }
        
        await setupVideo();
      }
    } catch (err) {
      setError(`Camera access failed: ${err.message}`);
      setDebugInfo(`Error: ${err.message}`);
      console.error('Camera error:', err);
      setIsCameraOn(false);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraOn(false);
      setDebugInfo('');
    }
  }, [cameraStream]);

  // Enhanced capture functionality from first document
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video or canvas not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    setDebugInfo(`Attempting capture - readyState: ${video.readyState}, dimensions: ${video.videoWidth}x${video.videoHeight}`);
    
    if (video.readyState < 1) {
      setError('Video not ready for capture. Please wait a moment and try again.');
      return;
    }

    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width === 0 || height === 0) {
      width = video.offsetWidth || 640;
      height = video.offsetHeight || 480;
      setDebugInfo(`Using fallback dimensions: ${width}x${height}`);
    }

    if (width === 0 || height === 0) {
      setError('Cannot determine video dimensions. Please restart the camera.');
      return;
    }

    try {
      const context = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height;
      
      context.drawImage(video, 0, 0, width, height);
      
      const imageData = context.getImageData(0, 0, 10, 10);
      const hasPixelData = imageData.data.some(value => value !== 0);
      
      if (!hasPixelData) {
        setError('Video frame appears to be empty. Please try again.');
        return;
      }
      
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
          setDebugInfo(`Successfully captured image: ${blob.size} bytes`);
          searchFace(file);
          stopCamera();
        } else {
          setError('Failed to create image from canvas - blob is empty');
        }
      }, 'image/jpeg', 0.9);
      
    } catch (err) {
      setError(`Capture failed: ${err.message}`);
      setDebugInfo(`Capture error: ${err.message}`);
      console.error('Capture error:', err);
    }
  }, [searchFace, stopCamera]);

  const reset = () => {
    setSearchResults([]);
    setSelectedImage(null);
    setSelectedImages(new Set());
    setError('');
    setDebugInfo('');
    setCaptureProgress(0);
    setCaptureSteps(steps => steps.map(step => ({ ...step, completed: false, active: false })));
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Rest of your component JSX remains the same...
  // Enhanced login page with Google Sign-in and domain info
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex">
        <div className="hidden lg:flex lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800">
            <div className="w-full h-full bg-cover bg-center relative" style={{backgroundImage: "url('/sidebar.jpg')"}}>
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-8">
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-900">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <div className="text-3xl font-bold text-white mb-2">KIIT Gallery</div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {authMode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-gray-400">
                {authMode === 'login' ? (
                  <>Don't have an account? <button onClick={() => setAuthMode('register')} className="text-green-500 hover:text-green-400">Sign up</button></>
                ) : (
                  <>Already have an account? <button onClick={() => setAuthMode('login')} className="text-green-500 hover:text-green-400">Log in</button></>
                )}
              </p>
            </div>

            {/* Domain restriction notice for registration */}
            {authMode === 'register' && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
                <div className="font-medium mb-1">Registration Requirements:</div>
                <div className="text-xs">Only email addresses from these domains are allowed:</div>
                <div className="text-xs font-mono mt-1">
                  {ALLOWED_DOMAINS.join(', ')}
                </div>
              </div>
            )}

            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {authError}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />

              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                />
              </div>

              <button
                onClick={handleAuth}
                disabled={authLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
              >
                {authLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  authMode === 'login' ? 'Sign In' : 'Create account'
                )}
              </button>
            </div>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-700"></div>
              <span className="px-4 text-gray-400 text-sm">Or continue with</span>
              <div className="flex-1 border-t border-gray-700"></div>
            </div>

            {/* Google Sign-in Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-900 py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center border border-gray-300"
            >
              {authLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading...
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {authMode === 'login' && (
              <div className="text-center mt-6">
                <button
                  onClick={handlePasswordReset}
                  className="text-green-500 hover:text-green-400 text-sm"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold text-green-800">KIIT Gallery</div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-green-700">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-gray-600">
            For facial recognition, high-quality facial images need to be captured.
          </p>
          <p className="text-gray-600">
            Kindly follow the instructions below to proceed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Instructions</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Good lighting</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Uncluttered background</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Proper face alignment in the image capture box</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Camera/Upload */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-4 px-6 text-center font-medium border-b-2 transition-all duration-200 ${
                      activeTab === 'upload'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="inline-block w-5 h-5 mr-2" />
                    Upload Image
                  </button>
                  <button
                    onClick={() => setActiveTab('camera')}
                    className={`flex-1 py-4 px-6 text-center font-medium border-b-2 transition-all duration-200 ${
                      activeTab === 'camera'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Camera className="inline-block w-5 h-5 mr-2" />
                    Use Camera
                  </button>
                </nav>
              </div>

              <div className="p-8">
                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="text-center">
                    <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-8 hover:border-green-400 hover:bg-green-100 transition-all duration-200">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6 text-green-600" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg shadow hover:from-green-700 hover:to-green-800 transition-all duration-200"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </label>
                      <p className="text-green-700 font-medium mt-3">Supported formats: JPG, PNG, GIF</p>
                      <p className="text-green-600 text-sm mt-1">Drag and drop files here or click to browse</p>
                    </div>
                  </div>
                )}

                {/* Camera Tab */}
                {activeTab === 'camera' && (
                  <div>
                    {!isCameraOn ? (
                      <div className="text-center">
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 mb-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="w-8 h-8 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-green-800 mb-2">Camera is Ready</h3>
                          <p className="text-green-700 mb-4">Click the button below to activate your camera for face recognition</p>
                          <button
                            onClick={startCamera}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg shadow hover:from-green-700 hover:to-green-800 transition-all duration-200"
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            Start Camera
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Camera View */}
                        <div className="relative">
                          <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ aspectRatio: '4/3' }}>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{ maxHeight: '400px', minHeight: '200px', minWidth: '300px', backgroundColor: '#f3f4f6' }}
                            />
                            
                            {/* Loading indicator for video */}
                            {videoRef.current && videoRef.current.readyState === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                                <p className="text-gray-600">Loading video...</p>
                              </div>
                            )}
                            
                            {/* Face detection overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="border-4 border-green-500 rounded-lg w-64 h-80 relative">
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-green-500"></div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-green-500"></div>
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-green-500"></div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-green-500"></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Status message */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                              The camera will automatically capture your best face position
                            </div>
                          </div>
                        </div>

                        {/* Camera Controls */}
                        <div className="flex justify-center space-x-4">
                          <button
                            onClick={captureImage}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg shadow hover:from-green-700 hover:to-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                            disabled={!videoRef.current || (videoRef.current && videoRef.current.readyState < 1)}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Capture & Search
                          </button>
                          <button
                            onClick={() => {
                              if (videoRef.current && cameraStream) {
                                const video = videoRef.current;
                                video.srcObject = cameraStream;
                                video.play().catch(console.error);
                                setDebugInfo('Manual video restart attempted');
                              }
                            }}
                            className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg shadow hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Restart Video
                          </button>
                          <button
                            onClick={stopCamera}
                            className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Stop Camera
                          </button>
                        </div>

                        {/* Clear and Submit buttons */}
                        <div className="flex justify-center space-x-4 pt-4">
                          <button
                            onClick={reset}
                            className="inline-flex items-center px-6 py-3 border-2 border-green-300 text-green-700 rounded-lg hover:bg-green-50 hover:border-green-400 transition-all duration-200 font-medium"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Clear all
                          </button>
                          <button
                            onClick={() => selectedImage && searchFace(selectedImage)}
                            disabled={!selectedImage}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-8 text-center py-12">
            <Loader className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-lg text-gray-600 mb-2">Searching for similar faces...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        )}

        {/* Search Results */}
        {(searchResults.length > 0 || (selectedImage && !loading)) && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-green-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center text-gray-900">
                  <Search className="w-6 h-6 mr-3 text-green-600" />
                  {searchResults.length > 0 ? 'Search Results' : 'Query Processed'}
                  {searchResults.length > 0 && (
                    <span className="ml-2 text-sm font-normal bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-4 py-1 rounded-full border border-green-200 shadow-sm">
                      {searchResults.length} matches found
                    </span>
                  )}
                </h3>
                
                {/* Bulk Actions */}
                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white px-3 py-2 rounded-lg border border-green-200 shadow-sm">
                        <span className="text-sm text-green-700 font-medium">
                          {selectedImages.size} of {searchResults.length} selected
                        </span>
                      </div>
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-green-600 hover:text-green-800 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-green-50 border border-transparent hover:border-green-200"
                      >
                        {selectedImages.size === searchResults.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <button
                      onClick={handleBulkDownload}
                      disabled={selectedImages.size === 0 || isDownloadingBulk}
                      className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25 disabled:shadow-none font-medium"
                    >
                      {isDownloadingBulk ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download Selected ({selectedImages.size})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Query Image Sidebar */}
                {selectedImage && (
                      <div className="lg:w-64 flex-shrink-0">
                    <div className="sticky top-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-green-900 text-sm">Query Image</h4>
                          <button
                            onClick={reset}
                            className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-red-500/25"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(selectedImage)}
                            alt="Query"
                            className="w-full h-48 object-cover rounded-lg shadow-sm border border-green-100"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent rounded-lg"></div>
                        </div>
                        <div className="mt-3 text-xs text-green-700 text-center bg-white/80 backdrop-blur-sm rounded-full py-2 px-3 border border-green-100">
                          {searchResults.length > 0 ? `${searchResults.length} similar faces found` : 'Processing query...'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Grid */}
                <div className="flex-1">
                  {searchResults.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {searchResults.map((result, index) => {
                        const filename = result.original_filename || result.filename.split('_face')[0];
                        return (
                          <div key={index} className="group">
                            <div className={`bg-white border-2 rounded-xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg ${
                              selectedImages.has(filename) 
                                ? 'border-green-500 shadow-green-500/20 transform scale-[1.02]' 
                                : 'border-green-100 hover:border-green-300'
                            }`}>
                              <div className="relative">
                                <AuthenticatedImage 
                                  filename={filename}
                                  alt={`Match ${index + 1}`}
                                  className="w-full h-36 object-cover"
                                  isSelected={selectedImages.has(filename)}
                                  onSelect={() => handleImageSelect(filename)}
                                />
                                {/* Individual download button */}
                                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(filename);
                                    }}
                                    className="bg-white/95 backdrop-blur-sm text-green-700 p-2 rounded-full shadow-lg hover:bg-green-50 hover:shadow-green-500/25 border border-green-200 transition-all duration-200 hover:scale-105"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedImage && !loading && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">Processing your query image...</p>
                      <p className="text-sm text-gray-500 mt-1">Results will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!loading && selectedImage && searchResults.length === 0 && !error && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No matches found</h3>
            <p className="text-yellow-700">No similar faces were found in the database. Try uploading a different image with better lighting and face visibility.</p>
          </div>
        )}

        {/* Hidden canvas for camera capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default FaceSearchApp;
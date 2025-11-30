# Netlify Deployment Guide

## Issues Fixed for Netlify Deployment

### 1. CORS Configuration
- Backend now allows all Netlify domains (`.netlify.app` and `.netlify.com`)
- Enhanced CORS headers for proper cross-origin requests

### 2. API URL Detection
- Automatically detects if running on localhost or production
- Uses appropriate API URL based on environment

### 3. Timeout and Retry Logic
- Added timeout handling for Render backend (which may sleep on free tier)
- Automatic retry mechanism for failed requests
- Better error messages for users

### 4. Netlify Configuration Files
- `_redirects` file for SPA routing
- `netlify.toml` for build configuration

## Deployment Steps

1. **Push to Netlify:**
   - Connect your repository to Netlify
   - Set build directory to `frontend` (or root if frontend is root)
   - Deploy

2. **Backend Considerations:**
   - If using Render free tier, the backend may sleep after inactivity
   - First request after sleep may take 30-60 seconds
   - Consider upgrading to paid tier or using a service that doesn't sleep

3. **Environment Variables (if needed):**
   - No environment variables needed for frontend
   - All configuration is in `script.js`

## Troubleshooting

### Cart Not Loading
- Check browser console for errors
- Verify backend is running and accessible
- Check CORS headers in Network tab
- First load after backend sleep may take longer

### API Errors
- Verify API_URL is correct in `script.js`
- Check backend logs on Render
- Ensure MongoDB connection is active

### Session Issues
- Cart uses localStorage for session ID
- Clear browser cache if issues persist
- Check if localStorage is enabled in browser


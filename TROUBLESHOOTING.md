# Troubleshooting Guide - Cart Not Showing on Production

## Common Issues and Solutions

### 1. Backend Server Sleeping (Render Free Tier)
**Problem:** Render free tier servers sleep after 15 minutes of inactivity. First request can take 30-60 seconds.

**Solution:**
- Wait 30-60 seconds after first request
- Click "Retry" button if cart doesn't load
- Consider upgrading to paid tier for always-on service

### 2. CORS Issues
**Problem:** Browser blocks requests due to CORS policy.

**Check:**
- Open browser console (F12)
- Look for CORS errors in red
- Verify backend CORS allows your Netlify domain

**Solution:**
- Backend should allow all `*.netlify.app` and `*.netlify.com` domains
- Check `backend/server.js` CORS configuration

### 3. API URL Not Detecting Correctly
**Problem:** Frontend using wrong API URL.

**Check:**
- Open browser console
- Look for "API URL:" in logs
- Should show `https://backend-6534.onrender.com/api` on production

**Solution:**
- Verify `frontend/script.js` API_URL detection logic
- Should auto-detect localhost vs production

### 4. Session ID Issues
**Problem:** Cart items saved to different session.

**Check:**
- Open browser console
- Look for "Session ID:" in cart debug logs
- Verify session ID is consistent

**Solution:**
- Session ID stored in localStorage
- Clear browser cache if issues persist
- Check localStorage in DevTools → Application → Local Storage

### 5. Network/Connection Issues
**Problem:** Cannot reach backend server.

**Check:**
- Open browser console (F12) → Network tab
- Look for failed requests to backend
- Check request status codes

**Solution:**
- Verify backend is running: Visit `https://backend-6534.onrender.com/health`
- Check internet connection
- Verify backend URL is correct

## Debug Steps

1. **Open Browser Console (F12)**
   - Check for error messages
   - Look for "CART LOAD DEBUG" section
   - Check network requests

2. **Check Cart Data:**
   - Look for "Cart data received:" in console
   - Verify `cart.items` array exists
   - Check if items have `productId` populated

3. **Test API Directly:**
   - Visit: `https://backend-6534.onrender.com/api/cart/YOUR_SESSION_ID`
   - Replace YOUR_SESSION_ID with session from localStorage
   - Should return cart JSON

4. **Verify Backend:**
   - Visit: `https://backend-6534.onrender.com/health`
   - Should return `{"status":"healthy"}`

## Quick Fixes

### Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Reset Session
1. Open DevTools → Console
2. Run: `localStorage.removeItem('sessionId')`
3. Refresh page

### Check Backend Status
Visit: `https://backend-6534.onrender.com/health`

If it times out, backend is sleeping. Wait 30-60 seconds and try again.


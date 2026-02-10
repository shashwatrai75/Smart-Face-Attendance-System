# Deployment Guide - Vercel (Frontend + Backend)

This guide will help you deploy the Smart Face Attendance System to Vercel.

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at https://vercel.com
3. **MongoDB Atlas Account** - Sign up at https://www.mongodb.com/cloud/atlas (free tier available)

## Step 1: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas and create a free account
2. Create a new cluster (choose the free M0 tier)
3. **Database Access:**
   - Go to "Database Access" → "Add New Database User"
   - Create a username and password (save these!)
   - Set privileges to "Atlas admin" or "Read and write to any database"
4. **Network Access:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or add specific IPs for production
5. **Get Connection String:**
   - Go to "Clusters" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with your database name (e.g., `smartface-attendance`)

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/smartface-attendance?retryWrites=true&w=majority
```

## Step 2: Deploy Backend to Vercel

1. **Install Vercel CLI** (optional, you can also use the web dashboard):
   ```bash
   npm install -g vercel
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   vercel
   ```
   
   Or use the Vercel dashboard:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `backend`
   - Framework Preset: **Other**
   - Build Command: Leave empty (or `npm install`)
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Set Environment Variables in Vercel:**
   - Go to your project → Settings → Environment Variables
   - Add the following variables:
   
   ```
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   JWT_SECRET=your-secure-random-secret-key-here
   JWT_EXPIRE=7d
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ALLOW_SEED=false
   ```
   
   **Important:** 
   - Replace `MONGODB_URI` with your actual MongoDB Atlas connection string
   - Generate a secure `JWT_SECRET` (you can use: `openssl rand -base64 32`)
   - For `FRONTEND_URL`, you'll update this after deploying the frontend

4. **Redeploy** after adding environment variables:
   - Go to Deployments → Click the three dots → Redeploy

5. **Note your Backend URL:**
   - After deployment, Vercel will give you a URL like: `https://your-backend-app.vercel.app`
   - Save this URL - you'll need it for the frontend

## Step 3: Deploy Frontend to Vercel

1. **Deploy Frontend:**
   ```bash
   cd frontend
   vercel
   ```
   
   Or use the Vercel dashboard:
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your GitHub repository (same repo, different project)
   - Set **Root Directory** to `frontend`
   - Framework Preset: **Vite** (should auto-detect)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

2. **Set Environment Variables in Vercel:**
   - Go to your frontend project → Settings → Environment Variables
   - Add:
   
   ```
   VITE_API_URL=https://your-backend-app.vercel.app/api
   ```
   
   Replace `your-backend-app.vercel.app` with your actual backend URL from Step 2.

3. **Redeploy** after adding environment variables

## Step 4: Update Backend CORS

1. Go back to your **backend** project in Vercel
2. Update the `FRONTEND_URL` environment variable with your frontend URL:
   ```
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ```
3. Redeploy the backend

## Step 5: Create Admin User

After deployment, you need to create an admin user. You have a few options:

### Option A: Use the Seed Admin Endpoint (if enabled)
If `ALLOW_SEED=true` in your backend environment variables:
1. Make a POST request to `https://your-backend-app.vercel.app/api/auth/seed-admin`
2. Body: `{ "name": "Admin", "email": "admin@example.com", "password": "securepassword" }`

### Option B: Use MongoDB Atlas
1. Go to MongoDB Atlas → Browse Collections
2. Find your database → `users` collection
3. Insert a document with admin role (you'll need to hash the password)

### Option C: Use Local Script (if you have access)
1. Clone the repo locally
2. Set up `.env` file in backend folder
3. Run: `node scripts/createAdmin.js`

## Step 6: Test Your Deployment

1. Visit your frontend URL: `https://your-frontend-app.vercel.app`
2. Try logging in with your admin credentials
3. Test the face recognition features
4. Check backend logs in Vercel dashboard if there are issues

## Troubleshooting

### Backend Issues

1. **Database Connection Errors:**
   - Check MongoDB Atlas Network Access (IP whitelist)
   - Verify connection string is correct
   - Check MongoDB Atlas cluster is running

2. **CORS Errors:**
   - Verify `FRONTEND_URL` in backend environment variables matches your frontend URL exactly
   - Check browser console for specific CORS errors

3. **Function Timeout:**
   - Vercel free tier has 10-second timeout for serverless functions
   - Consider upgrading or optimizing slow endpoints

### Frontend Issues

1. **API Connection Errors:**
   - Verify `VITE_API_URL` is set correctly
   - Check that backend is deployed and accessible
   - Test backend health endpoint: `https://your-backend-app.vercel.app/api/health`

2. **Build Errors:**
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

### General Issues

1. **Environment Variables Not Working:**
   - Make sure to redeploy after adding environment variables
   - Check that variable names match exactly (case-sensitive)
   - For frontend, variables must start with `VITE_` to be accessible

2. **Face Recognition Models Not Loading:**
   - Check that face model files are in `public/face-models/`
   - Verify build includes these files
   - Check browser console for 404 errors

## Custom Domains

You can add custom domains in Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` in backend environment variables

## Monitoring

- **Vercel Dashboard:** View deployments, logs, and analytics
- **MongoDB Atlas:** Monitor database performance and usage
- **Browser DevTools:** Check for frontend errors and network issues

## Security Checklist

- [ ] Use strong, unique `JWT_SECRET` in production
- [ ] Set `ALLOW_SEED=false` after creating admin user
- [ ] Configure MongoDB Atlas IP whitelist appropriately
- [ ] Use HTTPS (automatic with Vercel)
- [ ] Review and update CORS settings
- [ ] Enable MongoDB Atlas authentication
- [ ] Regularly update dependencies

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Review browser console for errors
4. Verify all environment variables are set correctly


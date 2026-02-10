# Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

- [ ] Code is pushed to GitHub repository
- [ ] MongoDB Atlas account created
- [ ] MongoDB Atlas cluster created and running
- [ ] MongoDB database user created
- [ ] MongoDB network access configured (IP whitelist)
- [ ] MongoDB connection string obtained

## Backend Deployment

- [ ] Vercel account created
- [ ] Backend project created in Vercel (root directory: `backend`)
- [ ] Environment variables set in Vercel:
  - [ ] `PORT=5000`
  - [ ] `NODE_ENV=production`
  - [ ] `MONGODB_URI` (your MongoDB Atlas connection string)
  - [ ] `JWT_SECRET` (secure random string)
  - [ ] `JWT_EXPIRE=7d`
  - [ ] `FRONTEND_URL` (will update after frontend deployment)
  - [ ] `ALLOW_SEED=false` (or `true` if you need to seed admin)
- [ ] Backend deployed successfully
- [ ] Backend URL noted (e.g., `https://your-backend.vercel.app`)
- [ ] Backend health check tested: `https://your-backend.vercel.app/api/health`

## Frontend Deployment

- [ ] Frontend project created in Vercel (root directory: `frontend`)
- [ ] Environment variables set in Vercel:
  - [ ] `VITE_API_URL=https://your-backend.vercel.app/api`
- [ ] Frontend deployed successfully
- [ ] Frontend URL noted (e.g., `https://your-frontend.vercel.app`)

## Post-Deployment

- [ ] Backend `FRONTEND_URL` updated with frontend URL
- [ ] Backend redeployed after updating `FRONTEND_URL`
- [ ] Frontend tested in browser
- [ ] Login functionality tested
- [ ] Admin user created (if needed)
- [ ] Face recognition features tested
- [ ] CORS errors checked (should be none)
- [ ] API calls working correctly

## Security

- [ ] Strong `JWT_SECRET` used (not default)
- [ ] MongoDB password is strong
- [ ] `ALLOW_SEED` set to `false` after admin creation
- [ ] MongoDB IP whitelist configured appropriately
- [ ] Environment variables are secure (not committed to git)

## Testing

- [ ] Health endpoint: `GET /api/health`
- [ ] Login endpoint: `POST /api/auth/login`
- [ ] Frontend loads correctly
- [ ] No console errors in browser
- [ ] No CORS errors
- [ ] Database operations work
- [ ] Face recognition models load

## Troubleshooting

If something doesn't work:
1. Check Vercel deployment logs
2. Check Vercel function logs
3. Check browser console for errors
4. Test backend health endpoint
5. Verify all environment variables are set
6. Check MongoDB Atlas connection
7. Verify CORS configuration

## Quick Commands

```bash
# Test backend health (replace with your URL)
curl https://your-backend.vercel.app/api/health

# Deploy backend
cd backend
vercel

# Deploy frontend
cd frontend
vercel

# View logs
vercel logs
```


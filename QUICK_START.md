# Quick Start - Deploy to Vercel

## 🚀 Fast Deployment Steps

### 1. MongoDB Atlas Setup (5 minutes)

```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create free cluster
# 3. Database Access → Create user
# 4. Network Access → Allow from anywhere (0.0.0.0/0)
# 5. Get connection string
```

### 2. Generate JWT Secret

```bash
# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# On Mac/Linux:
openssl rand -base64 32
```

### 3. Deploy Backend

**Option A: Using Vercel CLI**
```bash
cd backend
npm install -g vercel
vercel
# Follow prompts, set root directory to: backend
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. New Project → Import GitHub repo
3. Root Directory: `backend`
4. Framework: Other
5. Add environment variables (see below)

**Backend Environment Variables:**
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=<your-generated-secret>
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend.vercel.app
ALLOW_SEED=true
```

**Note:** Update `FRONTEND_URL` after deploying frontend!

### 4. Deploy Frontend

**Option A: Using Vercel CLI**
```bash
cd frontend
vercel
# Follow prompts, set root directory to: frontend
```

**Option B: Using Vercel Dashboard**
1. New Project → Import same GitHub repo
2. Root Directory: `frontend`
3. Framework: Vite (auto-detected)
4. Add environment variable:

**Frontend Environment Variable:**
```
VITE_API_URL=https://your-backend.vercel.app/api
```

### 5. Update Backend CORS

1. Go to backend project in Vercel
2. Settings → Environment Variables
3. Update `FRONTEND_URL` with your frontend URL
4. Redeploy backend

### 6. Create Admin User

Visit: `https://your-backend.vercel.app/api/auth/seed-admin`
```json
POST /api/auth/seed-admin
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

Or use Postman/curl:
```bash
curl -X POST https://your-backend.vercel.app/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"SecurePassword123!"}'
```

### 7. Test

1. Visit your frontend URL
2. Login with admin credentials
3. Test features

## 📝 Files Created

- `backend/vercel.json` - Backend Vercel configuration
- `backend/api/index.js` - Serverless function wrapper
- `frontend/vercel.json` - Frontend Vercel configuration
- `DEPLOYMENT.md` - Detailed deployment guide
- `VERCEL_DEPLOYMENT_CHECKLIST.md` - Deployment checklist

## 🔧 Troubleshooting

**Backend not connecting to MongoDB?**
- Check MongoDB Atlas IP whitelist
- Verify connection string
- Check Vercel logs

**CORS errors?**
- Verify `FRONTEND_URL` in backend matches frontend URL exactly
- Redeploy backend after updating

**Frontend can't reach API?**
- Verify `VITE_API_URL` is set correctly
- Check backend is deployed and accessible
- Test: `curl https://your-backend.vercel.app/api/health`

## 📚 More Help

See `DEPLOYMENT.md` for detailed instructions and troubleshooting.


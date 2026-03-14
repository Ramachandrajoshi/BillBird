# BillBird Deployment Guide

## Deploying to GitHub Pages

### Prerequisites
1. A GitHub account
2. Git installed on your computer
3. Node.js 18+ installed

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `billbird` (or any name you prefer)
3. Make it public (required for free GitHub Pages)
4. Do NOT initialize with README, .gitignore, or license (we already have these)

### Step 2: Initialize Git and Push to GitHub

Open your terminal in the project directory and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit: BillBird PWA App"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/billbird.git

# Push to GitHub
git push -u origin main
```

### Step 3: Configure GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically deploy your app

### Step 4: Update Base Path (if needed)

If your repository name is different from `billbird`, update the base path:

1. Create a `.env` file in the project root:
```env
VITE_BASE_PATH=/your-repo-name/
```

2. Or update `vite.config.js` directly:
```javascript
const basePath = '/your-repo-name/';
```

### Step 5: Deploy

The GitHub Actions workflow will automatically deploy when you push to the `main` or `master` branch.

To manually trigger deployment:
1. Go to **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**

### Step 6: Access Your App

After deployment (usually takes 2-5 minutes), your app will be available at:
```
https://YOUR_USERNAME.github.io/billbird/
```

## Manual Deployment (Alternative)

If you prefer to deploy manually without GitHub Actions:

### Build the Project

```bash
npm run build
```

### Deploy using gh-pages package

1. Install gh-pages:
```bash
npm install -D gh-pages
```

2. Add to package.json:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

## Environment Variables

Create a `.env` file for environment-specific configurations:

```env
# Base path for GitHub Pages
VITE_BASE_PATH=/billbird/

# API endpoints (if needed in future)
VITE_API_URL=https://api.example.com
```

## Troubleshooting

### 404 Error on Refresh
This is normal for SPAs on GitHub Pages. The app uses hash routing to handle this.

### Assets Not Loading
Make sure the `base` path in `vite.config.js` matches your repository name.

### PWA Not Installing
- Ensure the site is served over HTTPS (GitHub Pages provides this)
- Check that the manifest.webmanifest is accessible
- Verify icons are properly sized (192x192 and 512x512)

### Build Fails
- Check Node.js version (should be 18+)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript/ESLint errors

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public` folder:
```
yourdomain.com
```

2. Configure your domain's DNS:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`

3. In GitHub repository settings:
   - Go to **Settings** > **Pages**
   - Enter your custom domain
   - Enable **Enforce HTTPS**

## Monitoring

After deployment, monitor your app:

1. Check GitHub Actions for deployment status
2. Test the PWA installation on mobile devices
3. Verify offline functionality
4. Test data export/import features

## Updates

To update your deployed app:

```bash
# Make your changes
git add .
git commit -m "Update: description of changes"
git push origin main
```

The GitHub Actions workflow will automatically rebuild and deploy your app.

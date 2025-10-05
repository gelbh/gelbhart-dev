# Google Analytics - Production Deployment Guide

## What You Have Now

Your Hevy Tracker page now displays **live Google Analytics data**:
- ✅ Active Users (all-time since Nov 19, 2024)
- ✅ Workspace Downloads (FINISH_INSTALL events from GA4)
- ✅ Countries (total unique countries)
- ✅ Engagement Rate (rounded to whole number)

All stats update automatically via API, cached for 5 minutes.

---

## Google Cloud Cleanup

### ✅ What to KEEP:
1. **OAuth Client ID** (Web application type)
   - Name: "Hevy Tracker" or similar
   - Authorized redirect URIs: `http://localhost:8080`
   - This is actively being used ✓

2. **Google Analytics Data API** (enabled)
   - Required for fetching GA4 data

### ❌ What to DELETE (if you created any):
1. **Service Account credentials** (if you created one earlier)
   - Go to: [Google Cloud Console](https://console.cloud.google.com/) > IAM & Admin > Service Accounts
   - Delete any service account you created for "hevy-tracker-analytics" or similar
   - This is NOT being used

2. **Desktop app OAuth client** (if you created one before switching to Web app)
   - Go to: APIs & Services > Credentials
   - Delete any "Desktop app" OAuth clients
   - Only keep the "Web application" OAuth client

---

## Deploying to Production (Render.com)

### Step 1: Prepare Credentials

You have two files that need to be in production:
- `config/google-oauth-credentials.json` (OAuth client credentials)
- `config/analytics-tokens.yaml` (your authorized token)

### Step 2: Set Environment Variables in Render

Go to your Render dashboard > Environment tab and add:

```bash
# Required - Your GA4 Property ID
GA4_PROPERTY_ID=468479218

# Required - Path to OAuth credentials
GOOGLE_OAUTH_CREDENTIALS=config/google-oauth-credentials.json
```

### Step 3: Deploy Credential Files

**Option A: Commit temporarily (simplest for first deployment)**

```bash
# 1. Remove credentials from gitignore TEMPORARILY
git rm --cached .gitignore
# Edit .gitignore and comment out these two lines:
# /config/google-oauth-credentials.json
# /config/analytics-tokens.yaml

# 2. Commit and push
git add config/google-oauth-credentials.json config/analytics-tokens.yaml
git commit -m "Add Google Analytics credentials for deployment"
git push

# 3. After successful deployment, IMMEDIATELY:
# - Revert the .gitignore changes
# - Remove credentials from repo
git rm config/google-oauth-credentials.json config/analytics-tokens.yaml
# Restore .gitignore
git checkout .gitignore
git commit -m "Remove credentials from repo (now in production)"
git push
```

**Option B: Use Render Shell (more secure, but requires manual setup)**

1. Deploy your code without credentials
2. Access Render Shell from dashboard
3. Create the files manually:
   ```bash
   cat > config/google-oauth-credentials.json << 'EOF'
   [paste JSON contents here]
   EOF

   cat > config/analytics-tokens.yaml << 'EOF'
   [paste YAML contents here]
   EOF
   ```
4. Restart the service

### Step 4: Verify

After deployment:
1. Visit your live Hevy Tracker page
2. Stats should load automatically (may take a few seconds)
3. Check browser console for any errors
4. Verify stats match your GA4 dashboard

---

## Troubleshooting Production

### Stats not showing / showing mock data

1. **Check environment variables in Render:**
   - Make sure `GA4_PROPERTY_ID` is set to `468479218`
   - Make sure `GOOGLE_OAUTH_CREDENTIALS` is set

2. **Check credential files exist:**
   - Access Render Shell
   - Run: `ls -la config/google-oauth-credentials.json config/analytics-tokens.yaml`
   - Both files should exist

3. **Check Rails logs:**
   - Look for "Google Analytics API Error" messages
   - Check if credentials are being loaded

### "Invalid grant" or "Token expired" errors

OAuth refresh tokens generally don't expire, but if they do:
1. Run `rails analytics:revoke` locally
2. Run `rails analytics:authorize` locally to get new token
3. Re-deploy the updated `analytics-tokens.yaml` file

### Stats are cached / not updating

- Stats cache for 5 minutes to avoid API rate limits
- Wait 5 minutes or clear cache in Rails console:
  ```ruby
  Rails.cache.delete('hevy_tracker_analytics')
  ```

---

## Security Notes

✅ **DO:**
- Keep `.gitignore` protecting credential files
- Rotate OAuth client secret periodically (every 6-12 months)
- Monitor Google Cloud API usage

❌ **DON'T:**
- Leave credentials in public GitHub repos
- Share OAuth client secret or refresh tokens
- Commit credentials to version control (except temporarily for deployment)

---

## API Rate Limits

- **Free tier**: 50,000 requests/day
- **Current caching**: 5 minutes (12 requests/hour max)
- **Daily usage**: ~288 requests/day (well within limits)

---

## Files Created

**Code:**
- `app/services/google_analytics_service.rb` - GA4 API integration
- `app/controllers/api/analytics_controller.rb` - JSON API endpoint
- `app/javascript/controllers/analytics_stats_controller.js` - Frontend controller
- `lib/tasks/analytics.rake` - Authorization and testing tasks

**Configuration:**
- `config/google-oauth-credentials.json` - OAuth client credentials (gitignored)
- `config/analytics-tokens.yaml` - Your authorization token (gitignored)
- `.env` - Environment variables for development (gitignored)

**Documentation:**
- `GOOGLE_ANALYTICS_OAUTH_SETUP.md` - Full setup instructions
- `GOOGLE_ANALYTICS_DEPLOYMENT.md` - This file

**Dependencies:**
- `google-analytics-data` gem
- `googleauth` gem
- `webrick` gem
- `dotenv-rails` gem (dev/test only)

---

## Quick Reference

**Test locally:**
```bash
rails analytics:test
```

**Re-authorize:**
```bash
rails analytics:revoke
rails analytics:authorize
```

**Clear cache:**
```ruby
Rails.cache.delete('hevy_tracker_analytics')
```

**API endpoint:**
```
GET /api/analytics/hevy-tracker
```

Returns JSON:
```json
{
  "active_users": 751,
  "page_views": 1880,
  "install_count": 294,
  "countries": {
    "list": [...],
    "total": 68
  },
  "engagement_rate": 51
}
```

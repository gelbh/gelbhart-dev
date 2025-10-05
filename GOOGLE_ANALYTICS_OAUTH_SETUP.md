# Google Analytics Setup (OAuth - Recommended)

This is the **simpler, recommended approach** using your own Google account credentials. No need to manage service accounts or permissions!

Your Property ID: `468479218`

## Quick Setup (5 steps)

### 1. Enable Google Analytics Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Go to **APIs & Services** > **Library**
4. Search for **"Google Analytics Data API"**
5. Click **Enable**

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted to configure consent screen:
   - Click **Configure Consent Screen**
   - User Type: **External**
   - Click **Create**
   - App name: **Hevy Tracker Analytics**
   - User support email: your email
   - Developer contact email: your email
   - Click **Save and Continue**
   - Click **Save and Continue** (skip scopes)
   - Click **Save and Continue** (skip test users)
   - Click **Back to Dashboard**

4. Back to **Credentials** tab:
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application** (important!)
   - Name: **Hevy Tracker**
   - Under **Authorized redirect URIs**, click **+ ADD URI**
   - Add: `http://localhost:8080`
   - Click **Create**

5. Download the credentials:
   - Click the **Download** icon (⬇️) next to your OAuth client
   - Save as `config/google-oauth-credentials.json` in your Rails app

### 3. Set Environment Variables

Create or update your `.env` file:

```bash
# OAuth credentials file path
GOOGLE_OAUTH_CREDENTIALS=config/google-oauth-credentials.json

# Your GA4 Property ID
GA4_PROPERTY_ID=468479218
```

Or export them:

```bash
export GOOGLE_OAUTH_CREDENTIALS=config/google-oauth-credentials.json
export GA4_PROPERTY_ID=468479218
```

### 4. Install Gems

```bash
bundle install
```

### 5. Authorize Access (One-time)

Run the authorization task:

```bash
rails analytics:authorize
```

This will:
1. Display a Google authorization URL
2. Ask you to open it in your browser
3. You'll sign in and approve access
4. Copy the code Google gives you
5. Paste it back in the terminal

That's it! The token is saved and your app can now access Analytics.

## Test the Connection

```bash
rails analytics:test
```

You should see your real analytics data printed out!

## Usage

The stats will automatically load on your Hevy Tracker page. The API is called when the page loads and data is cached for 5 minutes.

## Useful Commands

**Check authorization status:**
```bash
rails analytics:authorize
```

**Test the connection:**
```bash
rails analytics:test
```

**Revoke access and start over:**
```bash
rails analytics:revoke
```

## Troubleshooting

### "Error 400: invalid_request - The out-of-band (OOB) flow has been blocked"
Google deprecated the OOB flow. To fix:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click the edit icon (pencil) next to your OAuth client
3. Make sure **Application type** is **Desktop app**
4. Under **Authorized redirect URIs**, add: `http://localhost:8080`
5. Click **Save**
6. Re-download the credentials JSON and replace `config/google-oauth-credentials.json`
7. Run `rails analytics:authorize` again

### "OAuth credentials file not found"
- Make sure `config/google-oauth-credentials.json` exists
- Check that `GOOGLE_OAUTH_CREDENTIALS` environment variable is set correctly

### "Access not configured"
- Make sure you enabled the Google Analytics Data API in step 1

### "Authorization failed"
- Make sure you're using a **Web application** type (not Desktop app)
- Make sure `http://localhost:8080` is in the Authorized redirect URIs
- Make sure you're signed in with the Google account that has GA4 access

### "Invalid grant" errors
- Your token may have expired, run: `rails analytics:revoke` then `rails analytics:authorize`

### Browser doesn't open automatically
- Copy the URL from the terminal and paste it into your browser manually

## How It Works

1. **OAuth Credentials**: Your app uses OAuth to authenticate as YOU
2. **One-time Authorization**: You approve access once via browser
3. **Token Storage**: Token saved in `config/analytics-tokens.yaml` (gitignored)
4. **Automatic Access**: App uses the saved token to fetch GA4 data
5. **No Permission Management**: Since it's your account, you already have access!

## Production Deployment

### Option 1: Using Environment Variables (Recommended for Render/Heroku)

1. **Authorize locally first:**
   ```bash
   rails analytics:authorize
   ```
   This creates `config/analytics-tokens.yaml`

2. **Set environment variables in your hosting platform:**

   **Required variables:**
   ```bash
   GA4_PROPERTY_ID=468479218

   # Paste entire contents of config/google-oauth-credentials.json
   GOOGLE_OAUTH_CREDENTIALS_JSON={"web":{"client_id":"...","client_secret":"...",...}}

   # Paste entire contents of config/analytics-tokens.yaml
   ANALYTICS_TOKEN_YAML=---
   default: '{"client_id":"...","refresh_token":"..."}'
   ```

3. **Update service to use env vars** (add to `app/services/google_analytics_service.rb`):
   ```ruby
   # In get_oauth_credentials method, before reading from file:
   if ENV['GOOGLE_OAUTH_CREDENTIALS_JSON'].present?
     # Use env var in production
   end
   ```

### Option 2: Deploy Credentials Files (Simpler for testing)

1. **Authorize locally:**
   ```bash
   rails analytics:authorize
   ```

2. **Deploy with credentials files:**
   - Add `config/google-oauth-credentials.json` to your repo temporarily
   - Add `config/analytics-tokens.yaml` to your repo temporarily
   - **After deployment**, remove them and add back to `.gitignore`

3. **Set environment variables:**
   ```bash
   GA4_PROPERTY_ID=468479218
   GOOGLE_OAUTH_CREDENTIALS=config/google-oauth-credentials.json
   ```

**Note:** Refresh tokens don't expire unless revoked, so once deployed, the app will continue working.

## Why This Is Better Than Service Accounts

✅ No need to manage service account permissions
✅ Uses your existing GA4 access
✅ Simpler setup (no IAM configuration)
✅ No account-level admin access needed
✅ Works immediately if you can view GA4 in browser

---

**Next Steps:** Just run `bundle install` and then `rails analytics:authorize`!

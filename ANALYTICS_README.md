# Google Analytics Integration

Live Google Analytics data for the Hevy Tracker page.

## Quick Reference

**Test locally:**
```bash
rails analytics:test
```

**Re-authorize (if token expires):**
```bash
rails analytics:revoke
rails analytics:authorize
```

**Extract credentials for production:**
```bash
./extract_credentials.sh
```

## Production Environment Variables (Render.com)

Required variables:
- `GA4_PROPERTY_ID=468479218`
- `GOOGLE_OAUTH_CLIENT_ID` (from google-oauth-credentials.json)
- `GOOGLE_OAUTH_CLIENT_SECRET` (from google-oauth-credentials.json)
- `GOOGLE_OAUTH_REFRESH_TOKEN` (from analytics-tokens.yaml)
- `GOOGLE_OAUTH_ACCESS_TOKEN` (from analytics-tokens.yaml)

## How It Works

1. **Service**: `app/services/google_analytics_service.rb` fetches data from GA4 API
2. **API Endpoint**: `/api/analytics/hevy-tracker` returns JSON stats
3. **Frontend**: `analytics_stats_controller.js` updates page on load
4. **Caching**: 5-minute cache to optimize API usage (50k requests/day limit)

## Metrics Tracked

- **Active Users**: Total users since Nov 19, 2024 (`totalUsers` metric)
- **Workspace Downloads**: FINISH_INSTALL events from GA4
- **Countries**: Total unique countries
- **Engagement Rate**: Rounded to whole number

## Files

**Backend:**
- `app/services/google_analytics_service.rb`
- `app/controllers/api/analytics_controller.rb`
- `lib/tasks/analytics.rake`

**Frontend:**
- `app/javascript/controllers/analytics_stats_controller.js`
- `app/javascript/controllers/counter_controller.js`

**Config:**
- `config/google-oauth-credentials.json` (gitignored)
- `config/analytics-tokens.yaml` (gitignored)
- `.env` - development environment variables (gitignored)

**Helpers:**
- `extract_credentials.sh` - Extract credentials for deployment

## Troubleshooting

**Stats not loading:**
- Check browser console for errors
- Verify environment variables are set in Render
- Check Rails logs for "Google Analytics API Error"

**Token expired:**
```bash
rails analytics:revoke
rails analytics:authorize
./extract_credentials.sh  # Get new credentials
# Update Render environment variables
```

**Clear cache:**
```ruby
Rails.cache.delete('hevy_tracker_analytics')
```

## API Endpoint

`GET /api/analytics/hevy-tracker`

Returns:
```json
{
  "active_users": 751,
  "install_count": 294,
  "countries": {
    "list": [{"name": "United States", "users": 291}, ...],
    "total": 68
  },
  "engagement_rate": 51
}
```

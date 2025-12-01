# IndexNow Configuration
#
# IndexNow is a protocol that allows website owners to instantly inform
# search engines (Bing, Yandex, Naver, Seznam.cz, Yep) about content changes.
#
# Configuration:
# - INDEXNOW_API_KEY: Your IndexNow API key (32-character hex string)
#   Generate with: rails indexnow:generate_key
#
# The key file must be accessible at: https://gelbhart.dev/{key}.txt
#
# See: https://www.indexnow.org/

# IndexNow is automatically configured via IndexNowService
# No additional configuration needed here unless you want to customize
# the service behavior (which should be done in the service class itself)

# GitHub OAuth Setup

The Sheen authentication system uses GitHub OAuth Device Flow for seamless authentication.

## Registered OAuth App

**Application Name:** Sheen  
**Client ID:** `Ov23liYMs1y0DwIIaJEH`  
**Owner:** ClaytonHunt  
**Repository:** https://github.com/ClaytonHunt/sheen  

## How It Works

When users run `sheen login github`, the authentication flow:

1. **Tries GitHub CLI first** - If you have `gh` CLI authenticated, it uses that token
2. **Falls back to OAuth Device Flow** - If no `gh` CLI token:
   - Requests a device code from GitHub
   - Shows a URL and user code
   - User visits the URL and enters the code
   - Polls GitHub for authorization
   - Stores the access token in `~/.sheen/auth.json`

## Testing Authentication

### With GitHub CLI (Easiest)
```bash
# Authenticate with gh CLI
gh auth login

# Login to sheen (will use gh token)
sheen login github

# Verify
sheen auth list
```

### With OAuth Device Flow
```bash
# If gh CLI is not available, sheen will prompt for OAuth
sheen login github

# Follow the instructions:
# 1. Visit the URL shown
# 2. Enter the code
# 3. Authorize the app
# 4. Wait for confirmation
```

### Manual Token
```bash
# Set environment variable
export GITHUB_TOKEN="your_token_here"

# Or add to config
echo '{"ai":{"provider":"github","apiKey":"your_token_here"}}' > .sheen/config.json
```

## Required Permissions

The OAuth app requests minimal permissions:
- `read:user` - Basic user information

**Note:** GitHub Models API doesn't require special scopes. Any authenticated GitHub token with basic read permissions can access the Models API.

## Token Storage

Tokens are stored in `~/.sheen/auth.json`:
```json
{
  "github": {
    "type": "oauth",
    "access": "gho_...",
    "expires": 0
  }
}
```

## OAuth App Management

To update the OAuth app settings:
1. Go to https://github.com/settings/developers
2. Find "Sheen" in your OAuth Apps
3. Update settings as needed

## Security Notes

- Tokens are stored locally in `~/.sheen/auth.json`
- File permissions should be restricted (600)
- Never commit `auth.json` to version control
- Tokens can be revoked at: https://github.com/settings/applications

## Troubleshooting

### "GitHub CLI not authenticated"
```bash
gh auth login
```

### "Authorization pending" (during OAuth)
- Make sure you've visited the URL and entered the code
- Check that you clicked "Authorize"

### "Device code expired"
- The code is only valid for 15 minutes
- Run `sheen login github` again to get a new code

### Token not working
```bash
# Logout and re-authenticate
sheen logout github
sheen login github
```

## For Contributors

If you're forking Sheen and want your own OAuth app:

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** Your App Name
   - **Homepage URL:** Your repo URL
   - **Authorization callback URL:** `http://localhost` (not used for device flow)
4. Copy the Client ID
5. Update `src/auth/github-oauth.ts`:
   ```typescript
   const GITHUB_CLIENT_ID = 'Your_Client_ID_Here';
   ```
6. Build and test:
   ```bash
   npm run build
   sheen login github
   ```

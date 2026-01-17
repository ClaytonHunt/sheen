/**
 * GitHub OAuth Device Flow
 * 
 * Implements GitHub's Device Flow for OAuth authentication
 * Used for CLI applications that can't redirect to a browser
 * 
 * Flow:
 * 1. Request device code
 * 2. Show user code and verification URL
 * 3. Poll for token
 * 4. Store token
 * 
 * Docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

import { logger } from '../utils/logger.js';

/**
 * GitHub OAuth App credentials
 * TODO: Register a Sheen OAuth app with GitHub and replace these
 */
const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98'; // Placeholder - needs to be replaced
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Device code response
 */
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/**
 * Access token response
 */
interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * Error response
 */
interface ErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * Initiate GitHub OAuth device flow
 * 
 * @returns Device code and user code for authentication
 */
export async function initiateDeviceFlow(): Promise<DeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user', // Minimal scope for now
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate device flow: ${response.statusText}`);
  }

  const data = await response.json() as DeviceCodeResponse;
  logger.debug('Device flow initiated', { user_code: data.user_code });
  
  return data;
}

/**
 * Poll for access token
 * 
 * @param deviceCode - Device code from initiation
 * @param interval - Polling interval in seconds
 * @param expiresIn - Expiration time in seconds
 * @returns Access token
 */
export async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<string> {
  const startTime = Date.now();
  const maxWaitTime = expiresIn * 1000; // Convert to milliseconds
  const pollInterval = interval * 1000; // Convert to milliseconds

  while (true) {
    // Check if we've exceeded the expiration time
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('Device code expired. Please try again.');
    }

    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // Poll for token
    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to poll for token: ${response.statusText}`);
    }

    const data = await response.json() as AccessTokenResponse | ErrorResponse;

    // Check for errors
    if ('error' in data) {
      if (data.error === 'authorization_pending') {
        // User hasn't authorized yet, continue polling
        logger.debug('Authorization pending, continuing to poll...');
        continue;
      } else if (data.error === 'slow_down') {
        // We're polling too fast, wait longer
        logger.debug('Slow down requested, increasing poll interval');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      } else if (data.error === 'expired_token') {
        throw new Error('Device code expired. Please try again.');
      } else if (data.error === 'access_denied') {
        throw new Error('Authorization was denied by the user.');
      } else {
        throw new Error(`OAuth error: ${data.error} - ${data.error_description || 'Unknown error'}`);
      }
    }

    // Success! Return the access token
    logger.debug('Access token received');
    return data.access_token;
  }
}

/**
 * Get token from GitHub CLI (gh)
 * 
 * @returns Access token from gh CLI
 */
export async function getGitHubCLIToken(): Promise<string | null> {
  const { spawn } = await import('child_process');
  
  return new Promise((resolve) => {
    const proc = spawn('gh', ['auth', 'token'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let token = '';
    
    proc.stdout.on('data', (data) => {
      token += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && token.trim()) {
        resolve(token.trim());
      } else {
        resolve(null);
      }
    });

    proc.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Complete GitHub OAuth device flow
 * 
 * @returns Access token
 */
export async function authenticateWithGitHub(): Promise<string> {
  // First, try to use GitHub CLI token
  console.log('\n🔐 GitHub Authentication\n');
  console.log('Checking for GitHub CLI (gh) authentication...\n');
  
  const cliToken = await getGitHubCLIToken();
  
  if (cliToken) {
    console.log('✓ Found GitHub CLI token!\n');
    console.log('Using existing gh authentication.\n');
    return cliToken;
  }

  console.log('GitHub CLI not authenticated.\n');
  console.log('Please authenticate with GitHub CLI first:');
  console.log('  gh auth login\n');
  console.log('Or set GITHUB_TOKEN environment variable.\n');
  
  throw new Error('GitHub authentication required. Run "gh auth login" first.');

  // NOTE: OAuth device flow requires a registered OAuth app
  // Keeping the code below for future use when we register an OAuth app
  
  // // Step 1: Initiate device flow
  // const deviceCode = await initiateDeviceFlow();

  // // Step 2: Show user code and verification URL
  // console.log('\n🔐 GitHub Authentication');
  // console.log('━'.repeat(50));
  // console.log(`\nPlease visit: ${deviceCode.verification_uri}`);
  // console.log(`\nEnter code: ${deviceCode.user_code}\n`);
  // console.log('Waiting for authorization...\n');

  // // Step 3: Poll for token
  // try {
  //   const accessToken = await pollForToken(
  //     deviceCode.device_code,
  //     deviceCode.interval,
  //     deviceCode.expires_in
  //   );
  //   
  //   return accessToken;
  // } catch (error: any) {
  //   logger.error('GitHub authentication failed', error);
  //   throw error;
  // }
}

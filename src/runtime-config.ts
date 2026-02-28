/**
 * Runtime configuration shared across server modes.
 * Values are initialized from environment variables and can be overridden
 * by the Smithery config payload at startup.
 */
export interface CredentialConfig {
  googleMapsApiKey: string;
  grabMapsApiKey: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
}

let runtimeConfig: CredentialConfig = {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  grabMapsApiKey: process.env.GRABMAPS_API_KEY || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-5',
};

export function getRuntimeConfig(): CredentialConfig {
  return runtimeConfig;
}

export function setRuntimeConfig(config: Partial<CredentialConfig>): void {
  runtimeConfig = {
    ...runtimeConfig,
    ...Object.fromEntries(
      Object.entries(config).filter(([, value]) => value !== undefined)
    ),
  };
}

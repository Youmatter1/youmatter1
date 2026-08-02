import { S3Client } from '@aws-sdk/client-s3';

// Fail fast with a specific message instead of letting the AWS SDK fail
// obscurely later when a required var is missing (e.g. set locally but not
// added to the deployment's environment on the hosting platform).
const REQUIRED_STORAGE_ENV_VARS = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] as const;
const missingStorageEnvVars = REQUIRED_STORAGE_ENV_VARS.filter((key) => !process.env[key]);
if (missingStorageEnvVars.length > 0) {
  console.error(`Missing required storage environment variable(s): ${missingStorageEnvVars.join(', ')}`);
}

// .trim() everything here: a stray leading/trailing space from copy-pasting a
// value into a hosting platform's env var dashboard (which happened with
// STORAGE_REGION in production) breaks the AWS SDK's endpoint/host
// construction in a way that fails before any network call is even made,
// surfacing as an opaque 500 with no indication of the real cause.
function trimmedEnv(key: string): string | undefined {
  const value = process.env[key];
  return value ? value.trim() : value;
}

// STORAGE_ENDPOINT should be the Supabase S3 endpoint:
// https://<project-ref>.supabase.co/storage/v1/s3
export const s3Client = new S3Client({
  forcePathStyle: true,
  region: trimmedEnv('STORAGE_REGION') || 'eu-central-1',
  endpoint: trimmedEnv('STORAGE_ENDPOINT'),
  credentials: {
    accessKeyId: trimmedEnv('STORAGE_ACCESS_KEY')!,
    secretAccessKey: trimmedEnv('STORAGE_SECRET_KEY')!,
  },
});

export const bucketName = trimmedEnv('STORAGE_BUCKET_NAME') || 'uploads';

// Public URL prefix for constructing file URLs after upload
// Format: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>
export const publicUrlPrefix = trimmedEnv('STORAGE_PUBLIC_URL');

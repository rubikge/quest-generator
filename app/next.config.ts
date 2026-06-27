import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genkit / firebase-admin are server-only; keep them external to the server bundle.
  serverExternalPackages: ['genkit', '@genkit-ai/google-genai', 'firebase-admin'],
};

export default nextConfig;

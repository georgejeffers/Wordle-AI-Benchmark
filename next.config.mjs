/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use webpack instead of Turbopack to avoid Bun regex compatibility issues
  experimental: {
    turbo: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude AI SDK packages from server-side bundling analysis
      config.externals = config.externals || []
      config.externals.push({
        'ai': 'commonjs ai',
        '@ai-sdk/openai': 'commonjs @ai-sdk/openai',
        '@ai-sdk/anthropic': 'commonjs @ai-sdk/anthropic',
        '@ai-sdk/groq': 'commonjs @ai-sdk/groq',
        '@ai-sdk/xai': 'commonjs @ai-sdk/xai',
        '@ai-sdk/google': 'commonjs @ai-sdk/google',
        '@ai-sdk/mistral': 'commonjs @ai-sdk/mistral',
        '@ai-sdk/openai-compatible': 'commonjs @ai-sdk/openai-compatible',
      })
    }
    return config
  },
}

export default nextConfig
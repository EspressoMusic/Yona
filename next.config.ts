import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack's serverless file tracing doesn't follow Prisma's dynamic
  // native-binary loading (it `path.join`s to the query engine at runtime,
  // which isn't statically analyzable). Force the whole generated client
  // folder — including the .so.node engine binaries — into every route's
  // deployment bundle.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;

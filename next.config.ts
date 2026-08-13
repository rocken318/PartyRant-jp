import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
// Cloudflare (OpenNext) local dev binding support.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);

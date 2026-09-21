import React from 'react';
import type { Metadata } from 'next';
import { Zen_Kaku_Gothic_New, Cormorant_Garamond, Shippori_Mincho } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { brandCssVars } from '@/lib/brands';
import { getBrandServer } from '@/lib/brand-server';
import { BrandProvider } from '@/lib/brand-context';
import { BrandPreviewSync } from '@/lib/brand-preview';
import './globals.css';

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-bebas',
  subsets: ['latin'],
  display: 'swap',
});

const shippori = Shippori_Mincho({
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm',
  subsets: ['latin'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandServer();
  const title = brand.club.includes(brand.name) ? brand.club : `${brand.club} ${brand.name}`;
  const description = '宴会・合コンを、みんなのスマホでもっと盛り上げる。リアルタイムのクイズ＆投票＆多数派ゲーム。';
  return {
    title,
    description,
    openGraph: { title, description, images: ['/icons/icon-512.png'] },
    icons: {
      icon: [
        { url: '/icons/icon.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/icons/icon-192.png',
    },
    manifest: '/manifest.json',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  const brand = await getBrandServer();

  return (
    <html
      lang="ja"
      className={`dark ${zenKaku.variable} ${cormorant.variable} ${shippori.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* 店ごとのテーマ（CSS変数）を注入。既定はキンギョ（globals.css）。 */}
        <style
          id="brand-theme"
          dangerouslySetInnerHTML={{ __html: `:root{${brandCssVars(brand)}}` }}
        />
      </head>
      <body className="kg-grain min-h-full flex flex-col pb-[env(safe-area-inset-bottom)]">
        <BrandProvider brand={brand}>
          <BrandPreviewSync />
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </BrandProvider>
      </body>
    </html>
  );
}

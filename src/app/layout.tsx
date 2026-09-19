import React from 'react';
import type { Metadata } from 'next';
import { Zen_Kaku_Gothic_New, Cormorant_Garamond, Shippori_Mincho } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
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

export const metadata: Metadata = {
  title: 'PartyRant',
  description: 'パーティーやイベントのためのリアルタイムクイズ＆投票',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

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
        <meta
          name="description"
          content="パーティーやイベントのためのリアルタイムクイズ＆投票"
        />
      </head>
      <body className="min-h-full flex flex-col pb-[env(safe-area-inset-bottom)]">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

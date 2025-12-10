import type { Metadata } from 'next'
import React from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GastroShop - Premium Gastronomy',
  description: 'Discover exceptional cheeses and delicacies from across Europe',
  keywords: 'cheese, delicatessen, gourmet, european, artisanal',
  authors: [{ name: 'GastroShop' }],
  openGraph: {
    title: 'GastroShop - Premium Gastronomy',
    description: 'Discover exceptional cheeses and delicacies from across Europe',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GastroShop - Premium Gastronomy',
    description: 'Discover exceptional cheeses and delicacies from across Europe',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
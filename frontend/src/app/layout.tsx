import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ScrollActivity } from '@/components/ui/scroll-activity';
import { getConfigValue } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const appName = getConfigValue('APP_NAME', 'VitaAI');

export const metadata: Metadata = {
  title: `${appName} - AI 简历工作台`,
  description: '面向中文求职场景的 AI 简历与模拟面试工作台',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ScrollActivity />
        {children}
      </body>
    </html>
  );
}

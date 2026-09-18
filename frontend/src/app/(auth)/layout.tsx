import { ThemeProvider } from '@/components/layout/theme-provider';
import { RuntimeConfigProvider } from '@/components/providers/runtime-config-provider';
import { AuthFrame } from '@/components/auth/auth-frame';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeConfigProvider appName={process.env.APP_NAME || 'VitaAI'}><ThemeProvider attribute="class" defaultTheme="light" enableSystem><AuthFrame>{children}</AuthFrame></ThemeProvider></RuntimeConfigProvider>;
}

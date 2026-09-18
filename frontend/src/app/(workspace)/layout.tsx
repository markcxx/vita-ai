import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AccountProvider } from '@/components/providers/account-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { RuntimeConfigProvider } from '@/components/providers/runtime-config-provider';
import { PreferencesProvider } from '@/components/providers/preferences-provider';
import { BrandProvider } from '@/components/layout/brand-provider';
import { getConfigValue } from '@/lib/config';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const appName = getConfigValue('APP_NAME', 'VitaAI');

  return (
    <RuntimeConfigProvider appName={appName}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <BrandProvider>
          <TooltipProvider>
            <AccountProvider userId={session.user.id} email={session.user.email}><PreferencesProvider>{children}</PreferencesProvider></AccountProvider>
            <Toaster />
          </TooltipProvider>
        </BrandProvider>
      </ThemeProvider>
    </RuntimeConfigProvider>
  );
}

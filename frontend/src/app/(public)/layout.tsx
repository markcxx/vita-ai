import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { RuntimeConfigProvider } from '@/components/providers/runtime-config-provider';
import { BrandProvider } from '@/components/layout/brand-provider';
import { getConfigValue } from '@/lib/config';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
            {children}
            <Toaster />
          </TooltipProvider>
        </BrandProvider>
      </ThemeProvider>
    </RuntimeConfigProvider>
  );
}

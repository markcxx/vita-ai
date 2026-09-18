import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell contentClassName="!p-0" immersive contentScrollable={false}>
      {children}
    </AppShell>
  );
}

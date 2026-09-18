import ChatApp from '@/components/chat/ChatApp';
import { AppShell } from '@/components/layout/app-shell';

export default function HomePage() {
  return (
    <AppShell contentClassName="overflow-hidden p-0 md:p-0" contentScrollable={false} showHeader={false}>
      <ChatApp />
    </AppShell>
  );
}

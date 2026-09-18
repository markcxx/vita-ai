import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
export default function Page() { return <Suspense fallback={<p>正在加载…</p>}><AuthForm mode="login" /></Suspense>; }

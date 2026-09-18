import { registrationRoute } from '@/lib/auth/registration';
export const runtime = 'nodejs';
export const POST = (request: Request) => registrationRoute(request, 'verify');

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPath = path.startsWith('/login') || path.startsWith('/signup');
  const isOnboardingPath = path.startsWith('/onboarding');
  const isPublic = isAuthPath || path === '/favicon.ico' || path.startsWith('/_next');

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isOnboardingPath && !isPublic) {
    const { data: profile } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile && path !== '/onboarding') {
      const onb = request.nextUrl.clone();
      onb.pathname = '/onboarding';
      return NextResponse.redirect(onb);
    }

    const role = (profile as { role?: string } | null)?.role;
    if (profile && role === 'salesperson') {
      const blocked = request.nextUrl.clone();
      blocked.pathname = '/blocked';
      return NextResponse.redirect(blocked);
    }
  }

  if (user && isAuthPath) {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const publicPaths = [
  '/',
  '/waitlist',
  '/api/waitlist',
]

const isPublicPath = (pathname: string) => {
  return publicPaths.some(publicPath => 
    pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow static files, API routes, and public paths
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/) ||
    isPublicPath(pathname)
  ) {
    return await updateSession(request)
  }
  
  // Redirect all other paths to home
  const url = request.nextUrl.clone()
  url.pathname = '/'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (static images)
     * - api/ (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
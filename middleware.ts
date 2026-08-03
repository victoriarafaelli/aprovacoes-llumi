import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATH_PREFIXES = [
  '/aprovar/',
  '/final/aprovar/',
  '/api/approve/',
  '/api/final-approve/',
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  return /\.[^/]+$/.test(pathname)
}

function requestLogin(request: NextRequest) {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
  }

  // Só abre a janela de login quando a pessoa navega diretamente
  // para uma página administrativa. Requisições automáticas recebem
  // apenas o erro 401, sem disparar o pop-up do navegador.
  if (request.headers.get('sec-fetch-mode') === 'navigate') {
    headers['WWW-Authenticate'] =
      'Basic realm="LLUMI Admin", charset="UTF-8"'
  }

  return new NextResponse('Autenticação administrativa necessária.', {
    status: 401,
    headers,
  })
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse(
      'A autenticação administrativa ainda não foi configurada.',
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Basic ')) {
    return requestLogin(request)
  }

  let decodedCredentials = ''

  try {
    decodedCredentials = atob(authorization.slice(6))
  } catch {
    return requestLogin(request)
  }

  const separatorIndex = decodedCredentials.indexOf(':')

  if (separatorIndex === -1) {
    return requestLogin(request)
  }

  const username = decodedCredentials.slice(0, separatorIndex)
  const password = decodedCredentials.slice(separatorIndex + 1)

  if (username !== expectedUsername || password !== expectedPassword) {
    return requestLogin(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

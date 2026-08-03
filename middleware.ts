import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATH_PREFIXES = [
  '/aprovar/',
  '/final/aprovar/',
  '/api/approve/',
  '/api/final-approve/',
]

function isPublicPath(pathname: string) {
  // Links usados pelos clientes
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  // Arquivos públicos, como ícones e imagens
  return /\.[^/]+$/.test(pathname)
}

function requestLogin() {
  return new NextResponse('Autenticação administrativa necessária.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="LLUMI Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD

  // Falha fechada: sem credenciais configuradas, o administrativo não abre.
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
    return requestLogin()
  }

  let decodedCredentials = ''

  try {
    decodedCredentials = atob(authorization.slice(6))
  } catch {
    return requestLogin()
  }

  const separatorIndex = decodedCredentials.indexOf(':')

  if (separatorIndex === -1) {
    return requestLogin()
  }

  const username = decodedCredentials.slice(0, separatorIndex)
  const password = decodedCredentials.slice(separatorIndex + 1)

  if (username !== expectedUsername || password !== expectedPassword) {
    return requestLogin()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

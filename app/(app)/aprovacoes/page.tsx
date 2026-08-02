import Link from 'next/link'

type ApprovalFlow = {
  title: string
  description: string
  listHref: string
  listLabel: string
  createHref: string
  createLabel: string
}

const FLOWS: ApprovalFlow[] = [
  {
    title: 'Primeira Aprovação',
    description:
      'Planejamentos de conteúdo em texto, enviados ao cliente para aprovação inicial.',
    listHref: '/',
    listLabel: 'Ver planejamentos',
    createHref: '/criar',
    createLabel: 'Criar novo',
  },
  {
    title: 'Aprovação Final',
    description:
      'Conteúdos finalizados com mídia, enviados ao cliente para aprovação antes da publicação.',
    listHref: '/final',
    listLabel: 'Ver aprovações finais',
    createHref: '/final/criar',
    createLabel: 'Criar nova',
  },
]

export default function AprovacoesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-gray-900">Aprovações</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Escolha o fluxo de aprovação que deseja gerenciar
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLOWS.map((flow) => (
          <div
            key={flow.title}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4"
          >
            <div>
              <h2 className="font-bold text-gray-900">{flow.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{flow.description}</p>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <Link
                href={flow.listHref}
                className="text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {flow.listLabel}
              </Link>
              <Link
                href={flow.createHref}
                className="text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {flow.createLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

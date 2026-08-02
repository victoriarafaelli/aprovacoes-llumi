import Sidebar from '@/components/Sidebar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="md:flex md:h-screen">
      <Sidebar />
      <main className="flex-1 md:h-screen md:overflow-y-auto">{children}</main>
    </div>
  )
}

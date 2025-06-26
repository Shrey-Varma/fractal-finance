export const metadata = {
  title: 'Fractal - Dashboard',
  description: 'Personal Finance Dashboard',
  icons: {
    icon: '/assets/favicon.png',
  },
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

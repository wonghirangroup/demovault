import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '🔐 Demo Vault — WH Group',
  description: 'Project demo credentials & URLs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  title: 'lacura | Private Chef Service for Healing & Wellness',
  description: "lacura offers personalized, healing-focused meals designed to support health and vitality, made with fresh herbs, healing spices, and heart.",
  icons: {
    icon: '/favicon-lacura.svg'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin: 0 }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'saturate(180%) blur(6px)', borderBottom: '1px solid #eee' }}>
          <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="#top" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/logo-lacura.svg" alt="lacura" style={{ height: 64, width: 'auto', display: 'block' }} />
            </a>
            <nav style={{ display: 'flex', gap: 20 }}>
              <a href="#journey" style={{ color: '#444', textDecoration: 'none' }}>Your Journey</a>
              <a href="#story" style={{ color: '#444', textDecoration: 'none' }}>Our Story</a>
              <a href="#contact" style={{ color: '#444', textDecoration: 'none' }}>Get in Touch</a>
            </nav>
          </div>
        </header>
        {children}
        <footer style={{ borderTop: '1px solid #eee', marginTop: 48 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', color: '#777', fontSize: 14, textAlign: 'center' }}>
            © {new Date().getFullYear()} lacura. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}



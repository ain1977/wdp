export const metadata = {
  title: 'lacura',
  description: 'Because caring for yourself starts at the table'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin: 0 }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'saturate(180%) blur(6px)', borderBottom: '1px solid #eee' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#111', marginRight: 10 }} />
              <span style={{ fontWeight: 700, color: '#111', letterSpacing: 0.3, textTransform: 'lowercase' }}>lacura</span>
            </a>
            <nav style={{ display: 'flex', gap: 20 }}>
              <a href="#story" style={{ color: '#444', textDecoration: 'none' }}>Our Story</a>
              <a href="#journey" style={{ color: '#444', textDecoration: 'none' }}>Your Journey</a>
              <a href="#contact" style={{ color: '#444', textDecoration: 'none' }}>Get in Touch</a>
            </nav>
          </div>
        </header>
        {children}
        <footer style={{ borderTop: '1px solid #eee', marginTop: 48 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', color: '#777', fontSize: 14 }}>
            © {new Date().getFullYear()} Wellness — All rights reserved
          </div>
        </footer>
      </body>
    </html>
  )
}



'use client'

const bookingsUrl = process.env.NEXT_PUBLIC_BOOKINGS_URL

export default function Home() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 48, marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Your Complete Digital Wellness Platform
        </h1>
        <p style={{ fontSize: 20, color: '#666', maxWidth: 600, margin: '0 auto' }}>
          We handle all the tech so you can focus on what you do best - helping people heal and thrive.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
        <div style={{ padding: 24, border: '1px solid #e0e0e0', borderRadius: 12, background: '#fafafa' }}>
          <h3 style={{ fontSize: 20, marginBottom: 12, color: '#333' }}>📅 Smart Booking System</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>Automated scheduling with Microsoft 365 integration, reminders, and follow-ups.</p>
          {bookingsUrl ? (
            <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
              <iframe
                title="Bookings"
                src={bookingsUrl}
                style={{ width: '100%', height: 400, border: 'none', borderRadius: 4 }}
              />
            </div>
          ) : (
            <div style={{ padding: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 14 }}>Configure your Microsoft Bookings URL to enable scheduling</p>
            </div>
          )}
        </div>

        <div style={{ padding: 24, border: '1px solid #e0e0e0', borderRadius: 12, background: '#fafafa' }}>
          <h3 style={{ fontSize: 20, marginBottom: 12, color: '#333' }}>🤖 AI Assistant</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>24/7 client support, appointment management, and practice information.</p>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: '8px 12px', background: '#f0f0f0', borderRadius: 16, fontSize: 14 }}>
                "Book me a consultation next Tuesday"
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <div style={{ padding: '8px 12px', background: '#e3f2fd', borderRadius: 16, fontSize: 14 }}>
                "I'll check your availability and book that for you!"
              </div>
            </div>
            <a href="/chat" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: '#667eea', color: 'white', textDecoration: 'none', borderRadius: 6, fontSize: 14 }}>
              Try AI Assistant →
            </a>
          </div>
        </div>

        <div style={{ padding: 24, border: '1px solid #e0e0e0', borderRadius: 12, background: '#fafafa' }}>
          <h3 style={{ fontSize: 20, marginBottom: 12, color: '#333' }}>📧 Automated Marketing</h3>
          <p style={{ color: '#666', marginBottom: 16 }}>Newsletter management, social media automation, and client nurture sequences.</p>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Substack Integration</div>
              <div style={{ fontSize: 12, color: '#666' }}>Auto-sync newsletter content</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Social Media</div>
              <div style={{ fontSize: 12, color: '#666' }}>LinkedIn, Instagram, Twitter automation</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Email Sequences</div>
              <div style={{ fontSize: 12, color: '#666' }}>Welcome series, follow-ups, nurture campaigns</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 48, borderRadius: 16, color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>Fully Managed Digital Presence</h2>
        <p style={{ fontSize: 18, marginBottom: 24, opacity: 0.9 }}>
          We handle everything tech so you can focus on your practice. No learning curves, no maintenance, no headaches.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginTop: 32 }}>
          <div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Setup in 24 Hours</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>Complete digital presence ready to go</div>
          </div>
          <div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Enterprise Security</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>HIPAA-ready, dedicated Azure environment</div>
          </div>
          <div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📈</div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Grow Your Practice</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>Automated marketing and client management</div>
          </div>
        </div>
      </div>
    </main>
  )
}



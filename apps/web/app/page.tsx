'use client'

const bookingsUrl = process.env.NEXT_PUBLIC_BOOKINGS_URL

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
        <div style={{ fontWeight: 700, letterSpacing: 2, textTransform: 'lowercase', color: '#111', marginBottom: 8 }}>lacura</div>
        <h1 style={{ fontSize: 48, lineHeight: 1.15, margin: 0, color: '#111' }}>Your Journey Our Story</h1>
        <p style={{ marginTop: 8, color: '#555' }}>Because caring for yourself starts at the table</p>
        <div style={{ marginTop: 16 }}>
          <a href="#contact" style={{ display: 'inline-block', padding: '12px 18px', background: '#111', color: 'white', textDecoration: 'none', borderRadius: 8 }}>Get Started</a>
        </div>
        <div style={{ marginTop: 16, color: '#999' }}>↓</div>
      </section>

      {/* Our Story */}
      <section id="story" style={{ maxWidth: 760, margin: '0 auto 40px' }}>
        <h2 style={{ fontSize: 28, marginBottom: 12 }}>Our Story</h2>
        <p style={{ color: '#444', lineHeight: 1.7 }}>
          At La Cura, we believe care begins at the table.
        </p>
        <p style={{ color: '#444', lineHeight: 1.7 }}>
          Food isn't just fuel, it's medicine, comfort, and connection. It can calm inflammation, restore balance, and bring joy back to your body and mind.
        </p>
        <p style={{ color: '#444', lineHeight: 1.7 }}>
          Each dish is grounded in the wisdom of Italian home cooking and the science of anti-inflammatory foods, herbs, and spices—nature's quiet healers.
        </p>
      </section>

      {/* Journey */}
      <section id="journey" style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 28, marginBottom: 16 }}>Your Journey to Wellness</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { n: '01', t: 'Discovery', d: 'We begin with a personal assessment to understand your goals, health needs, and taste preferences.' },
            { n: '02', t: 'Sourcing with Care', d: 'We shop from local farms, organic markets, and our own garden of healing herbs.' },
            { n: '03', t: 'Cooking in Your Kitchen', d: 'We prepare fresh, nourishing meals right in your home, crafted for three days of ease and balance.' },
            { n: '04', t: 'Continuous Care', d: 'We listen, adjust, and evolve your menu as your needs and goals change.' }
          ].map((s) => (
            <div key={s.n} style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, background: '#fafafa' }}>
              <div style={{ fontSize: 14, color: '#999', marginBottom: 6 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, margin: '0 0 6px' }}>{s.t}</h3>
              <p style={{ color: '#555', margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <a href="#contact" style={{ padding: '10px 16px', background: '#111', color: 'white', textDecoration: 'none', borderRadius: 8 }}>Feel Better Again</a>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ marginTop: 40, marginBottom: 40 }}>
        <h2 style={{ fontSize: 28, marginBottom: 12 }}>Get in Touch</h2>
        <p style={{ color: '#555', marginBottom: 16 }}>Ready to start your journey to wellness? Send us a message and we'll get back to you soon.</p>
        <form action="#" style={{ display: 'grid', gap: 12, maxWidth: 560 }} onSubmit={(e)=>e.preventDefault()}>
          <input placeholder="Your name" style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          <input placeholder="Email" type="email" style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          <textarea placeholder="How can we help?" rows={4} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          <button style={{ padding: '12px 16px', borderRadius: 8, background: '#111', color: 'white', border: 'none', cursor: 'pointer' }}>Send Message</button>
        </form>
      </section>
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



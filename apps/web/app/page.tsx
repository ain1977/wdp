'use client'
import { useState } from 'react'

const bookingsUrl = process.env.NEXT_PUBLIC_BOOKINGS_URL
const FUNCTIONS_BASE = 'https://func-xob7nugiarm7e.azurewebsites.net'

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

      <AssistantWidget />
    </main>
  )
}

function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user'|'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hi! I can help with questions and scheduling. How can I help today?' }
  ])

  async function send() {
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/api/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] })
      })
      const data = await res.json().catch(() => ({}))
      const reply = data?.message?.content || 'Sorry, something went wrong.'
      setMessages((m) => [...m, { role: 'assistant', content: String(reply) }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60 }}>
      {open && (
        <div style={{
          width: 340,
          height: 440,
          background: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginBottom: 12
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600 }}>AI Assistant</div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: m.role === 'user' ? '#111' : '#f3f3f3',
                  color: m.role === 'user' ? 'white' : '#222',
                  fontSize: 14
                }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ color: '#666', fontSize: 13 }}>Thinking…</div>}
          </div>
          <div style={{ padding: 10, borderTop: '1px solid #eee' }}>
            <form onSubmit={(e)=>{e.preventDefault(); send()}} style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={(e)=>setInput(e.target.value)}
                placeholder="Ask about availability, rescheduling, or services…"
                style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              />
              <button disabled={loading} style={{ padding: '10px 12px', background: '#111', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Send</button>
            </form>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(!open)} style={{
        width: 56, height: 56, borderRadius: 999,
        background: '#111', color: 'white',
        border: 'none', cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,0.18)'
      }}>💬</button>
    </div>
  )
}



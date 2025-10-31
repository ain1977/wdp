'use client'
import { useState } from 'react'
 

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section id="top" style={{ position: 'relative', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src="/chef-illustration.png" alt="lacura" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,62,80,0.4)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white', padding: 20 }}>
          <p style={{ fontSize: 24, fontWeight: 700, textShadow: '2px 2px 8px rgba(0,0,0,0.6)', marginBottom: 20 }}>Healing begins in the gut. La Cura makes it delicious.</p>
          <a href="#contact" style={{ display: 'inline-block', padding: '14px 24px', borderRadius: 999, background: '#2c3e50', color: 'white', textDecoration: 'none', boxShadow: '0 8px 20px rgba(44,62,80,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Get Started</a>
        </div>
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: 28, opacity: 0.9 }}>↓</div>
      </section>
      <AssistantWidget />
    </>
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
      const res = await fetch(`/api/chat/ask`, {
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
 



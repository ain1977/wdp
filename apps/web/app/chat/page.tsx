'use client'

import { useState } from 'react'

type Msg = { role: 'user' | 'assistant', content: string }

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!input.trim()) return
    const next = [...messages, { role: 'user', content: input } as Msg]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next })
      })
      const data = await res.json()
      if (data?.message) setMessages([...next, data.message])
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>AI Assistant (stub)</h1>
      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minHeight: 280 }}>
        {messages.length === 0 && (
          <p style={{ color: '#777' }}>Ask about services or booking. This is a placeholder.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0' }}>
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type your question..."
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button disabled={busy} onClick={send} style={{ padding: '10px 14px', borderRadius: 6 }}>
          {busy ? 'Sending...' : 'Send'}
        </button>
      </div>
    </main>
  )
}



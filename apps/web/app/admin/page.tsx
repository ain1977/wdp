'use client'

import { useState } from 'react'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [substackConfig, setSubstackConfig] = useState({
    apiKey: '',
    publicationId: '',
    connected: false
  })

  const [contentSettings, setContentSettings] = useState({
    practiceType: 'Wellness Coaching',
    targetAudience: 'busy professionals',
    tone: 'friendly',
    topics: ['stress management', 'work-life balance', 'mindfulness']
  })

  const generateContent = async (type: string) => {
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          topic: contentSettings.topics[0],
          tone: contentSettings.tone,
          practiceType: contentSettings.practiceType,
          targetAudience: contentSettings.targetAudience
        })
      })
      const data = await response.json()
      console.log('Generated content:', data)
      // In a real app, you'd show this in a modal or dedicated area
      alert('Content generated! Check console for details.')
    } catch (error) {
      console.error('Content generation failed:', error)
    }
  }

  const syncSubstack = async () => {
    try {
      const response = await fetch('/api/substack/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_newsletter',
          substackApiKey: substackConfig.apiKey,
          publicationId: substackConfig.publicationId
        })
      })
      const data = await response.json()
      console.log('Substack sync:', data)
      alert('Newsletter synced! Check console for details.')
    } catch (error) {
      console.error('Substack sync failed:', error)
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Practice Management Dashboard</h1>
      
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, borderBottom: '1px solid #e0e0e0' }}>
        {['overview', 'content', 'substack', 'analytics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab ? '#667eea' : 'transparent',
              color: activeTab === tab ? 'white' : '#666',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Practice Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div style={{ padding: 20, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>This Week's Bookings</h3>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#667eea' }}>12</div>
              <div style={{ fontSize: 14, color: '#666' }}>+3 from last week</div>
            </div>
            <div style={{ padding: 20, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>AI Conversations</h3>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#667eea' }}>47</div>
              <div style={{ fontSize: 14, color: '#666' }}>This week</div>
            </div>
            <div style={{ padding: 20, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Newsletter Subscribers</h3>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#667eea' }}>234</div>
              <div style={{ fontSize: 14, color: '#666' }}>+12 this week</div>
            </div>
            <div style={{ padding: 20, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Social Media Reach</h3>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#667eea' }}>1.2K</div>
              <div style={{ fontSize: 14, color: '#666' }}>This month</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Content Generation</h2>
          
          <div style={{ marginBottom: 24, padding: 20, border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Practice Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Practice Type</label>
                <input
                  value={contentSettings.practiceType}
                  onChange={e => setContentSettings({...contentSettings, practiceType: e.target.value})}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Target Audience</label>
                <input
                  value={contentSettings.targetAudience}
                  onChange={e => setContentSettings({...contentSettings, targetAudience: e.target.value})}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Tone</label>
                <select
                  value={contentSettings.tone}
                  onChange={e => setContentSettings({...contentSettings, tone: e.target.value})}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <button
              onClick={() => generateContent('social_post')}
              style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>📱</div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Social Media Posts</div>
              <div style={{ fontSize: 14, color: '#666' }}>LinkedIn, Instagram, Twitter</div>
            </button>
            
            <button
              onClick={() => generateContent('newsletter')}
              style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>📧</div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Newsletter Content</div>
              <div style={{ fontSize: 14, color: '#666' }}>Weekly newsletter articles</div>
            </button>
            
            <button
              onClick={() => generateContent('email_sequence')}
              style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>🔄</div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Email Sequences</div>
              <div style={{ fontSize: 14, color: '#666' }}>Welcome series, follow-ups</div>
            </button>
            
            <button
              onClick={() => generateContent('blog_post')}
              style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 18, marginBottom: 8 }}>📝</div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Blog Posts</div>
              <div style={{ fontSize: 14, color: '#666' }}>SEO-optimized articles</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'substack' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Substack Integration</h2>
          
          <div style={{ marginBottom: 24, padding: 20, border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Connection Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Substack API Key</label>
                <input
                  type="password"
                  value={substackConfig.apiKey}
                  onChange={e => setSubstackConfig({...substackConfig, apiKey: e.target.value})}
                  placeholder="Enter your Substack API key"
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Publication ID</label>
                <input
                  value={substackConfig.publicationId}
                  onChange={e => setSubstackConfig({...substackConfig, publicationId: e.target.value})}
                  placeholder="Enter your publication ID"
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
            </div>
            <button
              onClick={() => setSubstackConfig({...substackConfig, connected: true})}
              style={{ marginTop: 16, padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Connect Substack
            </button>
          </div>

          {substackConfig.connected && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <button
                onClick={() => syncSubstack()}
                style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>🔄</div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Sync Newsletter</div>
                <div style={{ fontSize: 14, color: '#666' }}>Pull latest posts and generate social content</div>
              </button>
              
              <button
                onClick={() => generateContent('newsletter')}
                style={{ padding: 16, border: '1px solid #667eea', background: 'white', borderRadius: 8, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>✍️</div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Create New Post</div>
                <div style={{ fontSize: 14, color: '#666' }}>Generate and publish to Substack</div>
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Analytics & Insights</h2>
          <div style={{ padding: 40, textAlign: 'center', border: '2px dashed #ccc', borderRadius: 8 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ margin: '0 0 8px 0' }}>Analytics Dashboard</h3>
            <p style={{ color: '#666', margin: 0 }}>Coming soon - detailed analytics and insights for your practice</p>
          </div>
        </div>
      )}
    </main>
  )
}

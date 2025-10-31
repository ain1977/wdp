'use client'

import { useState } from 'react'

function AIAssistantConfig() {
  const [config, setConfig] = useState({
    systemPrompt: 'You are Your Gut Assistant, a helpful assistant for La Cura, a personal chef service focused on healing and wellness through Mediterranean nutrition. You are warm, knowledgeable, and supportive. Help users with questions about services, bookings, nutrition, and wellness. Be concise and friendly.',
    tone: 'warm, supportive, knowledgeable'
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Note: This would typically save to environment variables or a config store
    // For now, we'll show a message - in production, you'd call an API endpoint
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    console.log('Your Gut Assistant Config:', config)
    alert('Note: This configuration needs to be set as environment variables in Azure Functions:\n\nAI_ASSISTANT_SYSTEM_PROMPT\nAI_ASSISTANT_TONE\n\nCurrent values logged to console.')
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
          System Prompt (Personality & Instructions)
        </label>
        <textarea
          value={config.systemPrompt}
          onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
          rows={6}
          placeholder="Define Your Gut Assistant's role, personality, and behavior..."
          style={{
            width: '100%',
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          This defines who the assistant is and how it should behave
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
          Tone
        </label>
        <input
          type="text"
          value={config.tone}
          onChange={e => setConfig({ ...config, tone: e.target.value })}
          placeholder="e.g., warm, supportive, knowledgeable"
          style={{
            width: '100%',
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 14
          }}
        />
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Describe the communication style (e.g., "warm, professional, concise")
        </div>
      </div>

      {saved && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          marginBottom: 16
        }}>
          Configuration saved (check console for values)
        </div>
      )}

      <button
        onClick={handleSave}
        style={{
          padding: '12px 24px',
          background: '#2c3e50',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Save Configuration
      </button>

      <div style={{ marginTop: 24, padding: 16, background: '#fff3cd', borderRadius: 8, fontSize: 13, color: '#856404' }}>
        <strong>⚠️ Note:</strong> To apply these settings, you need to set them as environment variables in your Azure Functions app settings:
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          <li><code>AI_ASSISTANT_SYSTEM_PROMPT</code> = {config.systemPrompt.slice(0, 50)}...</li>
          <li><code>AI_ASSISTANT_TONE</code> = {config.tone}</li>
        </ul>
      </div>
    </div>
  )
}

function SearchUploadForm() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    source: 'manual',
    id: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim()) {
      setResult({ success: false, message: 'Content is required' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const payload = formData.id
        ? {
            documents: [{
              id: formData.id,
              title: formData.title || undefined,
              content: formData.content,
              source: formData.source || 'manual'
            }]
          }
        : {
            text: formData.content,
            title: formData.title || undefined,
            source: formData.source || 'manual'
          }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ 
          success: true, 
          message: `Successfully uploaded ${data.upserted || 1} document(s) to Azure Search` 
        })
        setFormData({ title: '', content: '', source: 'manual', id: '' })
      } else {
        setResult({ success: false, message: data.error || 'Upload failed' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
            Title (optional)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Services Overview, FAQ, About Us"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
            Content *
          </label>
          <textarea
            value={formData.content}
            onChange={e => setFormData({ ...formData, content: e.target.value })}
            placeholder="Enter the content you want to index in Azure Search. This will be searchable by Your Gut Assistant."
            rows={12}
            required
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {formData.content.length} characters (max 8000)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Source (optional)
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={e => setFormData({ ...formData, source: e.target.value })}
              placeholder="e.g., website, manual, faq"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Document ID (optional)
            </label>
            <input
              type="text"
              value={formData.id}
              onChange={e => setFormData({ ...formData, id: e.target.value })}
              placeholder="Leave empty for auto-generated"
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14
              }}
            />
          </div>
        </div>

        {result && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: result.success ? '#d4edda' : '#f8d7da',
            color: result.success ? '#155724' : '#721c24',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !formData.content.trim()}
          style={{
            padding: '14px 24px',
            background: loading ? '#ccc' : '#2c3e50',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start'
          }}
        >
          {loading ? 'Uploading...' : 'Upload to Azure Search'}
        </button>
      </form>

      <div style={{ marginTop: 32, padding: 20, background: '#f8f9fa', borderRadius: 8, fontSize: 14, color: '#666' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>💡 Tips</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Content will be searchable by Your Gut Assistant on your website</li>
          <li>Keep content focused and well-structured for better search results</li>
          <li>You can upload multiple documents by submitting the form multiple times</li>
          <li>Document IDs are auto-generated if not provided</li>
        </ul>
      </div>
    </div>
  )
}

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
        {['overview', 'content', 'search', 'substack', 'analytics'].map(tab => (
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

      {activeTab === 'search' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 24 }}>Azure Search Content Upload</h2>
          <SearchUploadForm />
          
          <div style={{ marginTop: 48, padding: 24, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f9f9f9' }}>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Your Gut Assistant Configuration</h3>
            <AIAssistantConfig />
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

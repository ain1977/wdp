'use client'

import { useState } from 'react'

function AIAssistantConfig() {
  const [tone, setTone] = useState('warm, supportive, knowledgeable')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!tone.trim()) {
      alert('Tone cannot be empty')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    
    // Log the value to set in Azure
    console.log('AI_ASSISTANT_TONE =', tone)
    alert(`Tone updated! Set this value in Azure Functions:\n\nAI_ASSISTANT_TONE = ${tone}\n\nCheck console for the exact value.`)
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
          Tone
        </label>
        <input
          type="text"
          value={tone}
          onChange={e => setTone(e.target.value)}
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
          Describe the communication style. This will fully replace the current tone value.
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
          Tone updated! Set <code>AI_ASSISTANT_TONE</code> in Azure Functions with the value shown above.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!tone.trim()}
        style={{
          padding: '12px 24px',
          background: tone.trim() ? '#2c3e50' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: tone.trim() ? 'pointer' : 'not-allowed'
        }}
      >
        Update Tone
      </button>

      <div style={{ marginTop: 24, padding: 16, background: '#fff3cd', borderRadius: 8, fontSize: 13, color: '#856404' }}>
        <strong>⚠️ Note:</strong> Set this environment variable in Azure Functions app settings:
        <div style={{ marginTop: 8, padding: 8, background: 'white', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
          AI_ASSISTANT_TONE = {tone || 'warm, supportive, knowledgeable'}
        </div>
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
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Auto-fill title from filename if not set
      if (!formData.title && selectedFile.name) {
        setFormData({ ...formData, title: selectedFile.name.replace(/\.[^/.]+$/, '') })
      }
      // Read file content
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setFormData({ ...formData, content: text })
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim() && !file) {
      setResult({ success: false, message: 'Content or file is required' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      let contentToUpload = formData.content
      
      // If file is selected and content is empty, read from file
      if (file && !contentToUpload.trim()) {
        contentToUpload = await file.text()
      }

      const payload = formData.id
        ? {
            documents: [{
              id: formData.id,
              title: formData.title || file?.name?.replace(/\.[^/.]+$/, '') || undefined,
              content: contentToUpload,
              source: formData.source || 'manual'
            }]
          }
        : {
            text: contentToUpload,
            title: formData.title || file?.name?.replace(/\.[^/.]+$/, '') || undefined,
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
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
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
            Upload Document (optional)
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept=".txt,.md,.json,.csv"
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14
            }}
          />
          {file && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Upload a text file (.txt, .md, .json, .csv) - content will be extracted automatically
          </div>
        </div>

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
  const [activeTab, setActiveTab] = useState('tone')

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Practice Management Dashboard</h1>
      
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, borderBottom: '1px solid #e0e0e0' }}>
        {['tone', 'search'].map(tab => (
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

      {activeTab === 'tone' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 24 }}>Your Gut Assistant Tone Settings</h2>
          <AIAssistantConfig />
        </div>
      )}

      {activeTab === 'search' && (
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 24 }}>Azure Search Content Upload</h2>
          <SearchUploadForm />
        </div>
      )}
    </main>
  )
}

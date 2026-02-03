import React, { useState } from 'react'
import api from '../services/api'

export default function AI(){
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim()) return
    const msg = { id: Date.now(), from: 'user', text: input }
    setMessages(prev => [...prev, msg])
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await api.gemini({ prompt: input })
      if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
      const aiText = (data?.candidates?.[0]?.content?.parts?.[0]?.text) || JSON.stringify(data).slice(0, 300)
      setMessages(prev => [...prev, { id: Date.now()+1, from: 'ai', text: aiText }])
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now()+1, from: 'error', text: e.message || 'AI service error' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="ai" className="py-5">
      <div className="container">
        <h1>AI Page</h1>
        <h2 className="mb-4">AI Assistant</h2>
        <div className="chat-wrap d-flex flex-column flex-lg-row gap-3">
          <aside className="chat-sidebar col-lg-4 p-3 bg-light rounded">
            <h5 className="mb-3">AgriGuide</h5>
            <p className="small text-muted">Ask about crops, diseases, and weather-driven advice.</p>
            <div className="mt-3">
              <button className="btn btn-outline-secondary w-100 mb-2" onClick={() => { setMessages([]) }}>Clear</button>
            </div>
          </aside>

          <div className="chat-main flex-fill d-flex flex-column p-3 bg-white rounded shadow-sm">
            <div className="messages flex-fill overflow-auto mb-3" style={{minHeight: '220px'}}>
              {messages.length === 0 && <div className="text-muted">No messages yet — ask something!</div>}
              {messages.map(m => (
                <div key={m.id} className={`mb-2 d-flex ${m.from==='user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded ${m.from==='user' ? 'bg-success text-white' : m.from==='ai' ? 'bg-light text-dark' : 'bg-warning text-dark'}`} style={{maxWidth:'78%'}}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="input-row d-flex gap-2">
              <input aria-label="Chat input" className="form-control" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter') send() }} placeholder="Ask AgriGuide..." />
              <button className="btn btn-success" onClick={send} disabled={loading}>{loading ? '...' : 'Send'}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

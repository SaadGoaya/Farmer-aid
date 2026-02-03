import React, { useState } from 'react'
import api from '../services/api'

export default function Diseases(){
  const [fileData, setFileData] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function toDataURL(file){
    return new Promise((res, rej)=>{
      const reader = new FileReader()
      reader.onload = ()=>res(reader.result)
      reader.onerror = rej
      reader.readAsDataURL(file)
    })
  }

  const handleFile = async (e) => {
    const f = e.target.files && e.target.files[0]
    if(!f) return
    setFileData(f)
    setResult(null)
  }

  const send = async () => {
    setError(null); setLoading(true); setResult(null)
    try{
      let dataUrl = typeof fileData === 'string' ? fileData : await toDataURL(fileData)
      const prompt = `Analyze this plant image. Respond with JSON: {\n  \"disease\": ...,\n  \"severity\": ...,\n  \"treatment\": ...,\n  \"nutrientWater\": ...,\n  \"additionalAdvice\": ...\n}\n\nImage:\n${dataUrl}`
      const { data: body, error } = await api.gemini({ prompt })
      if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error))
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(body)
      // attempt parse
      try{
        const m = text.match(/\{[\s\S]*\}/)
        if(m) setResult(JSON.parse(m[0]))
        else setResult({ raw: text })
      }catch(e){ setResult({ raw: text }) }
    }catch(e){ setError(e.message) }
    setLoading(false)
  }

  return (
    <section id="diseases" className="py-5">
      <div className="container">
        <h2 className="mb-4">Plant Disease Diagnosis</h2>
        <div className="mb-3">
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>
        <div className="mb-3">
          <button className="btn btn-success" onClick={send} disabled={!fileData || loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {result && (
          <div className="card p-3">
            {result.disease && <div><strong>Disease:</strong> {result.disease}</div>}
            {result.severity && <div><strong>Severity:</strong> {result.severity}</div>}
            {result.treatment && <div><strong>Treatment:</strong> {result.treatment}</div>}
            {result.nutrientWater && <div><strong>Nutrient/Water:</strong> {result.nutrientWater}</div>}
            {result.additionalAdvice && <div><strong>Advice:</strong> {result.additionalAdvice}</div>}
            {result.raw && <pre className="mt-2 small">{result.raw}</pre>}
          </div>
        )}
      </div>
    </section>
  )
}

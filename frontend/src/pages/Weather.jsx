import React, { useState } from 'react'
import api from '../services/api'
import TempChart from '../components/TempChart'

function mapWeather(code){
  const map = {0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Overcast'}
  return map[code] || 'Unknown'
}

export default function Weather(){
  const [city, setCity] = useState('Lahore')
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(null)

  const lookup = async () => {
    setError(null); setLoading(true)
    try{
      const { data: gd, error: gError } = await api.geocode({ name: city, count: 1, language: 'en' })
      if (gError) throw new Error(typeof gError === 'string' ? gError : JSON.stringify(gError))
      const r = gd.results && gd.results[0]
      if(!r) throw new Error('Location not found')
      const lat = r.latitude; const lon = r.longitude
      const { data: wd, error: wError } = await api.weather({ latitude: lat, longitude: lon })
      if (wError) throw new Error(typeof wError === 'string' ? wError : JSON.stringify(wError))
      setWeather({location: r.name, current: wd.current_weather, daily: wd.daily})
    }catch(e){
      setError(e.message)
    }finally{ setLoading(false) }
  }

  return (
    <section id="weather" className="py-5">
      <div className="container">
        <h1>Weather Page</h1>
        <h2 className="mb-4">Weather</h2>
        <div className="mb-3 d-flex gap-2">
          <input className="form-control" value={city} onChange={e=>setCity(e.target.value)} />
          <button className="btn btn-success" onClick={lookup} disabled={loading}>{loading ? 'Loading…' : 'Search'}</button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}

        {loading && (
          <div className="card p-3 mb-3">
            <div style={{height:16, width:'40%', background:'#e9ecef', borderRadius:6, marginBottom:12, animation:'pulse 1.4s infinite'}} />
            <div style={{height:12, width:'70%', background:'#e9ecef', borderRadius:6, marginBottom:8, animation:'pulse 1.4s infinite'}} />
            <div style={{height:12, width:'50%', background:'#e9ecef', borderRadius:6, animation:'pulse 1.4s infinite'}} />
            <style>{`@keyframes pulse{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}`}</style>
          </div>
        )}

        {weather && (
          <>
            <div className="card p-3 mb-3">
              <h5>{weather.location}</h5>
              <div>Temperature: {Math.round(weather.current.temperature)}°C</div>
              <div>Condition: {mapWeather(weather.current.weathercode)}</div>
            </div>

            {weather.daily && (
              <div className="card p-3">
                <h6 className="mb-3">5-day Temperature Trend</h6>
                <TempChart
                  labels={weather.daily.time || []}
                  max={weather.daily.temperature_2m_max || []}
                  min={weather.daily.temperature_2m_min || []}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

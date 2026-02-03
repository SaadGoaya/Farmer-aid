import React, { useState } from 'react'
import api from './services/api'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Weather from './pages/Weather'
import Diseases from './pages/Diseases'
import About from './pages/About'
import AI from './pages/AI'

function NavBar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <span className="logo-emoji">🌾</span>
          <span className="brand-text">Farmer Aid</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/weather">Weather</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/diseases">Diseases</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/ai">AI Assistant</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/about">About</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

// AI chat moved to `src/pages/AI.jsx`

function AppContent() {
  const location = useLocation()
  return (
    <>
      <NavBar />
      <main key={location.pathname} style={{paddingTop: '72px'}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/diseases" element={<Diseases />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

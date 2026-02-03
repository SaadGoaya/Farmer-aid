import React, { useState } from 'react'
import api from './services/api'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
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

        <div className="navbar-collapse">
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

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main style={{paddingTop: '72px'}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/diseases" element={<Diseases />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

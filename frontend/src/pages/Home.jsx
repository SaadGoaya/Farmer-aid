import React, { useEffect, useRef } from 'react'

export default function Home(){
  const heroRef = useRef(null)

  // Add lightweight parallax and subtle motion (mobile-first: gentle or disabled on low-motion)
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    let latestScroll = 0
    let ticking = false

    function onScroll(){
      latestScroll = window.scrollY || window.pageYOffset
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const translate = Math.round(latestScroll * 0.08)
          hero.style.transform = `translateY(${translate}px)`
          ticking = false
        })
        ticking = true
      }
    }

    function onMove(e){
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const rect = hero.getBoundingClientRect()
      const cx = rect.left + rect.width/2
      const cy = rect.top + rect.height/2
      const dx = (e.clientX - cx) / rect.width
      const dy = (e.clientY - cy) / rect.height
      hero.style.transform = `translate3d(${dx*8}px, ${Math.max(0, window.scrollY*0.06)}px, 0)`
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <header ref={heroRef} className="hero-section text-center">
      <div className="container">
        <h1 className="hero-title">Farmer Aid</h1>
        <p className="hero-tagline">Smart weather, crop guidance & disease suggestions for Pakistani farmers</p>
        <div className="hero-ctas mt-3">
          <a className="btn btn-success btn-lg me-2 hero-cta-animated" href="/weather">Check Weather</a>
          <a className="btn btn-outline-success btn-lg hero-cta-animated" href="/ai">AI Assistant</a>
        </div>
      </div>
    </header>
  )
}

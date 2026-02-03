/* script.js - Farmer Aid
   - Uses Open-Meteo Geocoding + Forecast endpoints (no API key)
   - Plant/disease suggestions are mocked but structured for future API replacement
*/

/* ====== Utilities & Config ====== */
// Removed Open-Meteo API URLs as weather fetching is no longer needed on this page

// weather code mapping (kept for potential future use or if weather.html references it)
const weatherCodeMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers"
};

/* ====== Mocked crop rules (kept for potential future use or if weather.html references it) ====== */
const cropDatabase = {
    "Wheat": {
        fertilizers: ["Urea (N)", "DAP (P) — if soil low in P", "SOP (K) if K deficient"],
        diseaseRules: [
            { when: (t, h) => h > 85 && t >= 20 && t <= 30, warn: "Rust & Blight risk — high humidity favors fungal growth." },
            { when: (t, h) => t < 5, warn: "Frost risk — protect seedlings." }
        ]
    },
    "Rice": {
        fertilizers: ["N-P-K balance; apply basal P & K, split N"],
        diseaseRules: [{ when: (t, h) => h > 80 && t >= 25, warn: "Blast & Sheath Blight risk." }]
    },
    "Cotton": {
        fertilizers: ["Nitrogen split-application", "Phosphorus at sowing", "Potassium as needed"],
        diseaseRules: [{ when: (t, h) => t >= 28 && h > 70, warn: "Bacterial blight & boll rot risk." }]
    },
    "Sugarcane": {
        fertilizers: ["High N application, P & K based on soil test"],
        diseaseRules: [{ when: (t, h) => h > 85 && t >= 25, warn: "Fungal diseases like red rot risk." }]
    },
    "Maize": {
        fertilizers: ["Starter P; topdress Nitrogen at V6-V8"],
        diseaseRules: [{ when: (t, h) => t > 30 && h < 40, warn: "Drought stress at silking — yield risk." }]
    },
    "Barley": { fertilizers: ["Moderate N, apply P if needed"], diseaseRules: [] },
    "Pulses": {
        fertilizers: ["Rhizobia inoculation; modest N if nodulation poor", "P & K as per soil test"],
        diseaseRules: [{ when: (t, h) => h > 80, warn: "Anthracnose & rust risk." }]
    },
    "Oilseeds": {
        fertilizers: ["Balanced NPK; micronutrients as needed"],
        diseaseRules: [{ when: (t, h) => h > 80 && t >= 22, warn: "Sclerotinia and fungal problems." }]
    },
    "Vegetables": {
        fertilizers: ["Frequent light N applications; P & K as required"],
        diseaseRules: [{ when: (t, h) => h > 85, warn: "Fungal leaf spots risk — improve ventilation." }]
    },
    "Fruits": {
        fertilizers: ["Soil test driven; base P & K, regular N"],
        diseaseRules: [{ when: (t, h) => h > 80, warn: "Fruit rots & fungal infections risk." }]
    }
};

/* ====== DOM Elements (only those relevant for the index page) ====== */
const cityInput = document.getElementById('cityInput'); // Kept for event listener, though functionality removed
const searchBtn = document.getElementById('searchBtn'); // Kept for event listener, though functionality removed
const locBtn = document.getElementById('locBtn'); // Kept for event listener, though functionality removed
const statusMsg = document.getElementById('statusMsg'); // Kept for general status updates

const copyYear = document.getElementById('copyYear');
if (copyYear) copyYear.textContent = new Date().getFullYear();

/* ====== Main functions (Removed weather fetching and crop suggestion logic) ====== */
// The weather fetching and crop suggestion logic is no longer needed on the index page
// and should reside only on the weather.html page.

/* ====== UI helpers ====== */
function setStatus(text) { if (statusMsg) statusMsg.textContent = text; }

/* ====== Geolocation (Kept only for the button, no actual fetching here) ====== */
if (locBtn) {
    locBtn.addEventListener('click', async() => {
        // This button now only serves as a visual element, its functionality is on weather.html
        setStatus('Weather location features are available on the Weather page.');
    });
}

/* ====== City search (Kept only for the button, no actual fetching here) ====== */
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        // This button now only serves as a visual element, its functionality is on weather.html
        setStatus('City search for weather is available on the Weather page.');
    });
}

if (cityInput) {
    cityInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            // This input now only serves as a visual element, its functionality is on weather.html
            setStatus('City search for weather is available on the Weather page.');
        }
    });
}

/* ====== Crop card click (index.html only) ====== */
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
        const target = card.dataset.target;
        if (target) window.location.href = target;
    });
});

/* ====== Crop card click (weather page - these elements are not on index.html) ====== */
// Removed this section as cropSelect, weatherCard, weatherPlaceholder are not on index.html
// and this logic specifically relates to the weather page's functionality.

/* ====== Parallax effect ====== */
(function setupParallax() {
    const hero = document.querySelector('.hero-section');
    const heroBg = document.querySelector('.hero-bg');
    const heroTilt = document.createElement('div');
    heroTilt.className = 'hero-tilt';
    let plantEl = null;
    if (!hero || !heroBg) return;

    // Attach tilt container for mouse interactions
    hero.appendChild(heroTilt);
    // Create/use plant element if not already present
    try {
        plantEl = document.querySelector('.hero-plant');
        if (!plantEl) {
            plantEl = document.createElement('div');
            plantEl.className = 'hero-plant hero-plant-inner';
            // use an inline SVG-ish image or fallback PNG
            plantEl.innerHTML = `<img src="images/plant-foreground.svg" alt="plant" style="width:100%;height:auto;display:block;" />`;
            hero.appendChild(plantEl);
        }
    } catch (e) { console.warn('Could not create hero plant layer', e); }

    let latestScroll = 0;
    let ticking = false;
    let mouseX = 0,
        mouseY = 0;
    let latestMouseX = 0,
        latestMouseY = 0;
    let mouseTick = false;

    function onScroll() {
        latestScroll = window.scrollY || window.pageYOffset;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Parallax factors
                const heroFactor = 0.18; // background slower
                const overlayFactor = 0.35; // overlay slightly faster for depth

                const heroTranslate = Math.round(latestScroll * heroFactor);
                const overlayTranslate = Math.round(latestScroll * overlayFactor);

                // Set CSS variables (no transform clobbering)
                hero.style.setProperty('--hero-translate', `${heroTranslate}px`);
                hero.style.setProperty('--overlay-translate', `${overlayTranslate}px`);



                // Slight parallax from mouse on desktop (tilt)
                if (window.matchMedia('(min-width: 768px)').matches) {
                    const rect = hero.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const dx = (latestMouseX - cx) / rect.width; // -0.5..0.5
                    const dy = (latestMouseY - cy) / rect.height;
                    const tiltX = (dy * 6).toFixed(2); // rotateX
                    const tiltY = (dx * -6).toFixed(2); // rotateY
                    heroTilt.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

                    // plant subtle counter movement
                    if (plantEl) {
                        const plantTranslateX = Math.round(dx * 18);
                        const plantTranslateY = Math.round(dy * -8) - Math.round(latestScroll * 0.02);
                        plantEl.style.transform = `translate3d(${plantTranslateX}px, ${plantTranslateY}px, 0) scale(1.02)`;
                    }
                }

                ticking = false;
            });
            ticking = true;
        }
    }

    document.addEventListener('scroll', onScroll, { passive: true });
    // Mousemove handler (throttled with rAF)
    document.addEventListener('mousemove', (e) => {
        latestMouseX = e.clientX;
        latestMouseY = e.clientY;
        if (!mouseTick) {
            window.requestAnimationFrame(() => {
                // just update the values used in onScroll's rAF cycle
                mouseTick = false;
            });
            mouseTick = true;
        }
    }, { passive: true });
    // Initialize position
    onScroll();
})();

/* ====== Lightweight hero particle spawner ====== */
(function spawnHeroParticles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const heroes = document.querySelectorAll('.hero-section');
    heroes.forEach(hero => {
        const particlesContainer = hero.querySelector('.hero-particles');
        if (!particlesContainer) return;
        // Create a small number of particles for subtle effect
        const count = 10;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            // randomize initial position within hero
            const left = Math.round(Math.random() * 100);
            const top = Math.round(40 + Math.random() * 50); // keep particles in upper hero area
            p.style.left = `${left}%`;
            p.style.top = `${top}%`;
            const duration = 8 + Math.random() * 10;
            p.style.animation = `particle-float ${duration}s linear ${Math.random()*4}s both`;
            particlesContainer.appendChild(p);
        }
    });
})();

/* ====== Volumetric cloud + sun dynamics ====== */
(function volumetricClouds() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const heroes = document.querySelectorAll('.hero-section');
    heroes.forEach(hero => {
        // inject svg cloud if not present
        if (!hero.querySelector('.hero-cloud-svg')) {
            const svgWrap = document.createElement('div');
            svgWrap.className = 'hero-cloud-svg';
            svgWrap.innerHTML = `
                                            <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                                                <defs>
                                                    <filter id="cloudNoise" x='-50%' y='-50%' width='200%' height='200%'>
                                                        <feTurbulence baseFrequency="0.8" numOctaves="2" seed="3" type="fractalNoise" result="noise" />
                                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.65 0" in="blur" result="alpha"/>
                                                        <feBlend in="SourceGraphic" in2="alpha" mode="normal" />
                                                    </filter>
                                                    <filter id="cloudDisplace" x='-50%' y='-50%' width='200%' height='200%'>
                                                        <feTurbulence baseFrequency="0.6" numOctaves="3" seed="6" type="fractalNoise" result="turb" />
                                                        <feDisplacementMap in="SourceGraphic" in2="turb" scale="30" xChannelSelector="R" yChannelSelector="G"/>
                                                        <feGaussianBlur stdDeviation="6"/>
                                                    </filter>
                                                                        <linearGradient id="cloudGrad" x1="0" x2="0" y1="0" y2="1">
                                                                            <stop offset="0%" stop-color="#f6f7f8" stop-opacity="0.92"/>
                                                                            <stop offset="60%" stop-color="#e9edf2" stop-opacity="0.78"/>
                                                                            <stop offset="100%" stop-color="#dfe6ec" stop-opacity="0.75"/>
                                                                        </linearGradient>
                                                </defs>

                                                                    <!-- Back soft volume -->
                                                                    <g class="cloud-layer l3" style="filter:url(#cloudDisplace); opacity:0.7; mix-blend-mode:multiply;">
                                                    <ellipse cx="1400" cy="140" rx="360" ry="110" fill="url(#cloudGrad)" />
                                                    <ellipse cx="980" cy="110" rx="300" ry="100" fill="url(#cloudGrad)" />
                                                    <ellipse cx="580" cy="150" rx="420" ry="130" fill="url(#cloudGrad)" />
                                                </g>

                                                <!-- Middle thicker clouds -->
                                                                    <g class="cloud-layer l2" style="filter:url(#cloudNoise); opacity:0.8; mix-blend-mode:multiply;">
                                                    <ellipse cx="300" cy="90" rx="440" ry="150" fill="url(#cloudGrad)" />
                                                    <ellipse cx="820" cy="80" rx="360" ry="120" fill="url(#cloudGrad)" />
                                                </g>

                                                <!-- Fore soft puff -->
                                                                    <g class="cloud-layer l1" style="filter:url(#cloudDisplace); opacity:0.86; mix-blend-mode:multiply;">
                                                    <ellipse cx="520" cy="140" rx="420" ry="150" fill="url(#cloudGrad)" />
                                                    <ellipse cx="1160" cy="120" rx="300" ry="110" fill="url(#cloudGrad)" />
                                                    <ellipse cx="300" cy="140" rx="220" ry="80" fill="url(#cloudGrad)" />
                                                </g>
                                            </svg>`;
            hero.appendChild(svgWrap);
        }

        // inject godrays container
        if (!hero.querySelector('.hero-godrays')) {
            const gr = document.createElement('div');
            gr.className = 'hero-godrays';
            hero.appendChild(gr);
        }

        // make sun respond to mouse slightly
        const sun = hero.querySelector('.hero-sun');
        const svgClouds = hero.querySelectorAll('.hero-cloud-svg .cloud-layer');
        let cx = 0,
            cy = 0;

        function animateClouds() {
            const t = performance.now() / 1000;
            svgClouds.forEach((g, i) => {
                const depth = (i + 1) * 0.8; // stronger depth layering
                const baseSpeed = 0.04 + i * 0.015;
                const dx = Math.sin(t * (baseSpeed * 0.9) + i * 0.7) * (40 * depth) + Math.sin(t * 0.2 + i) * (6 * depth);
                const dy = Math.cos(t * (baseSpeed * 0.45) + i * 0.5) * (10 * depth) + Math.cos(t * 0.12 + i) * (3 * depth);
                const rot = Math.sin(t * (0.01 + i * 0.005)) * (1.2 * depth);
                const scale = 1 + Math.sin(t * (0.003 + i * 0.001)) * 0.01 * depth;
                g.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg) scale(${scale})`;

                // if the group has filter displacement, animate its seed by toggling filter attributes (if supported)
                const svgel = g.ownerSVGElement;
                if (svgel) {
                    try {
                        const turb = svgel.querySelector('feTurbulence');
                        if (turb) {
                            // oscillate baseFrequency subtly
                            const bf = 0.4 + Math.abs(Math.sin(t * (0.02 + i * 0.01))) * 0.35;
                            turb.setAttribute('baseFrequency', bf.toFixed(3));
                        }
                    } catch (e) {}
                }
            });

            if (sun) {
                // subtle follow of mouse cursor and stronger parallax reaction
                const rect = hero.getBoundingClientRect();
                const sx = (cx - (rect.left + rect.width / 2)) / rect.width; // -0.5..0.5
                const sy = (cy - (rect.top + rect.height / 2)) / rect.height;
                const tx = Math.max(-28, Math.min(28, sx * 80));
                const ty = Math.max(-24, Math.min(24, sy * 64));
                sun.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${1 + Math.abs(sx)*0.03})`;

                // ensure sun has rotating flare elements
                if (!sun.querySelector('.flare')) {
                    const f1 = document.createElement('div');
                    f1.className = 'flare f1';
                    const f2 = document.createElement('div');
                    f2.className = 'flare f2';
                    sun.appendChild(f1);
                    sun.appendChild(f2);
                    // halo elements
                    const halo1 = document.createElement('div');
                    halo1.className = 'halo h1';
                    const halo2 = document.createElement('div');
                    halo2.className = 'halo h2';
                    sun.appendChild(halo1);
                    sun.appendChild(halo2);
                }
            }

            requestAnimationFrame(animateClouds);
        }
        animateClouds();

        // update mouse coordinates
        hero.addEventListener('mousemove', (e) => {
            cx = e.clientX;
            cy = e.clientY;
        }, { passive: true });
    });
})();

/* ====== Init ====== */
setStatus('Ready. Explore crops or check weather.'); // Updated status message
document.addEventListener("DOMContentLoaded", function() {
    const cards = document.querySelectorAll(".feature-card");

    cards.forEach(card => {
        card.addEventListener("click", function() {
            const target = card.getAttribute("data-target");
            if (target) {
                window.location.href = target;
            }
        });
    });

    // auto-update footer year (guarded)
    const _cpy = document.getElementById("copyYear");
    if (_cpy) _cpy.textContent = new Date().getFullYear();
});
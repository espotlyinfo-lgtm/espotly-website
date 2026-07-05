// ── Live counter section (home page only) ─────────────────────────────────────
(function () {
  const elDrivers  = document.getElementById('counterDrivers');
  const elOwners   = document.getElementById('counterOwners');
  const elListings = document.getElementById('counterListings');
  if (!elDrivers) return; // not on home page

  const FALLBACK = { drivers: 4, owners: 2, listings: 7 };
  let animated = false;

  function countUp(el, target, duration) {
    const start = performance.now();
    (function step(ts) {
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }(performance.now()));
  }

  function animateTo(data) {
    if (animated) return;
    animated = true;
    countUp(elDrivers,  data.drivers,  2000);
    countUp(elOwners,   data.owners,   2000);
    countUp(elListings, data.listings, 2000);
  }

  // Trigger animation when the section scrolls into view
  let fetchedData = null;
  fetch('https://espotly-backend-production.up.railway.app/api/counts')
    .then(r => r.json())
    .then(data => { fetchedData = data; })
    .catch(() => { fetchedData = FALLBACK; });

  const section = elDrivers.closest('.counter-section');
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      animateTo(fetchedData || FALLBACK);
      io.disconnect();
    }
  }, { threshold: 0.3 });
  if (section) io.observe(section);
}());

// Cookie consent banner
(function() {
  if (localStorage.getItem('espotly_cookie')) return;
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML =
    '<p class="cookie-text">We use cookies to improve your experience. By continuing to use eSpotly, you agree to our <a href="/privacy.html">Privacy Policy</a>.</p>' +
    '<div class="cookie-actions">' +
      '<button class="btn btn-ghost cookie-decline">Decline</button>' +
      '<button class="btn btn-primary cookie-accept">Accept</button>' +
    '</div>';
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('visible'), 600);
  banner.querySelector('.cookie-accept').addEventListener('click', () => {
    localStorage.setItem('espotly_cookie', 'accepted');
    banner.classList.remove('visible');
    banner.classList.add('hidden');
    setTimeout(() => banner.remove(), 400);
  });
  banner.querySelector('.cookie-decline').addEventListener('click', () => {
    localStorage.setItem('espotly_cookie', 'declined');
    banner.classList.remove('visible');
    banner.classList.add('hidden');
    setTimeout(() => banner.remove(), 400);
  });
})();

// Navbar: frosted glass on scroll
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks  = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Smooth scroll with navbar-height offset
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const id = anchor.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const offset = navbar.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Active nav link on scroll
const sections    = document.querySelectorAll('section[id]');
const anchorLinks = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
  const y = window.scrollY + navbar.offsetHeight + 80;
  sections.forEach(sec => {
    if (y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight) {
      anchorLinks.forEach(a => a.classList.remove('active'));
      const match = document.querySelector(`.nav-links a[href="#${sec.id}"]`);
      if (match) match.classList.add('active');
    }
  });
}, { passive: true });

// Scroll-triggered fade-in animations
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

// Car scroll animation: How It Works → Benefits parking spot
(function () {
  const car   = document.getElementById('heroCar');
  const spot  = document.querySelector('.anim-parking-spot');
  const start = document.getElementById('how-it-works');
  if (!car || !spot || !start) return;

  let raf = false;

  function pageTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function update() {
    const vh  = window.innerHeight;
    const sy  = window.scrollY;

    const sectionTop    = pageTop(start);
    const spotTop       = pageTop(spot);
    const benefitsBot   = pageTop(document.getElementById('benefits')) +
                          document.getElementById('benefits').offsetHeight;

    // Car appears when How It Works reaches 70% down viewport
    const enterAt  = sectionTop - vh * 0.7;
    // Car is parked when spot top sits at 50% of viewport
    const parkedAt = spotTop - vh * 0.5;
    // Only hide when benefits section fully scrolls off screen
    const exitAt   = benefitsBot;

    if (sy < enterAt || sy > exitAt) {
      car.style.opacity = '0';
      raf = false;
      return;
    }

    car.style.opacity = '1';

    const progress = Math.min(Math.max((sy - enterAt) / (parkedAt - enterAt), 0), 1);
    const eased    = 1 - Math.pow(1 - progress, 3);

    const yStart  = vh * 0.08;
    const yParked = vh * 0.5;
    // Once parked, track the spot so car stays inside as section scrolls
    const yPost   = spotTop - sy;
    const y       = progress < 1 ? yStart + (yParked - yStart) * eased : yPost;

    car.style.top = Math.round(y) + 'px';
    raf = false;
  }

  car.style.transition = 'opacity 0.25s';
  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}());

// Contact form
const form       = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const phone   = form.phone.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !phone || !message) {
      setStatus('Please fill in all fields.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('Please enter a valid email address.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus('Sending…', '');

    try {
      const res = await fetch('/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, phone, message }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("Thanks! We'll be in touch soon.", 'success');
        form.reset();
      } else {
        setStatus(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch {
      setStatus('Could not send message. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function setStatus(msg, type) {
  if (!formStatus) return;
  formStatus.textContent = msg;
  formStatus.className   = 'form-status ' + type;
}

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

// Cross-section car scroll animation (How It Works → Your city, your way)
const heroCar = document.getElementById('heroCar');
if (heroCar) {
  const startSection  = document.getElementById('how-it-works');
  const endSection    = document.getElementById('benefits');
  const parkingSpot   = document.querySelector('.anim-parking-spot');
  let raf = false;

  function updateCar() {
    const vh = window.innerHeight;
    const scrollY = window.scrollY;

    // Absolute page positions
    const startPageTop  = startSection.offsetTop;
    const spotPageTop   = endSection.offsetTop + parkingSpot.offsetTop;
    const spotPageBot   = spotPageTop + parkingSpot.offsetHeight;
    const carH          = heroCar.offsetHeight;

    // Car appears when how-it-works reaches mid-viewport
    const enterAt = startPageTop - vh * 0.55;
    // Car is fully parked when its bottom aligns with the spot's bottom
    const parkedScrollY = spotPageBot - vh * 0.72;
    // Fade out when spot scrolls above viewport
    const exitAt = spotPageTop - vh * 0.05;

    if (scrollY < enterAt || scrollY > exitAt) {
      heroCar.style.opacity = '0';
      raf = false;
      return;
    }

    const progress = Math.min(Math.max((scrollY - enterAt) / (parkedScrollY - enterAt), 0), 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    // Parked position: car bottom = spot bottom (in viewport coords)
    const spotBotInViewport = spotPageBot - scrollY;
    const parkedTop = spotBotInViewport - carH;
    const startTop = vh * 0.08;

    const y = startTop + (parkedTop - startTop) * eased;

    heroCar.style.opacity = '1';
    heroCar.style.top = y + 'px';
    raf = false;
  }

  heroCar.style.transition = 'opacity 0.3s';
  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(updateCar); }
  }, { passive: true });
  updateCar();
}

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

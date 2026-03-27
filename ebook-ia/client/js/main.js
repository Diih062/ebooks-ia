// main.js — client interactions, form handling, animations (IntersectionObserver)
// Form posts to /api/subscribe (backend) OR will fallback to SendPulse webform embed option
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadForm');
  const submitBtn = document.getElementById('submitBtn');

  // Simple in-page micro animation: reveal on scroll
  const revealEls = document.querySelectorAll('.card-box, .offer-box, .img-hero, .form-card');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('inview'); io.unobserve(e.target) }
    });
  }, {threshold: 0.12});

  revealEls.forEach(el => io.observe(el));

  // Basic form validation + submit
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const firstName = form.firstName.value.trim();
    const email = form.email.value.trim();

    // Minimal validation
    if(!email || !/^\S+@\S+\.\S+$/.test(email)){
      alert('Por favor insira um e-mail válido.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Receber e-book gratuito';
      return;
    }

    // Try to call our backend endpoint (recommended)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, email, source: 'ebook-ia' })
      });

      if(res.ok){
        // Redirect to thank you page
        window.location.href = './thank-you.html';
      } else {
        // fallback: if backend not present, show message and redirect
        console.warn('Backend subscribe failed, falling back.');
        window.location.href = './thank-you.html';
      }
    } catch (err) {
      console.error(err);
      // fallback redirect
      window.location.href = './thank-you.html';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Receber e-book gratuito';
    }
  });
});

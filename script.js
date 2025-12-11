document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.getElementById('nav-list');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navList.classList.toggle('show');
    });
  }

  // Close mobile nav when clicking a link
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      if (navList.classList.contains('show')) {
        navList.classList.remove('show');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Fetch events from events.json and render
  const eventsContainer = document.getElementById('events-container');
  const eventsError = document.getElementById('events-error');

  if (eventsContainer) {
    fetch('events.json')
      .then(resp => {
        if (!resp.ok) throw new Error('Network response not ok');
        return resp.json();
      })
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          eventsError.hidden = false;
          return;
        }

        data.forEach(ev => {
          const card = createEventCard(ev);
          eventsContainer.appendChild(card);
        });
      })
      .catch(err => {
        console.warn('Error loading events.json', err);
        eventsError.hidden = false;
      });
  }

  function createEventCard(ev){
    const article = document.createElement('article');
    article.className = 'event-card';

    const img = document.createElement('img');
    img.src = ev.image || 'images/eventos/placeholder.jpg';
    img.alt = ev.title ? ev.title + ' - afiche' : 'Afiche del evento';
    article.appendChild(img);

    const body = document.createElement('div');
    body.className = 'event-body';

    const h3 = document.createElement('h3');
    h3.className = 'event-title';
    h3.textContent = ev.title || 'Evento';
    body.appendChild(h3);

    if (ev.date) {
      const meta = document.createElement('div');
      meta.className = 'event-meta';
      meta.textContent = ev.date;
      body.appendChild(meta);
    }

    if (ev.description) {
      const p = document.createElement('p');
      p.className = 'event-desc';
      p.textContent = ev.description;
      body.appendChild(p);
    }

    article.appendChild(body);
    return article;
  }

  // Back to top button
  const toTop = document.getElementById('toTop');
  window.addEventListener('scroll', () => {
    if (!toTop) return;
    if (window.scrollY > 400) toTop.style.display = 'block';
    else toTop.style.display = 'none';
  });
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
});

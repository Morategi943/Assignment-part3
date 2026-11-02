/* ==========================================================
   Kwelano Bohloko Old Age and Disability Centre
   Part 3 - JavaScript enhancements (section 2.1)
   Plain JavaScript (no jQuery). Every feature checks that its
   HTML exists first, so one file can be loaded on every page.
   Requires Leaflet (CSS + JS) only on the page with #map.
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  initAccordion();
  initTabs();
  initMap();
  prefillInquiryItem();
  // Products are loaded first (2.2), then the features that need the cards start
  var ready = document.getElementById('product-list') ? loadProducts() : Promise.resolve();
  ready.then(function () {
    initProductModal();
    initProductControls();
    initGallery();
    initScrollReveal();
  });
});

/* ---------- Shared overlay helper (used by modal + lightbox) ---------- */
var lastFocus = null;

function createOverlay(id, innerHTML) {
  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = id;
  overlay.innerHTML = innerHTML;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.hasAttribute('data-close')) closeOverlays();
  });
  return overlay;
}

function openOverlay(overlay) {
  lastFocus = document.activeElement;
  overlay.classList.add('open');
  var closeBtn = overlay.querySelector('[data-close]');
  if (closeBtn) closeBtn.focus();
}

function closeOverlays() {
  document.querySelectorAll('.overlay.open').forEach(function (o) {
    o.classList.remove('open');
  });
  if (lastFocus) lastFocus.focus();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeOverlays();
});

/* ---------- 1. Accordion ----------
   HTML: <button class="acc-btn" aria-expanded="false" aria-controls="a1">
         <div class="acc-panel" id="a1">...</div>                      */
function initAccordion() {
  document.querySelectorAll('.acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!isOpen));
      // max-height animates the open/close (see CSS transition)
      panel.style.maxHeight = isOpen ? 0 : panel.scrollHeight + 'px';
    });
  });
}

/* ---------- 2. Tabs (click + left/right arrow keys) ----------
   HTML: buttons with role="tab" and aria-controls="panelId";
         panels with role="tabpanel" (all but the first "hidden")  */
function initTabs() {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  function select(tab) {
    tabs.forEach(function (t) {
      var active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
    });
    tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
      if (e.key === 'ArrowLeft') select(tabs[(i + tabs.length - 1) % tabs.length]);
    });
  });
}

/* ---------- 3. Modal: "Details" button on each .product card ----------
   The modal itself is created with JavaScript (DOM manipulation).       */
function initProductModal() {
  var cards = document.querySelectorAll('.product');
  if (!cards.length) return;

  var details = {
    'Food parcels': 'Non-perishable groceries such as maize meal, rice, tinned food and cooking oil help the centre provide regular meals.',
    'Toiletries': 'Soap, toothpaste, lotion and other hygiene items support the comfort and dignity of beneficiaries.',
    'Office equipment': 'Computers, printers, filing items and stationery help the centre manage its daily administration.',
    'Gardening tools': 'Spades, rakes, hoses and seeds support community gardening activities.',
    'Volunteer time': 'Time, skills and companionship make a real difference to residents and community programmes.',
    'Other support': 'Have something else to offer? Tell the centre through the inquiry form.'
  };

  var modal = createOverlay('modal',
    '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
    '<button class="x" data-close aria-label="Close">&times;</button>' +
    '<h2 id="modal-title"></h2><p id="modal-text"></p>' +
    '<a class="btn" id="modal-offer" href="inquiry.html">Offer this</a></div>');

  cards.forEach(function (card) {
    var title = card.querySelector('h2').textContent;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn secondary';
    btn.textContent = 'Details';
    btn.addEventListener('click', function () {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-text').textContent =
        card.getAttribute('data-details') || details[title] || card.querySelector('p').textContent;
      // Pass the chosen item to the inquiry page through the URL
      document.getElementById('modal-offer').href =
        'inquiry.html?item=' + encodeURIComponent(title);
      openOverlay(modal);
    });
    card.appendChild(btn);
  });
}

/* ---------- 4. Dynamic content (2.2): load products from data/needs.json ----------
   Cards are built with createElement, then search/filter/sort work on them.   */
function loadProducts() {
  var list = document.getElementById('product-list');
  return fetch('data/needs.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (items) {
      var cats = [];
      items.forEach(function (p) {
        var card = document.createElement('article');
        card.className = 'card product';
        card.setAttribute('data-category', p.category);
        card.setAttribute('data-details', p.details);
        var h = document.createElement('h2');
        h.textContent = p.name;
        var tag = document.createElement('p');
        tag.className = 'tag';
        tag.textContent = p.category;
        var d = document.createElement('p');
        d.textContent = p.description;
        card.appendChild(h);
        card.appendChild(tag);
        card.appendChild(d);
        list.appendChild(card);
        if (cats.indexOf(p.category) === -1) cats.push(p.category);
      });
      var select = document.getElementById('product-category');
      if (select) {
        cats.sort().forEach(function (c) {
          var o = document.createElement('option');
          o.value = c;
          o.textContent = c;
          select.appendChild(o);
        });
      }
    })
    .catch(function () {
      var msg = document.createElement('p');
      msg.textContent = 'The items could not be loaded right now. Please refresh the page or contact us.';
      list.appendChild(msg);
    });
}

/* ---------- 4b. Search + category filter + sort ----------
   HTML: #product-search, #product-category, #product-sort,
         #results-count, #no-results                                  */
function initProductControls() {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.product'));
  if (!cards.length) return;
  var list = cards[0].parentNode;
  var search = document.getElementById('product-search');
  var cat = document.getElementById('product-category');
  var sort = document.getElementById('product-sort');
  var count = document.getElementById('results-count');
  var none = document.getElementById('no-results');

  function title(c) { return c.querySelector('h2').textContent.toLowerCase(); }

  function update() {
    var q = search ? search.value.toLowerCase().trim() : '';
    var c = cat ? cat.value : 'all';
    var mode = sort ? sort.value : 'name-asc';

    cards.sort(function (a, b) {                       // 1. sort
      if (mode === 'category') {
        return a.getAttribute('data-category').localeCompare(b.getAttribute('data-category')) ||
               title(a).localeCompare(title(b));
      }
      return mode === 'name-desc' ? title(b).localeCompare(title(a)) : title(a).localeCompare(title(b));
    });

    var shown = 0;
    cards.forEach(function (card) {                    // 2. re-order the DOM and filter
      list.appendChild(card);
      var match = card.textContent.toLowerCase().indexOf(q) > -1 &&
                  (c === 'all' || card.getAttribute('data-category') === c);
      card.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' items';
    if (none) none.hidden = shown > 0;
  }

  [search, cat, sort].forEach(function (el) {
    if (el) el.addEventListener(el === search ? 'input' : 'change', update);
  });
  update();
}

/* ---------- 5. Gallery + lightbox ----------
   HTML: <div class="gallery" id="gallery">
           <button type="button"><img src="images/a.jpg" alt="..."></button> ...
         Optional: data-full="images/a-large.jpg" on an img for a bigger file */
function initGallery() {
  var gallery = document.getElementById('gallery');
  if (!gallery) return;

  var imgs = Array.prototype.slice.call(gallery.querySelectorAll('img'));
  var index = 0;

  var lightbox = createOverlay('lightbox',
    '<div class="lb" role="dialog" aria-modal="true" aria-label="Image viewer">' +
    '<button class="x" data-close aria-label="Close">&times;</button>' +
    '<img id="lb-img" alt=""><p id="lb-cap"></p>' +
    '<div class="lb-nav">' +
    '<button class="btn secondary" id="lb-prev" type="button">&larr; Prev</button>' +
    '<button class="btn secondary" id="lb-next" type="button">Next &rarr;</button>' +
    '</div></div>');

  function show(i) {
    index = (i + imgs.length) % imgs.length;
    var src = imgs[index];
    var big = document.getElementById('lb-img');
    big.src = src.getAttribute('data-full') || src.src;
    big.alt = src.alt;
    document.getElementById('lb-cap').textContent =
      src.alt + ' (' + (index + 1) + ' of ' + imgs.length + ')';
  }

  imgs.forEach(function (img, i) {
    var trigger = img.closest('button') || img;   // the button, so Enter/Space also work
    trigger.addEventListener('click', function () {
      show(i);
      openOverlay(lightbox);
    });
  });

  document.getElementById('lb-prev').addEventListener('click', function () { show(index - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { show(index + 1); });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
}

/* ---------- 6. Scroll-reveal animation (CSS + IntersectionObserver) ----------
   CSS: .rv {opacity:0; transform:translateY(18px); transition:...}
        .rv.in {opacity:1; transform:none}                                  */
function initScrollReveal() {
  var targets = document.querySelectorAll(
    '.card, .contact-card, .sitemap-item, .gallery button, .welcome h2, .interactive h2'
  );
  if (!('IntersectionObserver' in window)) return; // content stays visible

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(function (el) {
    el.classList.add('rv');
    observer.observe(el);
  });
}

/* ---------- 7. Interactive map (Leaflet + OpenStreetMap) ----------
   HTML: <div id="map" style="height:380px"></div>
   Needs Leaflet CSS and JS loaded before this file.
   Coordinates are approximate: check them with the centre.            */
function initMap() {
  var el = document.getElementById('map');
  if (!el || !window.L) return;

  var position = [-23.87, 29.73]; // Mankweng area (replace with exact point)
  var map = L.map('map', { scrollWheelZoom: false }).setView(position, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.marker(position).addTo(map)
    .bindPopup('<strong>Kwelano Bohloko</strong><br>Stand no. 02, Hlatlaganya, Mankweng')
    .openPopup();

  // Enable wheel zoom only after the visitor clicks the map (avoids scroll-trapping)
  map.on('click', function () { map.scrollWheelZoom.enable(); });
}

/* ---------- 8. Pre-fill the inquiry form from ?item=... and ?type=... ---------- */
function prefillInquiryItem() {
  var params = new URLSearchParams(window.location.search);

  var field = document.getElementById('item');
  var item = params.get('item');
  if (field && item) field.value = item;

  var reason = document.getElementById('type');
  var chosen = params.get('type');
  if (reason && chosen) {
    var valid = Array.prototype.some.call(reason.options, function (o) { return o.value === chosen; });
    if (valid) reason.value = chosen;
  }
}
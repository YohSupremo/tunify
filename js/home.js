/* Home page — fetches live products from API (reference: itcp237-js-ns-2026/js/home.js) */
$(document).ready(function () {

  document.body.dataset.page = 'home';
  loadNav();
  loadFooter();

  /* ── Icon maps (enhancement: kept from original for richer UI) ── */
  const CAT_ICONS = {
    string: 'fa-guitar', percussion: 'fa-drum', keys: 'fa-keyboard',
    wind: 'fa-wind', vocals: 'fa-microphone', accessories: 'fa-plug'
  };

  /* ── Fetch items from API then boot the page ────────────────── */
  /* Pattern: $.ajax GET → success callback chains render calls.
     Reference: itcp237-js-ns-2026/js/home.js lines 16-95         */
  $.ajax({
    method: 'GET',
    url: `${url}api/v1/items`,
    dataType: 'json',
    success: function (data) {
      // Tunify backend returns a plain array (not data.rows like the
      // reference NS backend). Normalise here.
      const products = Array.isArray(data) ? data : (data.rows || []);

      renderHeroCarousel(products);
      renderCategoryStrip(products);
      renderFilterTabs(products);
      renderProducts(products, 'all');
      startCountdown();
      bindEvents(products);
    },
    error: function (error) {
      console.error('Home: failed to load items', error);
    }
  });

  /* ── Render hero carousel ───────────────────────────────────── */
  function renderHeroCarousel(products) {
    const $inner = $('#heroCarouselInner');
    const $indicators = $('#heroIndicators');
    if (!$inner.length) return;
    $inner.empty(); $indicators.empty();

    products.slice(0, 4).forEach(function (p, i) {
      const tag = p.badge ? p.badge.charAt(0).toUpperCase() + p.badge.slice(1) : 'Featured';
      $indicators.append(`<li data-target="#heroCarousel" data-slide-to="${i}"${i === 0 ? ' class="active"' : ''}></li>`);
      $inner.append(`
        <div class="carousel-item${i === 0 ? ' active' : ''}">
          <a href="product.html?id=${p.id}" class="hero-product-card d-block text-decoration-none">
            <div class="product-img-wrap">
              <span class="product-tag">${tag}</span>
              ${p.image ? `<img src="${p.image}" class="prod-card-img img-fluid" alt="${p.name}">` : `<i class="fas fa-music product-img-icon"></i>`}
            </div>
            <p class="product-card-brand">${p.brand} · ${p.category}</p>
            <p class="product-card-name">${p.name}</p>
            <div class="d-flex align-items-center justify-content-between">
              <div class="product-card-price">₱${Number(p.price).toLocaleString()}</div>
              <button type="button" class="btn-add-cart"
                data-id="${p.id}" data-desc="${p.name}"
                data-price="${p.price}" data-image="${p.image || ''}"
                data-stock="${p.stock}" onclick="event.preventDefault(); event.stopPropagation();">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
          </a>
        </div>`);
    });
  }

  /* ── Render category strip ──────────────────────────────────── */
  function renderCategoryStrip(products) {
    const $strip = $('#homeCategoryStrip');
    if (!$strip.length) return;
    $strip.empty();
    const cats = [...new Set(products.map(p => p.category))];
    cats.forEach(function (c) {
      const display = c.charAt(0).toUpperCase() + c.slice(1);
      const icon = CAT_ICONS[c] || 'fa-music';
      const count = products.filter(p => p.category === c).length;
      $strip.append(`
        <div class="col-6 col-md-4 col-lg-2 mb-3">
          <div class="cat-card" onclick="window.location.href='shop.html?cat=${c}'">
            <div class="cat-icon"><i class="fas ${icon}"></i></div>
            <div class="cat-name">${display}</div>
            <div class="cat-count">${count} item${count !== 1 ? 's' : ''}</div>
          </div>
        </div>`);
    });
  }

  /* ── Render filter tabs ─────────────────────────────────────── */
  function renderFilterTabs(products) {
    const $tabs = $('#homeFilterTabs');
    if (!$tabs.length) return;
    $tabs.empty();
    $tabs.append('<button class="filter-tab active" data-filter="all">All</button>');
    const cats = [...new Set(products.map(p => p.category))];
    cats.forEach(function (c) {
      $tabs.append(`<button class="filter-tab" data-filter="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`);
    });
  }

  /* ── Render product grid ────────────────────────────────────── */
  function renderProducts(products, filter) {
    const $grid = $('#productGrid');
    $grid.empty();
    const list = (!filter || filter === 'all')
      ? products
      : products.filter(p => p.category === filter);

    list.forEach(function (p) {
      $grid.append(`
        <div class="col-6 col-md-4 col-lg-3 mb-4">
          <a class="prod-card h-100 d-block text-decoration-none" href="product.html?id=${p.id}">
            <div class="prod-img-area">
              ${p.badge ? `<span class="prod-badge badge-${p.badge}">${p.badge}</span>` : ''}
              ${p.image ? `<img src="${p.image}" class="prod-card-img img-fluid" alt="${p.name}">` : `<i class="fas fa-music"></i>`}
            </div>
            <div class="prod-body">
              <p class="prod-category">${p.category}</p>
              <p class="prod-name">${p.name}</p>
              <p class="prod-brand">${p.brand}</p>
              <div class="prod-footer">
                <div class="prod-price">₱${Number(p.price).toLocaleString()}</div>
                <button type="button" class="btn-add-cart"
                  data-id="${p.id}" data-desc="${p.name}"
                  data-price="${p.price}" data-image="${p.image || ''}"
                  data-stock="${p.stock}">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </a>
        </div>`);
    });
    Tunify.triggerFadeIn();
  }

  /* ── Flash-sale countdown ───────────────────────────────────── */
  function startCountdown() {
    const target = Date.now() + 6 * 3600000;
    function tick() {
      const diff = Math.max(0, target - Date.now());
      $('#cd-h').text(String(Math.floor(diff / 3600000)).padStart(2, '0'));
      $('#cd-m').text(String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'));
      $('#cd-s').text(String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'));
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Bind events after products are rendered ────────────────── */
  function bindEvents(products) {
    $(document).on('click', '.filter-tab', function () {
      $('.filter-tab').removeClass('active');
      $(this).addClass('active');
      renderProducts(products, $(this).data('filter'));
    });

    $(document).on('click', '.btn-add-cart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(this);
      addToCart(
        $btn.data('id'),
        1,
        $btn.data('desc'),
        $btn.data('price'),
        $btn.data('image'),
        $btn.data('stock')
      );
    });
  }

});

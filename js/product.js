/* Product detail page — fetches live item from API.
   Reference: itcp237-js-ns-2026/js/home.js ($.ajax GET pattern) */
$(document).ready(function () {
  document.body.dataset.page = 'shop';
  loadNav();
  loadFooter();

  let qty = 1;

  /* ── Get product ID from URL ────────────────────────────────── */
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    window.location.href = 'shop.html';
    return;
  }

  /* ── Fetch item from API then render ────────────────────────── */
  /* Pattern: $.ajax GET → success callback renders the detail.
     Reference: itcp237-js-ns-2026/js/home.js lines 16-95         */
  $.ajax({
    method: 'GET',
    url: `${url}api/v1/items`,
    dataType: 'json',
    success: function (data) {
      const products = Array.isArray(data) ? data : (data.rows || []);
      const product = products.find(p => String(p.id) === String(id));

      if (!product) {
        window.location.href = 'shop.html';
        return;
      }

      render(product);
      bindEvents(product);
      renderRelated(products, product);
    },
    error: function (error) {
      console.error('Product: failed to load items', error);
      window.location.href = 'shop.html';
    }
  });

  /* ── Render product detail ──────────────────────────────────── */
  function render(p) {
    document.title = `${p.name} — Tunify`;
    // Badge is rendered inline here (not inside a position:relative image
    // wrapper), so we use inline-block styling instead of the absolute-
    // positioned .prod-badge / .product-tag classes to prevent overlap.
    const badgeLabel = p.badge ? p.badge.toUpperCase() : 'FEATURED';
    const badgeBg = p.badge === 'sale' ? 'var(--gold-dim)' : p.badge === 'hot' ? 'var(--accent)' : p.badge === 'new' ? 'var(--accent)' : 'var(--gold)';
    const badgeColor = (p.badge === 'sale') ? '#fff' : '#000';
    $('#productBadge').html(`
      <span style="
        display: inline-block;
        background: ${badgeBg};
        color: ${badgeColor};
        font-family: var(--font-mono);
        font-size: .6rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: .22rem .65rem;
        border-radius: 4px;
        margin-bottom: .5rem;
      ">${badgeLabel}</span>
    `);
    $('#productBrand').text(`${p.brand} · ${p.category}`);
    $('#productName').text(p.name);
    $('#productPrice').html(p.origPrice
      ? `<span class="original">₱${Number(p.origPrice).toLocaleString()}</span>₱${Number(p.price).toLocaleString()}`
      : `₱${Number(p.price).toLocaleString()}`
    );
    $('#productDesc').text(p.desc || '');
    $('#productStock').html(`<i class="fas fa-check-circle"></i> ${p.stock} in stock`);

    if (p.specs && Array.isArray(p.specs)) {
      $('#specList').html(p.specs.map(s => `<li><i class="fas fa-check"></i> ${s}</li>`).join(''));
    }

    let sortedImages = [];
    if (p.images && p.images.length > 0) {
      sortedImages = [...p.images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return a.sort_order - b.sort_order;
      });

      let carouselHtml = '';
      sortedImages.forEach((img, i) => {
        carouselHtml += `
          <div class="carousel-item${i === 0 ? ' active' : ''}">
            <div class="product-detail-img">
              <img src="${img.image_path}" class="prod-detail-img-file img-fluid" alt="${p.name}" style="object-fit: contain; max-height: 400px; width: 100%;">
            </div>
          </div>
        `;
      });
      $('#productCarouselInner').html(carouselHtml);
    } else if (p.image) {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><img src="${p.image}" class="prod-detail-img-file img-fluid" alt="${p.name}"></div></div>
      `);
    } else {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><i class="fas fa-music"></i></div></div>
      `);
    }

    // Render thumbnails
    const $thumbs = $('#productThumbs');
    if ($thumbs.length) {
      $thumbs.empty();
      if (sortedImages.length > 0) {
        const maxVisible = 3;
        for (let i = 0; i < Math.min(sortedImages.length, maxVisible); i++) {
          const img = sortedImages[i];
          const isThirdWithMore = (i === 2 && sortedImages.length > maxVisible);
          const remCount = sortedImages.length - 2;

          let thumbHtml = '';
          if (isThirdWithMore) {
            thumbHtml = `
              <div class="thumb-item position-relative border rounded" data-slide-to="${i}" style="width: 80px; height: 80px; overflow: hidden; cursor: pointer; border-color: #3F3F51; transition: border-color 0.2s;">
                <img src="${img.image_path}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.4;">
                <div class="position-absolute d-flex align-items-center justify-content-center" style="top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); color: #fff; font-weight: bold; font-size: 1.2rem;">
                  +${remCount}
                </div>
              </div>
            `;
          } else {
            thumbHtml = `
              <div class="thumb-item border rounded" data-slide-to="${i}" style="width: 80px; height: 80px; overflow: hidden; cursor: pointer; border-color: #3F3F51; transition: border-color 0.2s;">
                <img src="${img.image_path}" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `;
          }
          $thumbs.append(thumbHtml);
        }

        // Add click events to thumbnails
        $('.thumb-item').on('click', function () {
          const slideTo = $(this).data('slide-to');
          if (slideTo === 2 && sortedImages.length > maxVisible) {
            // It's the "+N" thumbnail representing multiple hidden images
            const activeIndex = $('#productCarouselInner .carousel-item.active').index();
            if (activeIndex < 2) {
              $('#productCarousel').carousel(2);
            } else {
              // Cycle through remaining images (index 2 onwards)
              const nextIndex = activeIndex + 1;
              if (nextIndex < sortedImages.length) {
                $('#productCarousel').carousel(nextIndex);
              } else {
                $('#productCarousel').carousel(2); // Wrap back to the first hidden image
              }
            }
          } else {
            $('#productCarousel').carousel(slideTo);
          }
        });

        // Track carousel slide to highlight active thumbnail
        $('#productCarousel').off('slide.bs.carousel').on('slide.bs.carousel', function (e) {
          const index = e.to;
          $('.thumb-item').css('border-color', '#3F3F51');
          const highlightIndex = index >= 2 ? 2 : index;
          $(`.thumb-item[data-slide-to="${highlightIndex}"]`).css('border-color', 'var(--gold)');
        });

        // Highlight the first one initially
        $(`.thumb-item[data-slide-to="0"]`).css('border-color', 'var(--gold)');
      }
    }
  }

  /* ── Bind product-page events ───────────────────────────────── */
  function bindEvents(p) {
    if ($('#qtySpinner').length) {
      $('#qtySpinner').spinner({
        min: 1,
        max: p.stock,
        spin: function (e, ui) { qty = ui.value; }
      });
    }

    if ($('#productAccordion').length) {
      $('#productAccordion').accordion({
        collapsible: true,
        active: false,
        heightStyle: 'content'
      });
    }

    $('#addToCartBtn').on('click', function () {
      addToCart(p.id, qty, p.name, p.price, p.image, p.stock);
    });

    $('#wishlistBtn').on('click', function () {
      $(this).toggleClass('active');
      const on = $(this).hasClass('active');
      swalToast('success', on ? 'Added to wishlist' : 'Removed from wishlist');
    });

    $('#productCarousel').hover(
      function () { $(this).carousel('pause'); },
      function () { $(this).carousel('cycle'); }
    );
  }

  /* ── Render related products ────────────────────────────────── */
  function renderRelated(products, current) {
    const related = products
      .filter(p => p.category === current.category && String(p.id) !== String(current.id))
      .slice(0, 4);
    const $row = $('#relatedGrid');
    if (!$row.length) return;
    $row.empty();
    related.forEach(function (p) {
      $row.append(`
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

    $(document).on('click', '.btn-add-cart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(this);
      addToCart($btn.data('id'), 1, $btn.data('desc'), $btn.data('price'), $btn.data('image'), $btn.data('stock'));
    });
  }

});

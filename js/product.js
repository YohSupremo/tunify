/* Product detail page */
$(document).ready(function () {
  document.body.dataset.page = 'shop';
  loadNav();
  loadFooter();

  let product = null;
  let qty = 1;

  function render() {
    const p = product;
    document.title = `${p.name} — Tunify`;
    $('#productIcon').attr('class', `fas ${p.icon}`);
    $('#productBadge').html(Tunify.badgeHTML(p.badge) || '<span class="product-tag">Featured</span>');
    $('#productBrand').text(`${p.brand} · ${p.category}`);
    $('#productName').text(p.name);
    $('#productStars').html(`${Tunify.starHTML(p.stars)} <span style="color:var(--text-dim);font-size:.78rem">(${p.reviews} reviews)</span>`);
    $('#productPrice').html(Tunify.priceHTML(p.price, p.origPrice));
    $('#productDesc').text(p.desc);
    $('#productStock').html(`<i class="fas fa-check-circle"></i> ${p.stock} in stock`);
    $('#specList').html(p.specs.map(s => `<li><i class="fas fa-check"></i> ${s}</li>`).join(''));

    if (p.image) {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><img src="${p.image}" class="prod-detail-img-file img-fluid" alt="${p.name}"></div></div>
        <div class="carousel-item"><div class="product-detail-img" style="opacity:.7"><img src="${p.image}" class="prod-detail-img-file img-fluid" alt="${p.name}"></div></div>
        <div class="carousel-item"><div class="product-detail-img" style="opacity:.5"><img src="${p.image}" class="prod-detail-img-file img-fluid" alt="${p.name}"></div></div>
      `);
    } else {
      $('#productCarouselInner').html(`
        <div class="carousel-item active"><div class="product-detail-img"><i class="fas ${p.icon}"></i></div></div>
        <div class="carousel-item"><div class="product-detail-img" style="opacity:.7"><i class="fas ${p.icon}"></i></div></div>
        <div class="carousel-item"><div class="product-detail-img" style="opacity:.5"><i class="fas ${p.icon}"></i></div></div>
      `);
    }
  }

  function bindEvents() {
    const p = product;
    $('#qtySpinner').spinner({
      min: 1,
      max: p.stock,
      spin(e, ui) {
        qty = ui.value;
      }
    });

    $('#productAccordion').accordion({
      collapsible: true,
      active: false,
      heightStyle: 'content'
    });

    $('#addToCartBtn').on('click', () => {
      Tunify.cart.add(p.id, qty);
    });

    $('#wishlistBtn').on('click', function () {
      $(this).toggleClass('active');
      const on = $(this).hasClass('active');
      Tunify.toast(on ? 'Added to wishlist' : 'Removed from wishlist', 'fa-heart');
    });

    $('#productCarousel').hover(
      function () { $(this).carousel('pause'); },
      function () { $(this).carousel('cycle'); }
    );
  }

  function renderRelated() {
    const related = Tunify.products
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
    const $row = $('#relatedGrid');
    if ($row.length) {
      $row.empty();
      related.forEach(p => $row.append(Tunify.productCardHTML(p)));
    }
    Tunify.triggerFadeIn();
  }

  function init() {
    try {
      const id = new URLSearchParams(window.location.search).get('id');
      product = Tunify.getProduct(id);
      if (!product) {
        window.location.href = 'shop.html';
        return;
      }
      render();
      bindEvents();
      renderRelated();
    } catch (err) {
      console.error('Error initializing product page:', err);
    }
  }

  init();
});

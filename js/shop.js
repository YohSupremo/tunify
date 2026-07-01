/* Shop page — filters, slider, sort. Fetches live data from API.
   Reference: itcp237-js-ns-2026/js/home.js ($.ajax GET pattern) */
$(document).ready(function () {

  document.body.dataset.page = 'shop';
  loadNav();
  loadFooter();

  let filters = { categories: [], brands: [], minPrice: 0, maxPrice: 999999, search: '', saleOnly: false };

  // Infinite Scroll State
  let currentPage = 1;
  const itemsPerPage = 12; // safe page size to fill most viewports on load
  let isLoading = false;
  let allFilteredProducts = []; // Caches the filtered products list for pagination

  /* ── Fetch items, brands, and categories from API then boot page ─
     Pattern: nested $.ajax GET calls, same as admin-brands.js loadDataFromDB
     and itcp237-js-ns-2026/js/home.js                                        */
  $.ajax({
    method: 'GET',
    url: `${url}api/v1/items`,
    dataType: 'json',
    success: function (data) {
      const products = Array.isArray(data) ? data : (data.rows || []);

      $.ajax({
        method: 'GET',
        url: `${url}api/v1/brands`,
        dataType: 'json',
        success: function (brands) {

          $.ajax({
            method: 'GET',
            url: `${url}api/v1/categories`,
            dataType: 'json',
            success: function (categories) {
              init(products, brands, categories);
            },
            error: function (err) {
              console.error('Shop: failed to load categories', err);
              init(products, brands, []);
            }
          });

        },
        error: function (err) {
          console.error('Shop: failed to load brands', err);
          init(products, [], []);
        }
      });

    },
    error: function (err) {
      console.error('Shop: failed to load items', err);
    }
  });

  /* ── Parse URL params ───────────────────────────────────────── */
  function parseURL(brands) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cat')) filters.categories = [params.get('cat')];
    if (params.get('brand')) {
      // Match brand slug to actual brand name from API
      const slug = params.get('brand');
      const found = brands.find(b => b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
      if (found) filters.brands = [found.name];
    }
    if (params.get('q')) filters.search = params.get('q');
    if (params.get('sale')) filters.saleOnly = true;
  }

  /* ── Render brand filter checkboxes ────────────────────────── */
  function renderBrandFilters(brands) {
    const $group = $('#brandFilters');
    if (!$group.length) return;
    $group.empty();
    brands.forEach(function (b) {
      $group.append(`
        <label class="filter-check">
          <input type="checkbox" class="brand-filter" value="${b.name}"/> ${b.name}
        </label>
      `);
    });
  }

  /* ── Render category filter checkboxes ─────────────────────── */
  function renderCategoryFilters(categories) {
    const $group = $('#categoryFilters');
    if (!$group.length) return;
    $group.empty();
    categories.forEach(function (c) {
      const slug = c.name.toLowerCase();
      const display = slug.charAt(0).toUpperCase() + slug.slice(1);
      $group.append(`
        <label class="filter-check">
          <input type="checkbox" class="cat-filter" value="${slug}"/> ${display}
        </label>
      `);
    });
  }

  /* ── Build price slider ─────────────────────────────────────── */
  function buildSidebar(products) {
    const max = products.length ? Math.max(...products.map(p => Number(p.price))) : 999999;
    $('#priceSlider').slider({
      range: true,
      min: 0,
      max: max,
      values: [0, max],
      slide: function (e, ui) {
        $('#priceMin').text(ui.values[0].toLocaleString());
        $('#priceMax').text(ui.values[1].toLocaleString());
      },
      stop: function (e, ui) {
        filters.minPrice = ui.values[0];
        filters.maxPrice = ui.values[1];
        applyFilters(products);
      }
    });
    filters.maxPrice = max;
    filters.minPrice = 0;
    $('#priceMin').text('0');
    $('#priceMax').text(max.toLocaleString());

    if (filters.categories.length) {
      filters.categories.forEach(function (c) {
        $(`.cat-filter[value="${c}"]`).prop('checked', true);
      });
    }
    if (filters.brands.length) {
      filters.brands.forEach(function (b) {
        $(`.brand-filter[value="${b}"]`).prop('checked', true);
      });
    }
    if (filters.saleOnly) $('#saleOnly').prop('checked', true);
    if (filters.search) $('#shopSearch').val(filters.search);
  }

  /* ── Bind filter events ─────────────────────────────────────── */
  function bindEvents(products, brands) {
    $(document).on('change', '.cat-filter', function () {
      filters.categories = $('.cat-filter:checked').map(function () { return this.value; }).get();
      applyFilters(products);
    });

    $(document).on('change', '.brand-filter', function () {
      filters.brands = $('.brand-filter:checked').map(function () { return this.value; }).get();
      applyFilters(products);
    });

    $('#saleOnly').on('change', function () {
      filters.saleOnly = this.checked;
      applyFilters(products);
    });

    $('#shopSearch').on('input', debounce(function () {
      filters.search = $(this).val().trim().toLowerCase();
      applyFilters(products);
    }, 300));

    // Build search suggestions from live product names + brand names
    const suggestions = products.map(p => p.name).concat(brands.map(b => b.name));
    $('#shopSearch').autocomplete({
      source: suggestions,
      minLength: 1,
      classes: { 'ui-autocomplete': 'tunify-autocomplete' },
      select: function (e, ui) {
        $('#shopSearch').val(ui.item.value);
        filters.search = ui.item.value.toLowerCase();
        applyFilters(products);
      }
    });

    $('#sortSelect').on('change', function () { applyFilters(products); });

    $('#clearFilters').on('click', function () {
      const max = products.length ? Math.max(...products.map(p => Number(p.price))) : 999999;
      filters = { categories: [], brands: [], minPrice: 0, maxPrice: max, search: '', saleOnly: false };
      $('.cat-filter, .brand-filter, #saleOnly').prop('checked', false);
      $('#shopSearch').val('');
      $('#priceSlider').slider('values', [0, max]);
      $('#priceMin').text('0');
      $('#priceMax').text(max.toLocaleString());
      applyFilters(products);
    });

    // Infinite Scroll Event
    $(window).off('scroll.infinite').on('scroll.infinite', function () {
      // Trigger when scrolled to within 150px of the bottom of the page
      if ($(window).scrollTop() + $(window).height() >= $(document).height() - 150) {
        renderNextPage();
      }
    });
  }

  /* ── Filter + sort products ─────────────────────────────────── */
  function getFiltered(products) {
    let list = [...products];
    if (filters.categories.length) list = list.filter(p => filters.categories.includes(p.category));
    if (filters.brands.length) list = list.filter(p => filters.brands.includes(p.brand));
    if (filters.saleOnly) list = list.filter(p => p.badge === 'sale');
    if (filters.search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(filters.search) ||
        (p.brand && p.brand.toLowerCase().includes(filters.search))
      );
    }
    list = list.filter(p => Number(p.price) >= filters.minPrice && Number(p.price) <= filters.maxPrice);

    const sort = $('#sortSelect').val();
    if (sort === 'price-asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  /* ── Render product grid ────────────────────────────────────── */
  function applyFilters(products) {
    allFilteredProducts = getFiltered(products);
    currentPage = 1;
    const $grid = $('#shopGrid');
    $grid.empty();

    // Remove old completion message and loader if they exist
    $('#endOfCatalogMessage').remove();
    $('#infiniteScrollLoader').remove();

    if (!allFilteredProducts.length) {
      $grid.html(`
        <div class="col-12 text-center py-5">
          <i class="fas fa-search fa-2x mb-3" style="color:var(--text-dim)"></i>
          <p style="color:var(--silver)">No instruments match your filters.</p>
          <button class="btn-outline-gold mt-2" id="clearFiltersInline">Clear Filters</button>
        </div>`);
      $('#clearFiltersInline').on('click', function () { $('#clearFilters').click(); });
      $('#resultCount').text('0 products');
      return;
    }

    $('#resultCount').text(`${allFilteredProducts.length} product${allFilteredProducts.length !== 1 ? 's' : ''}`);

    // Append the loader container immediately after the grid
    if (!$('#infiniteScrollLoader').length) {
      $grid.after(`
        <div id="infiniteScrollLoader" class="text-center py-4 w-100 d-none">
          <div class="spinner-border text-warning" role="status" style="width: 2rem; height: 2rem;">
            <span class="sr-only">Loading...</span>
          </div>
        </div>
        <div id="endOfCatalogMessage" class="text-center py-4 w-100 d-none text-muted" style="font-size: 0.85rem; color: var(--silver) !important;">
          <i class="fas fa-check-circle mr-1"></i> You've viewed all ${allFilteredProducts.length} products.
        </div>
      `);
    }

    renderNextPage();
  }

  /* ── Paging / Chunk rendering ───────────────────────────────── */
  function renderNextPage() {
    if (isLoading) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    if (startIndex >= allFilteredProducts.length) {
      $('#infiniteScrollLoader').addClass('d-none');
      if (allFilteredProducts.length > itemsPerPage) {
        $('#endOfCatalogMessage').removeClass('d-none');
      }
      return;
    }

    const endIndex = Math.min(startIndex + itemsPerPage, allFilteredProducts.length);
    const batch = allFilteredProducts.slice(startIndex, endIndex);
    const $grid = $('#shopGrid');

    if (currentPage > 1) {
      isLoading = true;
      $('#infiniteScrollLoader').removeClass('d-none');

      // 400ms delay for premium loading animation visual effect
      setTimeout(function () {
        appendBatch(batch, $grid);
        currentPage++;
        isLoading = false;
        $('#infiniteScrollLoader').addClass('d-none');

        if (endIndex >= allFilteredProducts.length) {
          if (allFilteredProducts.length > itemsPerPage) {
            $('#endOfCatalogMessage').removeClass('d-none');
          }
        } else {
          // If viewport is not filled, load the next page automatically
          checkViewportFill();
        }
      }, 400);
    } else {
      appendBatch(batch, $grid);
      currentPage++;

      // If the first page is not tall enough to fill viewport, auto-trigger next load
      checkViewportFill();
    }
  }

  function checkViewportFill() {
    // If the document height is not taller than the window viewport, load the next page
    if ($(document).height() <= $(window).height() && (currentPage - 1) * itemsPerPage < allFilteredProducts.length) {
      renderNextPage();
    }
  }

  function appendBatch(batch, $grid) {
    batch.forEach(function (p) {
      const isOutOfStock = p.stock == 0;
      $grid.append(`
        <div class="col-6 col-md-4 col-lg-3 mb-4">
          <a class="prod-card h-100 d-block text-decoration-none" href="product.html?id=${p.id}" style="${isOutOfStock ? 'opacity: 0.55;' : ''}">
            <div class="prod-img-area">
              ${isOutOfStock ? `<span class="prod-badge" style="background:#ef4444; color:#fff; font-size:.6rem; font-weight:600;">OUT OF STOCK</span>` : (p.badge ? `<span class="prod-badge badge-${p.badge}">${p.badge}</span>` : '')}
              ${p.image ? `<img src="${p.image}" class="prod-card-img img-fluid" alt="${p.name}">` : `<i class="fas fa-music"></i>`}
            </div>
            <div class="prod-body">
              <p class="prod-category">${p.category}</p>
              <p class="prod-name">${p.name}</p>
              <p class="prod-brand">${p.brand}</p>
              <div class="prod-footer">
                <div class="prod-price">₱${Number(p.price).toLocaleString()}</div>
                ${isOutOfStock ? `
                  <span style="color:#ef4444; font-size:0.72rem; font-weight:600; padding: 0.15rem 0.45rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.2);"><i class="fas fa-times-circle mr-1"></i> No Stock</span>
                ` : `
                  <div class="d-flex align-items-center" style="gap: .4rem;">
                    <input type="number" class="form-control form-control-sm prod-qty-input" 
                      value="1" min="1" max="${p.stock}" 
                      style="width: 55px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.15rem 0.3rem; text-align: center; font-size: 0.85rem; height: 28px; border-radius: 4px;" />
                    <button type="button" class="btn-add-cart"
                      data-id="${p.id}" data-desc="${p.name}"
                      data-price="${p.price}" data-image="${p.image || ''}"
                      data-stock="${p.stock}">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                `}
              </div>
            </div>
          </a>
        </div>`);
    });
    Tunify.triggerFadeIn();

    // Prevent navigation when clicking on the quantity input
    $(document).off('click.qtyInput').on('click.qtyInput', '.prod-qty-input', function (e) {
      e.preventDefault();
      e.stopPropagation();
    });

    // Validate quantity inputs on change
    $(document).off('change input.qtyInput').on('change input.qtyInput', '.prod-qty-input', function (e) {
      const $input = $(this);
      const max = parseInt($input.attr('max')) || 9999;
      let val = parseInt($input.val());
      
      if (isNaN(val) || val < 1) {
        $input.val(1);
      } else if (val > max) {
        swalToast('warning', `Only ${max} items in stock.`);
        $input.val(max);
      } else {
        $input.val(val); // forces integer, removes decimal
      }
    });

    // Add to cart from shop grid
    $(document).off('click.shopCart').on('click.shopCart', '.btn-add-cart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(this);
      const itemId = $btn.data('id');
      const desc = $btn.data('desc');
      const price = $btn.data('price');
      const image = $btn.data('image');
      const stock = parseInt($btn.data('stock')) || 0;
      
      const $qtyInput = $btn.siblings('.prod-qty-input');
      let qty = parseInt($qtyInput.val()) || 1;
      
      if (qty < 1) {
        swalToast('error', 'Please enter a valid quantity.');
        $qtyInput.val(1);
        return;
      }
      if (qty > stock) {
        swalToast('error', `Cannot add more than available stock (${stock}).`);
        $qtyInput.val(stock);
        return;
      }
      
      addToCart(itemId, qty, desc, price, image, stock);
    });
  }

  /* ── Init: runs after all 3 API calls succeed ───────────────── */
  function init(products, brands, categories) {
    try {
      console.log('ShopPage init starting');
      parseURL(brands);
      renderBrandFilters(brands);
      renderCategoryFilters(categories);
      buildSidebar(products);
      bindEvents(products, brands);
      applyFilters(products);
      Tunify.triggerFadeIn();
      console.log('ShopPage init completed successfully');
    } catch (err) {
      console.error('Error in ShopPage init:', err);
    }
  }

});

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

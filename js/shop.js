/* Shop page — filters, slider, sort */
$(document).ready(function () {

  document.body.dataset.page = 'shop';
  loadNav();
  loadFooter();

  let filters = { categories: [], brands: [], minPrice: 0, maxPrice: 200000, search: '', saleOnly: false };

  function parseURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cat')) filters.categories = [params.get('cat')];
    if (params.get('brand')) {
      const brand = Tunify.brandFromSlug(params.get('brand'));
      if (brand) filters.brands = [brand];
    }
    if (params.get('q')) filters.search = params.get('q');
    if (params.get('sale')) filters.saleOnly = true;
  }

  function renderBrandFilters() {
    const $group = $('#brandFilters');
    if (!$group.length) return;
    $group.empty();
    TunifyBrands.forEach(b => {
      $group.append(`
        <label class="filter-check">
          <input type="checkbox" class="brand-filter" value="${b.name}"/> ${b.name}
        </label>
      `);
    });
  }

  function renderCategoryFilters() {
    const $group = $('#categoryFilters');
    if (!$group.length) return;
    $group.empty();
    const cats = Tunify.categories || ['string', 'percussion', 'keys', 'wind', 'vocals', 'accessories'];
    cats.forEach(c => {
      const display = c.charAt(0).toUpperCase() + c.slice(1);
      $group.append(`
        <label class="filter-check">
          <input type="checkbox" class="cat-filter" value="${c.toLowerCase()}"/> ${display}
        </label>
      `);
    });
  }

  function buildSidebar() {
    const max = Math.max(...Tunify.products.map(p => p.price));
    $('#priceSlider').slider({
      range: true,
      min: 0,
      max: max,
      values: [0, max],
      slide: (e, ui) => {
        $('#priceMin').text(ui.values[0].toLocaleString());
        $('#priceMax').text(ui.values[1].toLocaleString());
      },
      stop: (e, ui) => {
        filters.minPrice = ui.values[0];
        filters.maxPrice = ui.values[1];
        applyFilters();
      }
    });
    filters.maxPrice = max;
    filters.minPrice = 0;
    $('#priceMin').text('0');
    $('#priceMax').text(max.toLocaleString());

    if (filters.categories.length) {
      filters.categories.forEach(c => {
        $(`.cat-filter[value="${c}"]`).prop('checked', true);
      });
    }
    if (filters.brands.length) {
      filters.brands.forEach(b => {
        $(`.brand-filter[value="${b}"]`).prop('checked', true);
      });
    }
    if (filters.saleOnly) $('#saleOnly').prop('checked', true);
    if (filters.search) $('#shopSearch').val(filters.search);
  }

  function bindEvents() {
    $(document).on('change', '.cat-filter', function () {
      filters.categories = $('.cat-filter:checked').map(function () {
        return this.value;
      }).get();
      applyFilters();
    });

    $(document).on('change', '.brand-filter', function () {
      filters.brands = $('.brand-filter:checked').map(function () {
        return this.value;
      }).get();
      applyFilters();
    });

    $('#saleOnly').on('change', function () {
      filters.saleOnly = this.checked;
      applyFilters();
    });

    $('#shopSearch').on('input', debounce(function () {
      filters.search = $(this).val().trim().toLowerCase();
      applyFilters();
    }, 300));

    $('#shopSearch').autocomplete({
      source: TunifySearchSuggestions,
      minLength: 1,
      classes: { 'ui-autocomplete': 'tunify-autocomplete' },
      select(e, ui) {
        $('#shopSearch').val(ui.item.value);
        filters.search = ui.item.value.toLowerCase();
        applyFilters();
      }
    });

    $('#sortSelect').on('change', () => applyFilters());

    $('#clearFilters').on('click', () => {
      const max = Math.max(...Tunify.products.map(p => p.price));
      filters = { categories: [], brands: [], minPrice: 0, maxPrice: max, search: '', saleOnly: false };
      $('.cat-filter, .brand-filter, #saleOnly').prop('checked', false);
      $('#shopSearch').val('');
      $('#priceSlider').slider('values', [0, max]);
      $('#priceMin').text('0');
      $('#priceMax').text(max.toLocaleString());
      applyFilters();
    });
  }

  function getFiltered() {
    let list = [...Tunify.products];
    if (filters.categories.length) {
      list = list.filter(p => filters.categories.includes(p.category));
    }
    if (filters.brands.length) {
      list = list.filter(p => filters.brands.includes(p.brand));
    }
    if (filters.saleOnly) list = list.filter(p => p.badge === 'sale');
    if (filters.search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(filters.search) ||
        p.brand.toLowerCase().includes(filters.search)
      );
    }
    list = list.filter(p => p.price >= filters.minPrice && p.price <= filters.maxPrice);

    const sort = $('#sortSelect').val();
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'rating') list.sort((a, b) => b.stars - a.stars);
    return list;
  }

  function applyFilters() {
    const list = getFiltered();
    const $grid = $('#shopGrid');
    $grid.empty();
    if (!list.length) {
      $grid.html(`
        <div class="col-12 text-center py-5">
          <i class="fas fa-search fa-2x mb-3" style="color:var(--text-dim)"></i>
          <p style="color:var(--silver)">No instruments match your filters.</p>
          <button class="btn-outline-gold mt-2" id="clearFiltersInline">Clear Filters</button>
        </div>`);
      $('#clearFiltersInline').on('click', () => $('#clearFilters').click());
      return;
    }
    list.forEach(p => $grid.append(Tunify.productCardHTML(p)));
    $('#resultCount').text(`${list.length} product${list.length !== 1 ? 's' : ''}`);
    Tunify.triggerFadeIn();
  }

  function init() {
    try {
      console.log('ShopPage init starting');
      parseURL();
      renderBrandFilters();
      renderCategoryFilters();
      buildSidebar();
      bindEvents();
      applyFilters();
      Tunify.triggerFadeIn();
      console.log('ShopPage init completed successfully');
    } catch (err) {
      console.error('Error in ShopPage init:', err);
    }
  }

  // Auto-run init
  init();
});

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

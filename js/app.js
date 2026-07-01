/* Tunify — shared utilities  (reference pattern: simple global functions) */

const url = 'http://localhost:5000/';

/* ─── Auth helpers ─────────────────────────────────────────── */
const getToken = () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      text: 'You must be logged in to access this page.',
      showConfirmButton: true
    }).then(() => {
      window.location.href = 'login.html';
    });
    return null;
  }
  // Remove wrapping quotes if present
  try {
    return JSON.parse(token);
  } catch (e) {
    return token;
  }
};

const getUserId = () => {
  return sessionStorage.getItem('userId')
    ? JSON.parse(sessionStorage.getItem('userId'))
    : null;
};

/* ─── Cart helpers ──────────────────────────────────────────── */
const getCart = () => {
  let cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
};

const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
};

const updateCartCount = () => {
  const count = getCart().reduce((sum, i) => sum + (i.quantity || 0), 0);
  $('#cartCount').text(count > 0 ? count : '');
};

/* addToCart — called from inline onclick on product cards */
const addToCart = (itemId, qty, description, price, image, stock) => {
  qty = parseInt(qty) || 1;
  stock = parseInt(stock) || 0;
  
  if (stock <= 0) {
    Swal.fire({
      icon: 'error',
      title: 'Out of Stock',
      text: 'This item is currently out of stock.'
    });
    return;
  }

  let cart = getCart();
  const existing = cart.find(i => i.item_id == itemId);
  
  if (existing) {
    if (existing.quantity >= stock) {
      Swal.fire({
        icon: 'warning',
        title: 'Limit Reached',
        text: `You already have the maximum available stock (${stock}) of "${description}" in your cart.`
      });
      return;
    }
    
    if (existing.quantity + qty > stock) {
      const allowed = stock - existing.quantity;
      existing.quantity = stock;
      saveCart(cart);
      Swal.fire({
        icon: 'info',
        title: 'Quantity Adjusted',
        text: `Only ${allowed} more of "${description}" could be added. Your cart is now capped at the maximum available stock (${stock}).`
      });
      return;
    }
    
    existing.quantity += qty;
  } else {
    if (qty > stock) {
      cart.push({
        item_id: itemId,
        description,
        price: parseFloat(price),
        image,
        stock: stock,
        quantity: stock
      });
      saveCart(cart);
      Swal.fire({
        icon: 'info',
        title: 'Quantity Adjusted',
        text: `Requested quantity exceeds stock. Added the maximum available stock (${stock}) of "${description}" to your cart.`
      });
      return;
    }
    
    cart.push({
      item_id: itemId,
      description,
      price: parseFloat(price),
      image,
      stock: stock,
      quantity: qty
    });
  }

  saveCart(cart);
  Swal.fire({
    icon: 'success',
    text: '"' + description + '" added to cart!',
    showConfirmButton: false,
    position: 'bottom-right',
    timer: 1200,
    timerProgressBar: true
  });
};

/* ─── Global Settings Syncer ────────────────────────────────── */
// In-memory cache only (cleared on every page load/hard refresh)
let _settingsCache = null;

const applyGlobalSettings = (callback) => {
  if (_settingsCache) {
    applySettingsToDOM(_settingsCache);
    if (callback) callback(_settingsCache);
    return;
  }

  const apiBase = typeof url !== 'undefined' ? url : 'http://localhost:5000/';
  $.ajax({
    method: 'GET',
    url: `${apiBase}api/v1/settings`,
    dataType: 'json',
    success: function (settings) {
      if (settings) {
        _settingsCache = settings;
        applySettingsToDOM(settings);
        if (callback) callback(settings);
      }
    },
    error: function () {
      const defaults = { store_name: 'Tunify' };
      applySettingsToDOM(defaults);
      if (callback) callback(defaults);
    }
  });
};

const applySettingsToDOM = (settings) => {
  if (!settings) return;
  const name = settings.store_name || 'Tunify';
  $('.store-name-display').text(name);

  // Dynamically update document title - replace all occurrences of "Tunify"
  if (document.title && document.title.includes('Tunify')) {
    document.title = document.title.replace(/Tunify/g, name);
  }
};

// Apply settings as soon as jQuery and DOM are ready.
// Using $(document).ready() ensures this works even when app.js is loaded at
// the bottom of <body> (where DOMContentLoaded may have already fired).
$(document).ready(function () {
  applyGlobalSettings();
});

/* ─── Nav / Footer loader ───────────────────────────────────── */
const loadNav = () => {
  const isAdmin = window.location.pathname.includes('/admin/');
  const prefix = isAdmin ? '../' : '';
  const navFile = isAdmin ? 'components/admin-navbar.html' : 'components/navbar.html';
  $('#tunifyNav').load(prefix + navFile + '?v=' + Date.now(), () => {
    applyGlobalSettings();
    updateCartCount();
    $(window).on('scroll', function () {
      if ($(this).scrollTop() > 40) $('#mainNav').addClass('scrolled');
      else $('#mainNav').removeClass('scrolled');
    });
    // Active nav link
    const page = document.body.dataset.page || '';
    if (page) $(`.nav-link[data-page="${page}"]`).addClass('active');

    // Populate Category Menu dynamically from API
    const $catMenu = $('#navCategoryMenu');
    if ($catMenu.length) {
      const CAT_ICONS = {
        string: 'fa-guitar', percussion: 'fa-drum', keys: 'fa-keyboard',
        wind: 'fa-wind', vocals: 'fa-microphone', accessories: 'fa-plug'
      };
      $.ajax({
        method: 'GET',
        url: `${url}api/v1/categories`,
        dataType: 'json',
        success: function (categories) {
          $catMenu.empty();
          categories.forEach(function (c) {
            const slug = c.name.toLowerCase();
            const display = slug.charAt(0).toUpperCase() + slug.slice(1);
            const icon = CAT_ICONS[slug] || 'fa-music';
            $catMenu.append(`<a class="dropdown-item" href="${prefix}shop.html?cat=${slug}"><i class="fas ${icon} mr-2"></i> ${display}</a>`);
          });
        },
        error: function () {
          console.warn('Nav: could not load categories from API.');
        }
      });
    }

    // Populate Brand Menu dynamically from API
    const $brandMenu = $('#navBrandMenu');
    if ($brandMenu.length) {
      const BRAND_ICONS = {
        fender: 'fa-guitar', gibson: 'fa-guitar', yamaha: 'fa-keyboard',
        roland: 'fa-drum', shure: 'fa-microphone', ibanez: 'fa-guitar',
        marshall: 'fa-volume-up'
      };
      $.ajax({
        method: 'GET',
        url: `${url}api/v1/brands`,
        dataType: 'json',
        success: function (brands) {
          $brandMenu.empty();
          brands.forEach(function (b) {
            const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const icon = BRAND_ICONS[slug] || 'fa-tag';
            $brandMenu.append(`<a class="dropdown-item" href="${prefix}shop.html?brand=${slug}"><i class="fas ${icon} mr-2"></i> ${b.name}</a>`);
          });
        },
        error: function () {
          console.warn('Nav: could not load brands from API.');
        }
      });
    }

    // Toggle dropdown items based on login and admin status
    const token = sessionStorage.getItem('token');
    const isUserAdmin = sessionStorage.getItem('tunify_admin') === 'true';

    if (token) {
      $('#navLogin').hide();
      $('#navRegister').hide();
      $('#navProfile').show();
      if (isUserAdmin) {
        $('#navAdmin').show();
      } else {
        $('#navAdmin').hide();
      }
      $('#navDivider').show();
      $('#logout-link').show();

      // Silent session verification - check if the logged in user has been deactivated in DB
      $.ajax({
        method: 'GET',
        url: `${url}api/v1/addresses`,
        headers: {
          'Authorization': 'Bearer ' + getToken()
        },
        error: function (jqXHR) {
          console.warn('Session validation failed:', jqXHR.status);
        }
      });
    } else {
      $('#navLogin').show();
      $('#navRegister').show();
      $('#navProfile').hide();
      $('#navAdmin').hide();
      $('#navDivider').hide();
      $('#logout-link').hide();
    }

    // Setup Split Click navigation for navbar dropdowns
    $('#tunifyNav').on('click', '.dropdown-toggle', function (e) {
      const isChevronClick = $(e.target).closest('.ml-05').length > 0;
      if (!isChevronClick) {
        // Direct click on the menu text -> Navigate to href
        const href = $(this).attr('href');
        if (href && href !== '#') {
          window.location.href = href;
        }
      } else {
        // Click on the chevron -> Toggle dropdown
        e.preventDefault();
        e.stopPropagation();
        const $parent = $(this).parent();
        $parent.toggleClass('show');
        $parent.find('.dropdown-menu').toggleClass('show');
      }
    });

    // Trigger fade-in animations once nav is loaded
    $('.fade-in-up').addClass('visible');
  });
};

const loadFooter = () => {
  const isAdmin = window.location.pathname.includes('/admin/');
  const prefix = isAdmin ? '../' : '';
  const footerFile = isAdmin ? 'components/admin-footer.html' : 'components/footer.html';
  $('#tunifyFooter').load(prefix + footerFile + '?v=' + Date.now(), () => {
    applyGlobalSettings();
  });
};

/* ─── SweetAlert2 themed helper ────────────────────────────── */
const swalToast = (icon, title, timer = 2500) => Swal.fire({
  icon,
  title,
  showConfirmButton: false,
  timer,
  timerProgressBar: true,
  position: 'bottom-right'
});

/* ─── Bootbox confirm helper ────────────────────────────────── */
const confirmDialog = (message, callback) => {
  if (typeof bootbox === 'undefined') {
    callback(window.confirm(message));
    return;
  }
  bootbox.confirm({
    message,
    buttons: {
      confirm: { label: '<i class="fa fa-check mr-1"></i> Yes', className: 'btn-gold' },
      cancel: { label: '<i class="fa fa-times mr-1"></i> No', className: 'btn-outline-secondary' }
    },
    callback
  });
};

/* ─── Tunify namespace compatibility layer ──────────────────── */
window.Tunify = {
  products: TunifyProducts,
  brands: TunifyBrands,
  categories: ['string', 'percussion', 'keys', 'wind', 'vocals', 'accessories'],
  
  session: {
    isLoggedIn() {
      return !!sessionStorage.getItem('token');
    },
    set(user) {
      if (user.token) {
        sessionStorage.setItem('token', JSON.stringify(user.token));
      }
      if (user.id) {
        sessionStorage.setItem('userId', JSON.stringify(user.id));
      }
      if (user.email) {
        sessionStorage.setItem('tunify_email', user.email);
      }
      if (user.name) {
        sessionStorage.setItem('tunify_name', user.name);
      }
    }
  },
  
  getProduct(id) {
    return TunifyProducts.find(p => p.id == id || p.id === parseInt(id));
  },
  
  brandFromSlug(slug) {
    const b = TunifyBrands.find(x => x.slug === slug);
    return b ? b.name : null;
  },
  
  badgeHTML(badge) {
    return badge ? `<span class="prod-badge badge-${badge}">${badge}</span>` : '';
  },
  
  starHTML(stars) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= stars) {
        html += '<i class="fas fa-star text-warning"></i>';
      } else {
        html += '<i class="far fa-star text-warning"></i>';
      }
    }
    return html;
  },
  
  priceHTML(price, origPrice) {
    if (origPrice) {
      return `<span class="original">₱${origPrice.toLocaleString()}</span>₱${price.toLocaleString()}`;
    }
    return `₱${price.toLocaleString()}`;
  },
  
  cart: {
    add(itemId, qty) {
      const p = TunifyProducts.find(x => x.id == itemId || x.id === parseInt(itemId));
      if (p) {
        addToCart(itemId, qty, p.name, p.price, p.image, p.stock);
      }
    }
  },
  
  toast(message, icon) {
    swalToast('success', message);
  },
  
  productCardHTML(p) {
    return `
      <div class="col-6 col-md-4 col-lg-3 mb-4">
        <a class="prod-card h-100 d-block text-decoration-none" href="product.html?id=${p.id}">
          <div class="prod-img-area">
            ${p.badge ? `<span class="prod-badge badge-${p.badge}">${p.badge}</span>` : ''}
            ${p.image ? `<img src="${p.image}" class="prod-card-img img-fluid" alt="${p.name}">` : `<i class="fas ${p.icon}"></i>`}
          </div>
          <div class="prod-body">
            <p class="prod-category">${p.category}</p>
            <p class="prod-name">${p.name}</p>
            <p class="prod-brand">${p.brand}</p>
            <div class="prod-footer">
              <div class="prod-price">${p.origPrice ? `<span class="original">₱${p.origPrice.toLocaleString()}</span>` : ''}₱${p.price.toLocaleString()}</div>
              <button type="button" class="btn-add-cart" data-id="${p.id}" data-desc="${p.name}" data-price="${p.price}" data-image="${p.image || ''}" data-stock="${p.stock}">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </a>
      </div>`;
  },
  
  triggerFadeIn() {
    $('.fade-in-up').addClass('visible');
  },
  
  initCommon(page) {
    try {
      if (typeof updateCartCount === 'function') updateCartCount();
      if (page) {
        $('.navbar-nav .nav-link').removeClass('active');
        $(`.navbar-nav .nav-link[data-page="${page}"]`).addClass('active');
      }
      this.triggerFadeIn();
      console.log('Tunify.initCommon completed successfully');
    } catch (err) {
      console.error('Error in Tunify.initCommon:', err);
    }
  }
};

// Global Event Handler for Logout Actions
$(document).on('click', '#logoutBtn, #logout, #logout-link', function (e) {
  e.preventDefault();
  confirmDialog('Are you sure you want to log out?', function (result) {
    if (result) {
      sessionStorage.clear();
      Swal.fire({
        text: 'Logged out',
        showConfirmButton: false,
        position: 'bottom-right',
        timer: 1000,
        timerProgressBar: true
      }).then(function () {
        const isAdminPage = window.location.pathname.includes('/admin/');
        window.location.href = isAdminPage ? '../login.html' : 'login.html';
      });
    }
  });
});

// ── Global 401 Interceptor ────────────────────────────────────────────────────
// If the backend returns 401 (e.g. account was deactivated mid-session),
// clear the session and redirect to login with an explanation.
$(document).ajaxError(function (event, jqXHR) {
  if (jqXHR.status === 401) {
    const msg = jqXHR.responseJSON && jqXHR.responseJSON.message
      ? jqXHR.responseJSON.message
      : 'Your session has expired. Please log in again.';

    // Only act if we actually had a token (avoid redirect loops on login page)
    if (sessionStorage.getItem('token')) {
      sessionStorage.clear();
      Swal.fire({
        icon: 'warning',
        title: 'Session Ended',
        text: msg,
        showConfirmButton: true,
        confirmButtonText: 'Go to Login'
      }).then(function () {
        const isAdminPage = window.location.pathname.includes('/admin/');
        window.location.href = isAdminPage ? '../login.html' : 'login.html';
      });
    }
  }
});

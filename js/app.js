/* Tunify — shared utilities  (reference pattern: simple global functions) */

const url = 'http://localhost:4000/';

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
  return JSON.parse(token);
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
  let cart = getCart();
  const existing = cart.find(i => i.item_id == itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      item_id: itemId,
      description,
      price: parseFloat(price),
      image,
      stock: parseInt(stock) || 0,
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

/* ─── Nav / Footer loader ───────────────────────────────────── */
const loadNav = () => {
  const isAdmin = window.location.pathname.includes('/admin/');
  const prefix = isAdmin ? '../' : '';
  const navFile = isAdmin ? 'components/admin-navbar.html' : 'components/navbar.html';
  $('#tunifyNav').load(prefix + navFile, () => {
    updateCartCount();
    $(window).on('scroll', function () {
      if ($(this).scrollTop() > 40) $('#mainNav').addClass('scrolled');
      else $('#mainNav').removeClass('scrolled');
    });
    // Active nav link
    const page = document.body.dataset.page || '';
    if (page) $(`.nav-link[data-page="${page}"]`).addClass('active');

    // Trigger fade-in animations once nav is loaded
    $('.fade-in-up').addClass('visible');
  });
};

const loadFooter = () => {
  const isAdmin = window.location.pathname.includes('/admin/');
  const prefix = isAdmin ? '../' : '';
  const footerFile = isAdmin ? 'components/admin-footer.html' : 'components/footer.html';
  $('#tunifyFooter').load(prefix + footerFile);
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
  }
};


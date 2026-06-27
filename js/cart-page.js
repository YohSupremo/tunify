$(document).ready(function () {

    document.body.dataset.page = 'cart';
    loadNav();
    loadFooter();

    /* ── Render cart table ──────────────────────────────────────── */
    function renderCart() {
        let cart = getCart();
        const $body = $('#cartBody');
        const $content = $('#cartContent');
        const $empty = $('#cartEmpty');

        $body.empty();

        if (!cart.length) {
            $content.hide();
            $empty.show();
            return;
        }
        $empty.hide();
        $content.show();

        cart.forEach(function (item, idx) {
            const subtotal = item.price * item.quantity;
            const isSelected = item.selected !== false;
            
            $body.append(`
                <tr>
                  <td style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" class="cart-item-select" data-idx="${idx}" ${isSelected ? 'checked' : ''} style="transform: scale(1.2); cursor: pointer;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <img src="${item.image || ''}" width="60" onerror="this.style.display='none'" style="margin-right: 10px; border-radius: 4px; border: 1px solid var(--border);" />
                    ${item.description}
                  </td>
                  <td style="vertical-align: middle; white-space: nowrap;">₱ ${item.price.toFixed(2)}</td>
                  <td style="vertical-align: middle;">
                    <div class="d-flex align-items-center" style="gap: .25rem;">
                      <button type="button" class="btn btn-sm btn-outline-secondary btn-qty-dec" data-idx="${idx}" style="padding: 0.1rem 0.4rem; font-size: 0.8rem; line-height: 1; border-color: var(--border); color: var(--text);">-</button>
                      <input type="number" class="form-control form-control-sm text-center cart-qty-input" data-idx="${idx}" value="${item.quantity}" min="1" max="${item.stock}" style="width: 50px; padding: 0.15rem 0.2rem; font-size: 0.85rem; height: 26px; background: var(--surface); border: 1px solid var(--border); color: var(--text); text-align: center;" />
                      <button type="button" class="btn btn-sm btn-outline-secondary btn-qty-inc" data-idx="${idx}" style="padding: 0.1rem 0.4rem; font-size: 0.8rem; line-height: 1; border-color: var(--border); color: var(--text);">+</button>
                    </div>
                  </td>
                  <td style="vertical-align: middle; white-space: nowrap;">₱ ${subtotal.toFixed(2)}</td>
                  <td style="vertical-align: middle; text-align: center;">
                    <button class="btn btn-danger btn-sm remove-item" data-idx="${idx}" style="border-radius: 4px; padding: 2px 8px;">&times;</button>
                  </td>
                </tr>`);
        });

        // Update select all checkbox state
        const allChecked = cart.every(item => item.selected !== false);
        $('#selectAllCart').prop('checked', allChecked);

        updateSummary();
    }

    /* ── Summary ────────────────────────────────────────────────── */
    function updateSummary() {
        let cart = getCart();
        let subtotal = 0;
        cart.forEach(function (item) {
            if (item.selected !== false) {
                subtotal += item.price * item.quantity;
            }
        });
        const shipping = subtotal > 0 ? 100.00 : 0.00;
        $('#summarySubtotal').text('₱ ' + subtotal.toFixed(2));
        $('#summaryShipping').text('₱ ' + shipping.toFixed(2));
        $('#summaryTotal').text('₱ ' + (subtotal + shipping).toFixed(2));
    }

    /* ── Remove item ────────────────────────────────────────────── */
    $('#cartBody').on('click', '.remove-item', function () {
        const idx = parseInt($(this).data('idx'));
        let cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCart();
    });

    /* ── Selection Handlers ──────────────────────────────────────── */
    // Select all handler
    $(document).off('change', '#selectAllCart').on('change', '#selectAllCart', function () {
        const isChecked = this.checked;
        let cart = getCart();
        cart.forEach(function (item) {
            item.selected = isChecked;
        });
        saveCart(cart);
        $('.cart-item-select').prop('checked', isChecked);
        updateSummary();
    });

    // Individual select handler
    $('#cartBody').on('change', '.cart-item-select', function () {
        const idx = parseInt($(this).data('idx'));
        const isChecked = this.checked;
        let cart = getCart();
        if (cart[idx]) {
            cart[idx].selected = isChecked;
            saveCart(cart);
        }
        
        const allChecked = cart.every(item => item.selected !== false);
        $('#selectAllCart').prop('checked', allChecked);
        
        updateSummary();
    });

    /* ── Quantity Adjustment Handlers ───────────────────────────── */
    // Quantity decrement
    $('#cartBody').on('click', '.btn-qty-dec', function () {
        const idx = parseInt($(this).data('idx'));
        let cart = getCart();
        if (cart[idx] && cart[idx].quantity > 1) {
            cart[idx].quantity--;
            saveCart(cart);
            renderCart();
        }
    });

    // Quantity increment
    $('#cartBody').on('click', '.btn-qty-inc', function () {
        const idx = parseInt($(this).data('idx'));
        let cart = getCart();
        if (cart[idx]) {
            const stock = parseInt(cart[idx].stock) || 0;
            if (cart[idx].quantity < stock) {
                cart[idx].quantity++;
                saveCart(cart);
                renderCart();
            } else {
                swalToast('warning', `Only ${stock} items in stock.`);
            }
        }
    });

    // Quantity manual input change
    $('#cartBody').on('change input', '.cart-qty-input', function () {
        const idx = parseInt($(this).data('idx'));
        const $input = $(this);
        let val = parseInt($input.val());
        let cart = getCart();
        if (cart[idx]) {
            const stock = parseInt(cart[idx].stock) || 0;
            if (isNaN(val) || val < 1) {
                cart[idx].quantity = 1;
            } else if (val > stock) {
                swalToast('warning', `Only ${stock} items in stock.`);
                cart[idx].quantity = stock;
            } else {
                cart[idx].quantity = val;
            }
            saveCart(cart);
            // Refresh render to ensure input displays updated value
            renderCart();
        }
    });

    /* ── Checkout ───────────────────────────────────────────────── */
    $('#checkoutBtn').on('click', function (e) {
        e.preventDefault();
        const cart = getCart();
        const checkedItems = cart.filter(item => item.selected !== false);
        if (!checkedItems.length) {
            Swal.fire({ icon: 'warning', title: 'No Items Selected', text: 'Select items in your cart before checking out.' });
            return;
        }

        const token = getToken();
        if (!token) return;

        // Save selected items to checkout storage
        localStorage.setItem('tunify_checkout_items', JSON.stringify(checkedItems));
        
        // Redirect to checkout.html
        window.location.href = 'checkout.html';
    });

    /* ── Init ──────────────────────────────────────────────────── */
    renderCart();

});

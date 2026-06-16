$(document).ready(function () {

    document.body.dataset.page = 'cart';
    loadNav();
    loadFooter();

    let promoApplied = false;

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

        let total = 0;
        cart.forEach(function (item, idx) {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            $body.append(`
                <tr>
                  <td><img src="${item.image || ''}" width="60" onerror="this.style.display='none'"> ${item.description}</td>
                  <td>₱ ${item.price.toFixed(2)}</td>
                  <td>${item.quantity}</td>
                  <td>₱ ${subtotal.toFixed(2)}</td>
                  <td><button class="btn btn-danger btn-sm remove-item" data-idx="${idx}">&times;</button></td>
                </tr>`);
        });

        updateSummary(total);
    }

    /* ── Summary ────────────────────────────────────────────────── */
    function updateSummary(subtotal) {
        if (subtotal === undefined) {
            subtotal = getCart().reduce((s, i) => s + i.price * i.quantity, 0);
        }
        const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
        $('#summarySubtotal').text('₱ ' + subtotal.toFixed(2));
        $('#summaryTotal').text('₱ ' + (subtotal - discount).toFixed(2));
    }

    /* ── Remove item ────────────────────────────────────────────── */
    $('#cartBody').on('click', '.remove-item', function () {
        const idx = parseInt($(this).data('idx'));
        let cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCart();
    });

    /* ── Promo code ─────────────────────────────────────────────── */
    $('#applyPromo').on('click', function () {
        const code = $('#promoInput').val().trim().toUpperCase();
        if (code === 'TUNIFY10') {
            promoApplied = true;
            $(this).text('Applied ✓').attr('disabled', true);
            updateSummary();
            swalToast('success', '10% discount applied!');
        } else {
            swalToast('error', 'Invalid promo code.');
        }
    });

    /* ── Checkout ───────────────────────────────────────────────── */
    $('#checkoutBtn').on('click', function () {
        const cart = getCart();
        if (!cart.length) {
            Swal.fire({ icon: 'warning', title: 'Cart Empty', text: 'Add items before checking out.' });
            return;
        }

        // Build a new order and save to TunifyOrders in localStorage
        const orderId = 'TN-' + Math.floor(1000 + Math.random() * 9000);
        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const order = {
            id: orderId,
            date: new Date().toISOString().slice(0, 10),
            status: 'Processing',
            total,
            items: cart.map(i => i.description)
        };

        const stored = localStorage.getItem('tunify_orders');
        const orders = stored ? JSON.parse(stored) : [...TunifyOrders];
        orders.unshift(order);
        localStorage.setItem('tunify_orders', JSON.stringify(orders));

        saveCart([]);

        Swal.fire({
            icon: 'success',
            title: 'Order Placed!',
            text: `Order ${orderId} has been created. Redirecting to your profile…`,
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        }).then(function () {
            window.location.href = 'profile.html';
        });
    });

    /* ── Init ──────────────────────────────────────────────────── */
    renderCart();

});

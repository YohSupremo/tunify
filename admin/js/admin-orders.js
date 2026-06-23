$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-orders';
    loadNav();
    const url = 'http://localhost:5000/api/v1/';

    /* ── Data helpers ───────────────────────────────────────────── */
    let ordersList = [];

    function getOrders() {
        return ordersList;
    }

    function loadOrdersFromDB() {
        $.ajax({
            method: "GET",
            url: `${url}orders`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (data) {
                ordersList = data;
                table = initTable();
            },
            error: function (err) {
                console.error("Failed to load orders:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch orders from server.' });
            }
        });
    }

    function statusBadge(status) {
        var cls = {
            'Pending': 'badge-secondary text-white',
            'Processing': 'badge-warning text-dark',
            'Shipped': 'badge-info text-white',
            'Delivered': 'badge-success',
            'Cancelled': 'badge-danger'
        };
        return '<span class="badge ' + (cls[status] || 'badge-secondary') + '">' + status + '</span>';
    }

    /* ── DataTable init ─────────────────────────────────────────── */
    var table = null;
    var currentOrder = null;

    function initTable() {
        if ($.fn.DataTable.isDataTable('#ordersTable')) {
            $('#ordersTable').DataTable().destroy();
        }

        var data = getOrders().map(function (o) {
            return [
                o.id,
                o.date,
                (o.items || []).join(', '),
                '₱ ' + (o.total || 0).toLocaleString(),
                statusBadge(o.status),
                '<button class="btn btn-sm btn-outline-info view-btn" data-id="' + o.id + '"><i class="fas fa-eye"></i> View</button>'
            ];
        });

        return $('#ordersTable').DataTable({
            data: data,
            pageLength: 10,
            order: [[1, 'desc']],
            language: { searchPlaceholder: 'Search orders…', search: '' }
        });
    }

    /* ── View button (delegated) ────────────────────────────────── */
    $('#ordersTable').on('click', '.view-btn', function () {
        var id = $(this).data('id');
        
        // Fetch detailed order details from backend API
        $.ajax({
            method: "GET",
            url: `${url}orders/${id}`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (o) {
                currentOrder = o;

                $('#orderModalTitle').text('Invoice ' + o.id);
                
                // Construct a premium invoice/receipt layout
                let itemsHtml = (o.items || []).map(function (item) {
                    const price = parseFloat(item.price || 0);
                    const qty = parseInt(item.quantity || 1);
                    const subtotal = price * qty;
                    return `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-right">₱ ${price.toLocaleString()}</td>
                            <td class="text-center">${qty}</td>
                            <td class="text-right">₱ ${subtotal.toLocaleString()}</td>
                        </tr>
                    `;
                }).join('');

                const orderSubtotal = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
                const grandTotal = orderSubtotal + parseFloat(o.shipping_fee || 100);

                const shippingAddress = `
                    <div style="font-size: 0.85rem; color: var(--silver); line-height: 1.4;">
                        <strong>${o.customer_name || 'Guest Customer'}</strong><br/>
                        ${o.shipping_street}<br/>
                        ${o.shipping_city}, ${o.shipping_province} ${o.shipping_zip}<br/>
                        ${o.customer_phone ? 'Phone: ' + o.customer_phone + '<br/>' : ''}
                        Email: ${o.customer_email}
                    </div>
                `;

                const paymentMethodLabel = {
                    'cod': 'Cash on Delivery (COD)',
                    'gcash': 'GCash',
                    'card': 'Credit/Debit Card',
                    'bank_transfer': 'Bank Transfer'
                }[o.payment_method] || 'Cash on Delivery (COD)';

                const paymentStatusBadge = o.payment_status === 'paid'
                    ? '<span class="badge badge-success ml-2">Paid</span>'
                    : '<span class="badge badge-secondary ml-2">Pending</span>';

                const receiptHtml = `
                    <div style="font-family: var(--font-body); color: var(--text);">
                        <!-- Invoice Header -->
                        <div class="row mb-3">
                            <div class="col-sm-6">
                                <h6 class="text-uppercase text-muted" style="font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;">Customer Details & Shipping</h6>
                                ${shippingAddress}
                            </div>
                            <div class="col-sm-6 text-sm-right">
                                <h6 class="text-uppercase text-muted mt-2 mt-sm-0" style="font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;">Order Details</h6>
                                <div style="font-size: 0.85rem; color: var(--silver); line-height: 1.4;">
                                    <strong>Date Placed:</strong> ${o.date_placed}<br/>
                                    <strong>Ship Date:</strong> ${o.date_shipped || 'Processing'}<br/>
                                    <strong>Payment:</strong> ${paymentMethodLabel}${paymentStatusBadge}
                                </div>
                            </div>
                        </div>

                        <!-- Invoice Items Table -->
                        <div class="table-responsive">
                            <table class="table table-sm table-bordered mt-3 text-white" style="background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05);">
                                <thead>
                                    <tr style="background: rgba(255,255,255,0.05);">
                                        <th>Item Description</th>
                                        <th class="text-right" style="width: 120px;">Price</th>
                                        <th class="text-center" style="width: 80px;">Qty</th>
                                        <th class="text-right" style="width: 130px;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>

                        <!-- Subtotals and Totals -->
                        <div class="row justify-content-end mt-2">
                            <div class="col-md-5">
                                <table class="table table-sm table-clear text-white" style="font-size: 0.88rem;">
                                    <tbody>
                                        <tr>
                                            <td class="left">Subtotal</td>
                                            <td class="right text-right">₱ ${orderSubtotal.toLocaleString()}</td>
                                        </tr>
                                        <tr>
                                            <td class="left">Shipping Fee</td>
                                            <td class="right text-right">₱ ${parseFloat(o.shipping_fee || 100).toLocaleString()}</td>
                                        </tr>
                                        <tr style="font-size: 1rem; font-weight: 700; color: var(--gold); border-top: 1.5px solid var(--gold);">
                                            <td class="left">Grand Total</td>
                                            <td class="right text-right">₱ ${grandTotal.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="mt-2">
                            <strong>Status:</strong> ${statusBadge(o.status)}
                        </div>
                    </div>
                `;

                $('#orderModalBody').html(receiptHtml);
                $('#orderStatusSelect').val(o.status);

                $('#orderModal').modal('show');
            },
            error: function (err) {
                console.error("Failed to load order details:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch order invoice details.' });
            }
        });
    });

    /* ── Update Order Status ────────────────────────────────────── */
    $('#btnUpdateStatus').on('click', function () {
        if (!currentOrder) return;
        var o = currentOrder;
        var newStatus = $('#orderStatusSelect').val();

        bootbox.confirm({
            title: 'Update Status?',
            message: 'Are you sure you want to change the status of order <strong>' + o.id + '</strong> to <strong>' + newStatus + '</strong>?',
            buttons: {
                cancel: { label: '<i class="fa fa-times"></i> Cancel', className: 'btn-outline-secondary' },
                confirm: { label: '<i class="fa fa-check"></i> Update', className: 'btn-gold' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "PUT",
                        url: `${url}orders/${o.id}/status`,
                        data: JSON.stringify({ status: newStatus }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            swalToast('success', 'Order status updated successfully!');
                            $('#orderModal').modal('hide');
                            loadOrdersFromDB();
                        },
                        error: function (err) {
                            console.error("Failed to update order status:", err);
                            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Could not update order status.' });
                        }
                    });
                }
            }
        });
    });

    // Initialize Page
    loadOrdersFromDB();
});

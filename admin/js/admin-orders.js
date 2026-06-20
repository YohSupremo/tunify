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
        var orders = getOrders();
        var o = orders.find(function (x) { return x.id === id; });
        if (!o) return;

        currentOrder = o;

        $('#orderModalTitle').text('Order ' + o.id);
        $('#orderModalBody').html(
            '<table class="table table-sm table-bordered"><thead><tr><th>Item</th></tr></thead><tbody>' +
            (o.items || []).map(function (item) { return '<tr><td>' + item + '</td></tr>'; }).join('') +
            '</tbody></table>' +
            '<div class="d-flex justify-content-between mt-2"><span>Shipping Fee:</span><strong>₱ 100.00</strong></div>' +
            '<div class="d-flex justify-content-between"><span>Grand Total:</span><strong>₱ ' + (o.total || 0).toLocaleString() + '</strong></div>' +
            '<div class="mt-2">Status: ' + statusBadge(o.status) + '</div>'
        );

        if (o.status === 'Processing') $('#btnMarkShipped').show();
        else $('#btnMarkShipped').hide();

        $('#orderModal').modal('show');
    });

    /* ── Mark as Shipped ────────────────────────────────────────── */
    $('#btnMarkShipped').on('click', function () {
        if (!currentOrder) return;
        var o = currentOrder;

        bootbox.confirm({
            title: 'Mark as Shipped?',
            message: 'Mark order <strong>' + o.id + '</strong> as Shipped?',
            buttons: {
                cancel: { label: '<i class="fa fa-times"></i> Cancel', className: 'btn-outline-secondary' },
                confirm: { label: '<i class="fa fa-shipping-fast"></i> Mark Shipped', className: 'btn-gold' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "PUT",
                        url: `${url}orders/${o.id}/ship`,
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            swalToast('success', 'Order ' + o.id + ' marked as Shipped!');
                            $('#orderModal').modal('hide');
                            loadOrdersFromDB();
                        },
                        error: function (err) {
                            console.error("Failed to ship order:", err);
                            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Could not ship order.' });
                        }
                    });
                }
            }
        });
    });

    // Initialize Page
    loadOrdersFromDB();
});

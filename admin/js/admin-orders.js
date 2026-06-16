$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-orders';
    loadNav();
    loadFooter();

    /* ── Data helpers ───────────────────────────────────────────── */
    var ORDERS_KEY = 'tunify_orders';

    function getOrders() {
        var s = localStorage.getItem(ORDERS_KEY);
        return s ? JSON.parse(s) : TunifyOrders.slice();
    }

    function saveOrders(list) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
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
    var table = initTable();
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
                    var orders = getOrders();
                    var idx = orders.findIndex(function (x) { return x.id === o.id; });
                    if (idx !== -1) {
                        orders[idx].status = 'Shipped';
                        orders[idx].date_shipped = new Date().toISOString().slice(0, 10);
                        saveOrders(orders);
                        swalToast('success', 'Order ' + o.id + ' marked as Shipped!');
                        $('#orderModal').modal('hide');
                        table = initTable();
                    }
                }
            }
        });
    });

});

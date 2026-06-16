$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-stock';
    loadNav();
    loadFooter();

    /* ── Data helpers ───────────────────────────────────────────── */
    function getProducts() {
        var s = localStorage.getItem('tunify_products');
        return s ? JSON.parse(s) : TunifyProducts.slice();
    }

    function saveProducts(list) {
        localStorage.setItem('tunify_products', JSON.stringify(list));
    }

    function stockStatus(qty) {
        if (qty === 0) return '<span class="badge badge-danger">Out of Stock</span>';
        if (qty <= 5) return '<span class="badge badge-warning text-dark">Low Stock</span>';
        return '<span class="badge badge-success">In Stock</span>';
    }

    /* ── DataTable init ─────────────────────────────────────────── */
    var table = initTable();

    function initTable() {
        if ($.fn.DataTable.isDataTable('#stockTable')) {
            $('#stockTable').DataTable().destroy();
        }

        var data = getProducts().map(function (p) {
            return [
                p.id,
                p.name,
                p.category.charAt(0).toUpperCase() + p.category.slice(1),
                p.stock,
                stockStatus(p.stock),
                '<button class="btn btn-sm btn-outline-info edit-stock-btn" data-id="' + p.id + '"><i class="fas fa-edit"></i> Edit</button>'
            ];
        });

        return $('#stockTable').DataTable({
            data: data,
            pageLength: 15,
            order: [[3, 'asc']],
            language: { searchPlaceholder: 'Search items…', search: '' },
            createdRow: function (row, rowData) {
                var qty = parseInt(rowData[3]);
                if (qty === 0) $(row).css('background', 'rgba(239,68,68,0.08)');
                else if (qty <= 5) $(row).css('background', 'rgba(251,191,36,0.08)');
            }
        });
    }

    /* ── Edit stock button (delegated) ──────────────────────────── */
    $('#stockTable').on('click', '.edit-stock-btn', function () {
        var id = parseInt($(this).data('id'));
        var p = getProducts().find(function (x) { return x.id === id; });
        if (!p) return;

        $('#stockItemId').val(p.id);
        $('#stockItemName').text(p.name);
        $('#stockQty').val(p.stock);
        $('#stockModal').modal('show');
    });

    /* ── Form submit ────────────────────────────────────────────── */
    $('#stockForm').on('submit', function (e) {
        e.preventDefault();
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }

        var id = parseInt($('#stockItemId').val());
        var newQty = parseInt($('#stockQty').val());
        var products = getProducts();
        var idx = products.findIndex(function (p) { return p.id === id; });

        if (idx !== -1) {
            products[idx].stock = newQty;
            saveProducts(products);
            swalToast('success', 'Stock updated for "' + products[idx].name + '"');
        }

        $('#stockModal').modal('hide');
        table = initTable();
    });

});

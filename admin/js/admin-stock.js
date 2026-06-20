$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-stock';
    loadNav();
    loadFooter();

    const url = 'http://localhost:5000/api/v1/';

    const getToken = () => {
        const token = sessionStorage.getItem('token')
        if (!token) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to access this page.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = '../login.html'
            })
            return null;
        }
        return JSON.parse(token)
    }

    let stocksList = [];

    // 1. Fetch stocks from Database
    const loadStocksFromDB = () => {
        $.ajax({
            method: "GET",
            url: `${url}stocks`,
            dataType: "json",
            success: function (data) {
                stocksList = data; // Store full objects [{id, name, category, stock}]
                initTable();
            },
            error: function (err) {
                console.error("Failed to load stocks:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch stock levels from server.' });
            }
        });
    }

    const getProducts = () => stocksList;

    function stockStatus(qty) {
        if (qty === 0) return '<span class="badge badge-danger">Out of Stock</span>';
        if (qty <= 5) return '<span class="badge badge-warning text-dark">Low Stock</span>';
        return '<span class="badge badge-success">In Stock</span>';
    }

    /* ── DataTable init ─────────────────────────────────────────── */
    var table = null;

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

        table = $('#stockTable').DataTable({
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

        $.ajax({
            method: "PUT",
            url: `${url}stocks`,
            data: JSON.stringify({ 
                itemId: id, 
                quantity: newQty 
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (res) {
                Swal.fire({
                    icon: 'success',
                    text: 'Stock updated successfully!',
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1500,
                    timerProgressBar: true
                });
                $('#stockModal').modal('hide');
                loadStocksFromDB();
            },
            error: function (err) {
                console.error(err);
                var errMsg = err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "Failed to update stock level.";
                Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true });
            }
        });
    });

    // Initialize Page
    loadStocksFromDB();
});

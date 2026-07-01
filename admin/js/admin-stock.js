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
    let lowStockThreshold = 5;
    let activeFilter = 'all';

    /* ── Custom DataTables status filter ──────────────────────────── */
    $.fn.dataTable.ext.search.push(function (settings, data) {
        if (settings.nTable.id !== 'stockTable') return true;
        if (activeFilter === 'all') return true;
        var qty = parseInt(data[3]);
        if (activeFilter === 'outofstock') return qty === 0;
        if (activeFilter === 'lowstock')   return qty > 0 && qty <= lowStockThreshold;
        if (activeFilter === 'instock')    return qty > lowStockThreshold;
        return true;
    });

    function applyFilter(filterKey) {
        activeFilter = filterKey;
        // Update active button state
        $('.stock-filter-btn').css('opacity', '0.55');
        $('.stock-filter-btn[data-filter="' + filterKey + '"]').css('opacity', '1');
        if (table) table.draw();
    }

    // Fetch stocks from Database
    const loadStocksFromDB = () => {
        $.ajax({
            method: "GET",
            url: `${url}stocks`,
            dataType: "json",
            success: function (data) {
                stocksList = data; // Store full objects [{id, name, category, stock, price, supplier_id}]
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
        if (qty <= lowStockThreshold) return '<span class="badge badge-warning text-dark">Low Stock</span>';
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
                '<button class="btn btn-sm btn-outline-info edit-stock-btn" data-id="' + p.id + '"><i class="fas fa-cubes"></i> Restock</button>'
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
                else if (qty <= lowStockThreshold) $(row).css('background', 'rgba(251,191,36,0.08)');
            }
        });

        // Apply any pending URL filter param after table is ready
        var urlParams = new URLSearchParams(window.location.search);
        var filterParam = urlParams.get('filter');
        if (filterParam && ['outofstock', 'lowstock', 'instock'].includes(filterParam)) {
            applyFilter(filterParam);
        }
    }

    /* ── Filter button click handler ────────────────────────────── */
    $(document).on('click', '.stock-filter-btn', function () {
        var f = $(this).data('filter');
        applyFilter(f);
    });

    /* ── Edit stock button (delegated) ──────────────────────────── */
    $('#stockTable').on('click', '.edit-stock-btn', function () {
        var id = parseInt($(this).data('id'));
        var p = getProducts().find(function (x) { return x.id === id; });
        if (!p) return;

        $('#stockItemId').val(p.id);
        $('#stockItemName').text(p.name);
        $('#stockQty').val('');
        $('#restockCost').val(p.cost_price ? Math.round(p.cost_price) : 0);

        $('#stockForm').removeClass('was-validated');
        $('#stockModal').modal('show');
    });

    /* ── Single Restock Form submit ────────────────────────────────── */
    $('#stockForm').on('submit', function (e) {
        e.preventDefault();
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }

        var id = parseInt($('#stockItemId').val());
        var qtyToAdd = parseInt($('#stockQty').val());
        var cost = parseFloat($('#restockCost').val());

        if (isNaN(qtyToAdd) || qtyToAdd <= 0 || isNaN(cost) || cost <= 0) {
            Swal.fire({
                icon: 'error',
                text: 'Quantity to add and unit cost price must be positive numbers greater than zero.',
                showConfirmButton: false,
                position: 'center',
                timer: 2000,
                timerProgressBar: true
            });
            return;
        }

        const p = getProducts().find(x => x.id === id);
        if (p && cost > p.price) {
            Swal.fire({
                icon: 'error',
                text: `Unit cost price (₱${cost.toLocaleString()}) cannot exceed the store selling price (₱${p.price.toLocaleString()}).`,
                showConfirmButton: false,
                position: 'center',
                timer: 2000,
                timerProgressBar: true
            });
            return;
        }

        $.ajax({
            method: "POST",
            url: `${url}stocks/bulk-restock`,
            data: JSON.stringify({ 
                restocks: [{
                    itemId: id, 
                    quantityToAdd: qtyToAdd,
                    costPrice: cost
                }]
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (res) {
                Swal.fire({
                    icon: 'success',
                    text: 'Stock restocked successfully!',
                    showConfirmButton: false,
                    position: 'center',
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
                    : "Failed to restock level.";
                Swal.fire({ icon: 'error', text: errMsg, showConfirmButton: false, position: 'center', timer: 2000, timerProgressBar: true });
            }
        });
    });

    /* ── Restock Instruments (Multiple) Handlers ────────────────────── */
    
    // Open restock modal
    $('#btnBulkRestock').on('click', function () {
        $('#bulkRestockBody').empty();
        appendBulkRestockRow();
        $('#bulkRestockForm').removeClass('was-validated');
        $('#bulkRestockModal').modal('show');
    });

    // Append dynamic restock row
    function appendBulkRestockRow() {
        // Build Instrument options
        let itemOptions = '<option value="" disabled selected>Select Instrument</option>';
        stocksList.forEach(item => {
            itemOptions += `<option value="${item.id}">${item.name} (Stock: ${item.stock})</option>`;
        });

        const newRow = $(`
            <tr class="restock-row">
                <td style="border: none; padding: 6px 12px 6px 0;">
                    <select class="form-control bulk-item-select" required>
                        ${itemOptions}
                    </select>
                </td>
                <td style="border: none; padding: 6px 12px;">
                    <input type="number" class="form-control bulk-qty-input" min="1" placeholder="Qty" required />
                </td>
                <td style="border: none; padding: 6px 12px;">
                    <input type="number" class="form-control bulk-cost-input" min="1" placeholder="Cost" required />
                </td>
                <td style="border: none; vertical-align: middle; text-align: center; padding: 6px 12px;">
                    <button type="button" class="btn btn-link text-danger btn-remove-row" style="padding: 6px; outline: none; box-shadow: none;" title="Remove Row"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `);

        $('#bulkRestockBody').append(newRow);
    }

    // Add row button click
    $('#btnAddRestockRow').on('click', function () {
        appendBulkRestockRow();
    });

    // Remove row button click
    $(document).on('click', '.btn-remove-row', function () {
        if ($('#bulkRestockBody .restock-row').length > 1) {
            $(this).closest('.restock-row').remove();
        } else {
            Swal.fire({ icon: 'warning', text: 'You must have at least one restocking row.', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true });
        }
    });

    // Auto-fill cost on instrument selection
    $(document).on('change', '.bulk-item-select', function () {
        const itemId = parseInt($(this).val());
        const p = stocksList.find(x => x.id === itemId);
        if (p) {
            const $row = $(this).closest('.restock-row');
            $row.find('.bulk-cost-input').val(p.cost_price ? Math.round(p.cost_price) : 0);
        }
    });

    // Submit bulk restock form
    $('#bulkRestockForm').on('submit', function (e) {
        e.preventDefault();
        
        let isValid = true;
        $('#bulkRestockBody .restock-row').each(function() {
            // Trigger browser validation styles
            $(this).find('select, input').each(function() {
                if (!this.checkValidity()) {
                    isValid = false;
                }
            });
        });

        if (!isValid) {
            $(this).addClass('was-validated');
            return;
        }

        let isPositiveValid = true;
        $('#bulkRestockBody .restock-row').each(function() {
            const qty = parseInt($(this).find('.bulk-qty-input').val());
            const cost = parseFloat($(this).find('.bulk-cost-input').val());
            if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost <= 0) {
                isPositiveValid = false;
                return false; // break
            }
        });

        if (!isPositiveValid) {
            Swal.fire({
                icon: 'error',
                text: 'All quantities to add and unit cost prices must be positive numbers greater than zero.',
                showConfirmButton: false,
                position: 'center',
                timer: 2000,
                timerProgressBar: true
            });
            return;
        }

        let isCostValid = true;
        let invalidItemName = "";
        let invalidCost = 0;
        let invalidPrice = 0;

        $('#bulkRestockBody .restock-row').each(function() {
            const itemId = parseInt($(this).find('.bulk-item-select').val());
            const cost = parseFloat($(this).find('.bulk-cost-input').val());
            const p = stocksList.find(x => x.id === itemId);
            if (p && cost > p.price) {
                isCostValid = false;
                invalidItemName = p.name;
                invalidCost = cost;
                invalidPrice = p.price;
                return false; // break
            }
        });

        if (!isCostValid) {
            Swal.fire({
                icon: 'error',
                text: `Unit cost price (₱${invalidCost.toLocaleString()}) for "${invalidItemName}" cannot exceed its store selling price (₱${invalidPrice.toLocaleString()}).`,
                showConfirmButton: false,
                position: 'center',
                timer: 2000,
                timerProgressBar: true
            });
            return;
        }

        const restocks = [];
        $('#bulkRestockBody .restock-row').each(function() {
            const itemId = parseInt($(this).find('.bulk-item-select').val());
            const quantityToAdd = parseInt($(this).find('.bulk-qty-input').val());
            const costPrice = parseFloat($(this).find('.bulk-cost-input').val());
            
            restocks.push({ itemId, quantityToAdd, costPrice });
        });

        $.ajax({
            method: "POST",
            url: `${url}stocks/bulk-restock`,
            data: JSON.stringify({ restocks }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (res) {
                Swal.fire({
                    icon: 'success',
                    text: 'Restock saved successfully!',
                    showConfirmButton: false,
                    position: 'center',
                    timer: 1500,
                    timerProgressBar: true
                });
                $('#bulkRestockModal').modal('hide');
                loadStocksFromDB();
            },
            error: function (err) {
                console.error(err);
                var errMsg = err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "Failed to save restock.";
                Swal.fire({ icon: 'error', text: errMsg, showConfirmButton: false, position: 'center', timer: 2000, timerProgressBar: true });
            }
        });
    });

    // Initialize Page
    applyGlobalSettings(function (settings) {
        lowStockThreshold = parseInt(settings.low_stock_threshold || 5, 10);
        loadStocksFromDB();
    });
});

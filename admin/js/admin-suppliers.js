$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-suppliers';
    loadNav();
    loadFooter();

    // API Config pointing to backend
    const url = 'http://localhost:5000/api/v1/'

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
            return
        }
        return JSON.parse(token)
    }

    let suppliersList = [];
    let productsList = [];

    // Fetch suppliers from Database (after loading products)
    function loadSuppliersFromDB() {
        $.ajax({
            method: "GET",
            url: `${url}items`,
            dataType: "json",
            success: function (items) {
                productsList = items;
                $.ajax({
                    method: "GET",
                    url: `${url}suppliers`,
                    dataType: "json",
                    success: function (data) {
                        suppliersList = data; // DB returns array of supplier objects
                        initTable(); // Redraw DataTable
                    },
                    error: function (err) {
                        console.error("Failed to load suppliers:", err);
                        Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch suppliers from server.' });
                    }
                });
            },
            error: function (err) {
                console.error("Failed to load items:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch products from server.' });
            }
        });
    }

    function getProducts() {
        return productsList;
    }

    // Render checkboxes of products inside the supplier modal
    function renderProductChecklist(supplierId) {
        const $checklist = $('#productChecklist');
        $checklist.empty();

        const products = getProducts();
        
        products.forEach(p => {
            // Checkbox state: checked if it belongs to this supplier
            const isChecked = supplierId !== 0 && p.supplier_id == supplierId;
            
            // Visibility: visible if it belongs to this supplier OR has NO supplier (null or undefined)
            const isVisible = (p.supplier_id == supplierId) || (p.supplier_id === null || p.supplier_id === undefined);

            if (isVisible) {
                $checklist.append(`
                    <label class="d-block text-white" style="font-size:0.8rem; margin-bottom:0.4rem; cursor:pointer;">
                        <input type="checkbox" class="prod-assign-cb" value="${p.id}" ${isChecked ? 'checked' : ''} /> 
                        ${p.name} <span style="font-size:0.7rem; color:var(--text-dim);">(${p.category})</span>
                    </label>
                `);
            }
        });

        if ($checklist.children().length === 0) {
            $checklist.html('<div class="text-muted text-center py-2" style="font-size:0.8rem;">No products available for assignment</div>');
        }
    }

    /* ── DataTable init ─────────────────────────────────────────── */
    var table;

    function initTable() {
        if ($.fn.DataTable.isDataTable('#suppliersTable')) {
            $('#suppliersTable').DataTable().destroy();
        }

        var data = suppliersList.map(function (s) {
            var count = getProducts().filter(function (p) {
                return p.supplier_id == s.id;
            }).length;
            return [
                s.name,
                s.contact_name || '—',
                s.email || '—',
                s.phone || '—',
                s.address_line || '—',
                count + ' item(s)',
                '<button class="btn btn-sm btn-outline-info edit-btn mr-1" data-id="' + s.id + '" title="Edit"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-sm btn-outline-danger delete-btn" data-id="' + s.id + '" title="Delete"><i class="fas fa-trash"></i></button>'
            ];
        });

        table = $('#suppliersTable').DataTable({
            data: data,
            pageLength: 10,
            order: [[0, 'asc']],
            language: { searchPlaceholder: 'Search suppliers…', search: '' }
        });
    }

    /* ── Add button ─────────────────────────────────────────────── */
    $('#btnAddNewSupplier').on('click', function () {
        $('#supplierForm')[0].reset();
        $('#supplierId').val('');

        renderProductChecklist(0);
        $('#prodChecklistGroup').show();

        $('#modalTitle').text('Add Supplier');
        $('#supplierForm').removeClass('was-validated');
        $('#supplierModal').modal('show');
    });

    /* ── Edit button (delegated) ────────────────────────────────── */
    $('#suppliersTable').on('click', '.edit-btn', function () {
        var id = parseInt($(this).data('id'));
        var s = suppliersList.find(function (x) { return x.id === id; });
        if (!s) return;

        $('#supplierId').val(s.id);
        $('#supplierName').val(s.name);
        $('#supplierContact').val(s.contact_name || '');
        $('#supplierEmail').val(s.email || '');
        $('#supplierPhone').val(s.phone || '');
        $('#supplierAddress').val(s.address_line || '');

        renderProductChecklist(s.id);
        $('#prodChecklistGroup').show();

        $('#modalTitle').text('Edit Supplier');
        $('#supplierForm').removeClass('was-validated');
        $('#supplierModal').modal('show');
    });

    /* ── Delete button (delegated) — FK check ───────────────────── */
    $('#suppliersTable').on('click', '.delete-btn', function () {
        var id = parseInt($(this).data('id'));
        var s = suppliersList.find(function (x) { return x.id === id; });
        if (!s) return;

        bootbox.confirm({
            message: 'Are you sure you want to delete supplier <strong>' + s.name + '</strong>?',
            buttons: {
                confirm: { label: 'Yes', className: 'btn-success' },
                cancel: { label: 'No', className: 'btn-danger' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "DELETE",
                        url: `${url}suppliers/${id}`, // Send ID in URL path
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            Swal.fire({ icon: 'success', text: 'Supplier deleted', showConfirmButton: false, position: 'bottom-right', timer: 1500 });
                            loadSuppliersFromDB(); // Refresh table
                        },
                        error: function (err) {
                            console.error(err);
                            const errMsg = err.responseJSON && err.responseJSON.error 
                                ? err.responseJSON.error 
                                : "Failed to delete supplier.";
                            Swal.fire({ icon: 'error', title: 'Constraint Violation', text: errMsg });
                        }
                    });
                }
            }
        });
    });

    /* ── Form Submit (Create & Update) ──────────────────────────── */
    $('#supplierForm').on('submit', function (e) {
        e.preventDefault();
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }

        var id = $('#supplierId').val();

        // Gather all checked product IDs from the checklist
        const checkedProductIds = $('.prod-assign-cb:checked').map(function() {
            return parseInt($(this).val());
        }).get();

        var payload = {
            name: $('#supplierName').val().trim(),
            contact_name: $('#supplierContact').val().trim(),
            email: $('#supplierEmail').val().trim(),
            phone: $('#supplierPhone').val().trim(),
            address_line: $('#supplierAddress').val().trim(),
            productIds: checkedProductIds // Send product associations
        };

        if (id) {
            // Edit Mode (PUT request)
            $.ajax({
                method: "PUT",
                url: `${url}suppliers/${id}`, // Send ID in URL path
                data: JSON.stringify(payload),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + getToken()
                },
                success: function (res) {
                    Swal.fire({ icon: 'success', text: 'Supplier updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500 });
                    $('#supplierModal').modal('hide');
                    loadSuppliersFromDB();
                },
                error: function (err) {
                    console.error(err);
                    const errMsg = err.responseJSON && err.responseJSON.error 
                        ? err.responseJSON.error 
                        : "Failed to update supplier.";
                    Swal.fire({ icon: 'warning', text: errMsg });
                }
            });
        } else {
            // Add Mode (POST request)
            $.ajax({
                method: "POST",
                url: `${url}suppliers`,
                data: JSON.stringify(payload),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + getToken()
                },
                success: function (res) {
                    Swal.fire({ icon: 'success', text: 'Supplier added!', showConfirmButton: false, position: 'bottom-right', timer: 1500 });
                    $('#supplierModal').modal('hide');
                    loadSuppliersFromDB();
                },
                error: function (err) {
                    console.error(err);
                    const errMsg = err.responseJSON && err.responseJSON.error 
                        ? err.responseJSON.error 
                        : "Failed to add supplier.";
                    Swal.fire({ icon: 'warning', text: errMsg });
                }
            });
        }
    });

    // Initialize Suppliers Page
    loadSuppliersFromDB();
});
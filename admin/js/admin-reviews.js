$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-reviews';
    loadNav();
    const url = 'http://localhost:5000/api/v1/';

    let reviewsList = [];
    var table = null;

    function loadReviewsFromDB() {
        $.ajax({
            method: "GET",
            url: `${url}admin/reviews`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
            success: function (data) {
                if (data && data.success) {
                    reviewsList = data.reviews;
                    populateProductDropdown();
                    table = initTable();
                }
            },
            error: function (err) {
                console.error("Failed to load reviews:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch reviews from server.' });
            }
        });
    }

    function populateProductDropdown() {
        const currentSelection = $('#filterProductSelect').val();
        
        // Get unique products with reviews
        const products = [];
        const seen = new Set();
        reviewsList.forEach(r => {
            if (r.item_name && !seen.has(r.item_name)) {
                seen.add(r.item_name);
                products.push({
                    name: r.item_name,
                    id: r.item_id
                });
            }
        });

        // Sort alphabetically
        products.sort((a, b) => a.name.localeCompare(b.name));

        const $select = $('#filterProductSelect');
        $select.html('<option value="">All Products</option>');
        products.forEach(p => {
            $select.append(`<option value="${p.id}">${p.name}</option>`);
        });

        // Restore previous selection if it still exists
        if (currentSelection) {
            $select.val(currentSelection);
        }
    }

    function initTable() {
        if ($.fn.DataTable.isDataTable('#reviewsTable')) {
            $('#reviewsTable').DataTable().destroy();
        }

        const productFilter = $('#filterProductSelect').val();
        const statusFilter = $('#filterStatusSelect').val();

        // Apply filters on the client side
        const filteredList = reviewsList.filter(r => {
            // Product match
            if (productFilter && String(r.item_id) !== String(productFilter)) {
                return false;
            }
            // Status match
            const isHidden = r.deleted_at !== null;
            if (statusFilter === 'active' && isHidden) return false;
            if (statusFilter === 'hidden' && !isHidden) return false;

            return true;
        });

        var data = filteredList.map(function (r) {
            // Render stars
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= r.rating) {
                    stars += '<i class="fas fa-star" style="color: var(--gold); font-size: 0.72rem; margin-right: 1px;"></i>';
                } else {
                    stars += '<i class="far fa-star" style="color: var(--gold-dim); font-size: 0.72rem; margin-right: 1px;"></i>';
                }
            }

            // Status Badge
            const isHidden = r.deleted_at !== null;
            const statusBadge = isHidden
                ? '<span class="badge badge-danger">Hidden</span>'
                : '<span class="badge badge-success">Active</span>';

            // Action Button
            const actionBtn = isHidden
                ? `<button class="btn btn-sm btn-outline-success restore-btn" data-id="${r.id}"><i class="fas fa-eye"></i> Restore</button>`
                : `<button class="btn btn-sm btn-outline-danger hide-btn" data-id="${r.id}"><i class="fas fa-eye-slash"></i> Hide</button>`;

            return [
                r.id,
                r.item_name || 'Unknown Item',
                r.customer_name || 'Guest User',
                `<div style="white-space: nowrap;">${stars}</div>`,
                `<div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.comment || ''}">${r.comment || '<i>No comments</i>'}</div>`,
                r.date || '',
                statusBadge,
                actionBtn
            ];
        });

        return $('#reviewsTable').DataTable({
            data: data,
            pageLength: 10,
            order: [[0, 'desc']],
            language: { searchPlaceholder: 'Search reviews…', search: '' }
        });
    }

    // Filter change listeners
    $('#filterProductSelect, #filterStatusSelect').on('change', function () {
        initTable();
    });

    // Clear filters listener
    $('#btnClearFilters').on('click', function () {
        $('#filterProductSelect').val('');
        $('#filterStatusSelect').val('');
        initTable();
    });

    // Toggle Hide Click
    $('#reviewsTable').on('click', '.hide-btn', function () {
        var id = $(this).data('id');
        bootbox.confirm({
            title: 'Hide Review?',
            message: 'Are you sure you want to hide review ID <strong>#' + id + '</strong> from public view? It will not be shown on the product page.',
            buttons: {
                cancel: { label: '<i class="fa fa-times"></i> Cancel', className: 'btn-outline-secondary' },
                confirm: { label: '<i class="fa fa-eye-slash"></i> Hide Review', className: 'btn-danger' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "PUT",
                        url: `${url}admin/reviews/${id}/hide`,
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            if (res && res.success) {
                                swalToast('success', 'Review has been hidden successfully!');
                                loadReviewsFromDB();
                            }
                        },
                        error: function (err) {
                            console.error("Failed to hide review:", err);
                            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Could not hide review.' });
                        }
                    });
                }
            }
        });
    });

    // Toggle Restore Click
    $('#reviewsTable').on('click', '.restore-btn', function () {
        var id = $(this).data('id');
        bootbox.confirm({
            title: 'Restore Review?',
            message: 'Are you sure you want to restore review ID <strong>#' + id + '</strong>? It will become visible to all customers again.',
            buttons: {
                cancel: { label: '<i class="fa fa-times"></i> Cancel', className: 'btn-outline-secondary' },
                confirm: { label: '<i class="fa fa-eye"></i> Restore Review', className: 'btn-gold' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "PUT",
                        url: `${url}admin/reviews/${id}/unhide`,
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            if (res && res.success) {
                                swalToast('success', 'Review has been restored successfully!');
                                loadReviewsFromDB();
                            }
                        },
                        error: function (err) {
                            console.error("Failed to restore review:", err);
                            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Could not restore review.' });
                        }
                    });
                }
            }
        });
    });

    // Initial load
    loadReviewsFromDB();
});

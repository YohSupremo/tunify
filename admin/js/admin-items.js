$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-items';
    loadNav();
    loadFooter();

    const url = 'http://localhost:5000/api/v1/'

    const getToken = () => {
        const token = sessionStorage.getItem('token')
        if (!token) {
            Swal.fire({ icon: 'warning', text: 'You must be logged in to access this page.', showConfirmButton: true })
                .then(() => { window.location.href = '../login.html' })
            return null;
        }
        return JSON.parse(token)
    }

    let productsList = [];
    let brandsList = [];
    let categoriesList = [];

    const CAT_ICONS = { 
        string: 'fa-guitar', 
        percussion: 'fa-drum', 
        keys: 'fa-keyboard', 
        wind: 'fa-wind', 
        vocals: 'fa-microphone', 
        accessories: 'fa-plug' 
    }

    let selectedImage = null

    // ── Populate filter dropdowns (brand & category) ─────────────
    const populateFilterDropdowns = () => {
        // Brand filter
        const $bf = $('#filterBrand')
        const curBrand = $bf.val()
        $bf.empty().append('<option value="all">All Brands</option>')
        brandsList.forEach(b => $bf.append(`<option value="${b.name}">${b.name}</option>`))
        if (curBrand) $bf.val(curBrand)

        // Category filter
        const $cf = $('#filterCategory')
        const curCat = $cf.val()
        $cf.empty().append('<option value="all">All Categories</option>')
        categoriesList.forEach(c => {
            const label = c.name.charAt(0).toUpperCase() + c.name.slice(1)
            $cf.append(`<option value="${c.name}">${label}</option>`)
        })
        if (curCat) $cf.val(curCat)
    }

    // ── Filter products list using dropdown values ────────────────
    const getFilteredProducts = () => {
        const statusF = $('#filterStatus').val()   // active | deactivated | all
        const catF    = $('#filterCategory').val() // all | string | ...
        const brandF  = $('#filterBrand').val()    // all | Gibson | ...
        const stockF  = $('#filterStock').val()    // all | instock | low | out

        return productsList.filter(p => {
            // Status
            if (statusF === 'active'      && p.deleted_at) return false
            if (statusF === 'deactivated' && !p.deleted_at) return false
            // Category
            if (catF !== 'all' && p.category !== catF) return false
            // Brand
            if (brandF !== 'all' && p.brand !== brandF) return false
            // Stock
            if (stockF === 'instock' && p.stock <= 5)  return false
            if (stockF === 'low'     && (p.stock < 1 || p.stock > 5)) return false
            if (stockF === 'out'     && p.stock !== 0) return false
            return true
        })
    }

    // ── Load Dropdowns and Data from DB ─────────────────────────
    const loadDataFromDB = () => {
        const statusParam = $('#filterStatus').val() || 'active'
        // 1. Fetch Brands
        $.ajax({
            method: "GET",
            url: `${url}brands`,
            dataType: "json",
            success: function (brands) {
                brandsList = brands;
                $('#itemBrand').empty().append('<option value="" disabled selected>Select Brand</option>');
                brandsList.forEach(b => $('#itemBrand').append(`<option value="${b.name}">${b.name}</option>`));

                // 2. Fetch Categories
                $.ajax({
                    method: "GET",
                    url: `${url}categories`,
                    dataType: "json",
                    success: function (categories) {
                        categoriesList = categories;
                        $('#itemCategory').empty().append('<option value="" disabled selected>Select Category</option>');
                        categoriesList.forEach(c => $('#itemCategory').append(`<option value="${c.name}">${c.name.charAt(0).toUpperCase() + c.name.slice(1)}</option>`));

                        populateFilterDropdowns();

                        // 3. Fetch Items (all statuses so client-side filter works)
                        $.ajax({
                            method: "GET",
                            url: `${url}items?status=all`,
                            dataType: "json",
                            success: function (items) {
                                productsList = items.map(item => {
                                    const staticProd = typeof TunifyProducts !== 'undefined'
                                        ? TunifyProducts.find(sp => sp.name.toLowerCase() === item.name.toLowerCase())
                                        : null;
                                    return {
                                        ...item,
                                        desc: item.desc || (staticProd ? staticProd.desc : '')
                                    };
                                });
                                reloadTable()
                            },
                            error: function (err) { console.error("Failed to load items:", err); }
                        });
                    },
                    error: function (err) { console.error("Failed to load categories:", err); }
                });
            },
            error: function (err) { console.error("Failed to load brands:", err); }
        });
    }

    const getProducts = () => productsList;

    // ── DataTable ────────────────────────────────────────────────
    let table = $('#itable').DataTable({
        data: [],
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', text: '<i class="fas fa-file-excel mr-1"></i> Export Excel', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } },
            { extend: 'pdfHtml5',   text: '<i class="fas fa-file-pdf mr-1"></i> Export PDF',    title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } }
        ],
        pageLength: 8,
        order: [[0, 'desc']],
        language: { searchPlaceholder: 'Search inventory…', search: '' }
    })

    const reloadTable = () => {
        table.destroy()
        const filtered = getFilteredProducts()
        table = $('#itable').DataTable({
            data: filtered.map(p => {
                const cat    = p.category || ''
                const isDeactivated = !!p.deleted_at
                const imgSrc = p.image
                    ? (p.image.startsWith('http') ? p.image : `http://localhost:5000/${p.image}`)
                    : null
                const nameCel = isDeactivated
                    ? `${p.name} <span class="badge-deactivated">Deactivated</span>`
                    : p.name
                const statusBadge = isDeactivated
                    ? `<span class="badge-deactivated">Deactivated</span>`
                    : `<span style="background:rgba(52,211,153,0.12);color:#34D399;font-size:.65rem;padding:2px 7px;border-radius:20px;border:1px solid rgba(52,211,153,0.3);font-weight:700;letter-spacing:.5px;text-transform:uppercase;">Active</span>`

                const editBtn    = !isDeactivated
                    ? `<a href='#' class='editBtn mr-2' data-id='${p.id}' title='Edit'><i class='fas fa-edit' style='font-size:18px'></i></a>`
                    : ''
                const deleteBtn  = !isDeactivated
                    ? `<a href='#' class='deletebtn mr-2' data-id='${p.id}' title='Deactivate'><i class='fas fa-trash-alt' style='font-size:18px;color:#F87171'></i></a>`
                    : ''
                const restoreBtn = isDeactivated
                    ? `<a href='#' class='restoreBtn' data-id='${p.id}' title='Restore'><i class='fas fa-undo' style='font-size:18px;color:#34D399'></i></a>`
                    : ''

                return [
                    p.id,
                    imgSrc ? `<img src="${imgSrc}" width="50" height="60" style="object-fit:cover;border-radius:4px${isDeactivated ? ';opacity:.4' : ''}" onerror="this.style.display='none'">` : `<i class="fas ${CAT_ICONS[cat] || 'fa-music'}" style="font-size:1.4rem;color:var(--gold)${isDeactivated ? ';opacity:.4' : ''}"></i>`,
                    nameCel,
                    p.brand,
                    cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '',
                    '₱' + (p.cost_price ? Number(p.cost_price).toLocaleString() : Math.round(p.price * 0.6).toLocaleString()),
                    '₱' + p.price.toLocaleString(),
                    p.stock,
                    statusBadge,
                    editBtn + deleteBtn + restoreBtn
                ]
            }),
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: '<i class="fas fa-file-excel mr-1"></i> Export Excel', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } },
                { extend: 'pdfHtml5',   text: '<i class="fas fa-file-pdf mr-1"></i> Export PDF',    title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } }
            ],
            pageLength: 8,
            order: [[0, 'desc']],
            language: { searchPlaceholder: 'Search inventory…', search: '' },
            createdRow: function (row, data, idx) {
                const p = getFilteredProducts()[idx]
                if (p && p.deleted_at) $(row).addClass('row-deactivated')
            }
        })
    }

    // ── Filter change handlers ───────────────────────────────────
    $('#filterStatus, #filterCategory, #filterBrand, #filterStock').on('change', function () {
        reloadTable()
    })

    // ── Add Instrument Button ───────────────────────────────────
    $('#btnAddNewItem').on('click', function () {
        $('#itemForm')[0].reset();
        $('#itemId').val('');
        selectedImage = null;
        $('#fileLabel').text('Choose image file…');
        $('#modalTitle').text('Add Instrument');
        $('#itemForm').removeClass('was-validated');
        $('#itemModal').modal('show');
        $('#itemSubmit').show();
        $('#itemUpdate').hide();
    });

    // ── Auto-calculate cost price (60% of sell price) ─────────────
    $(document).on('input', '#itemPrice', function () {
        const sell = Number($(this).val())
        if (sell > 0) {
            $('#itemCostPrice').val(Math.round(sell * 0.6))
        } else {
            $('#itemCostPrice').val('')
        }
    })

    // ── Image file input ─────────────────────────────────────────
    $('#itemImageFile').on('change', function (e) {
        const file = e.target.files[0]
        if (!file) return
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            Swal.fire({ icon: 'error', text: 'Only JPG, JPEG, and PNG allowed!', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            $(this).val('')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'warning', text: 'Image must be smaller than 2MB!', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        $('#fileLabel').text(file.name)
        const reader = new FileReader()
        reader.onload = e => { selectedImage = e.target.result }
        reader.readAsDataURL(file)
    })

    // ── Add item submit (POST to Backend DB) ─────────────────────
    $('#itemSubmit').on('click', function (e) {
        e.preventDefault()

        const name = $('#itemName').val().trim()
        const brandName = $('#itemBrand').val()
        const categoryName = $('#itemCategory').val()
        const price = Number($('#itemPrice').val())
        const cost_price = $('#itemCostPrice').val()
        const stock = $('#itemStock').val()
        const desc = $('#itemDesc').val().trim()

        if (!name) {
            Swal.fire({ icon: 'warning', text: 'Please enter the item name.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        if (!brandName) {
            Swal.fire({ icon: 'warning', text: 'Please select a brand.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        if (!categoryName) {
            Swal.fire({ icon: 'warning', text: 'Please select a category.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        if (!price || price < 1) {
            Swal.fire({ icon: 'warning', text: 'Selling price must be greater than 0.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        if (stock === '' || stock === null || stock === undefined) {
            Swal.fire({ icon: 'warning', text: 'Please enter initial stock quantity.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }

        const token = getToken()
        if (!token) return

        $.ajax({
            method: "POST",
            url: `${url}items`,
            data: JSON.stringify({ 
                name,
                brandName,
                categoryName,
                price,
                cost_price: cost_price !== '' ? Number(cost_price) : undefined,
                stock: Number(stock),
                image: selectedImage,
                desc
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": "Bearer " + token },
            success: function (res) {
                $('#itemModal').modal('hide')
                Swal.fire({ icon: 'success', text: 'Instrument added!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                loadDataFromDB();
            },
            error: function (err) {
                console.error(err);
                const errMsg = err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "Failed to add instrument.";
                Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true });
            }
        });
    })

    // ── Edit button ──────────────────────────────────────────────
    $('#itable tbody').on('click', 'a.editBtn', function (e) {
        e.preventDefault()
        const id = parseInt($(this).data('id'))
        const p = getProducts().find(x => x.id === id)
        if (!p) return

        $('#itemId').val(p.id); $('#itemName').val(p.name); $('#itemBrand').val(p.brand)
        $('#itemCategory').val(p.category); $('#itemPrice').val(p.price)
        $('#itemCostPrice').val(p.cost_price ? Math.round(p.cost_price) : Math.round(p.price * 0.6)); $('#itemStock').val(p.stock)
        $('#itemDesc').val(p.desc || '')
        $('#fileLabel').text(p.image ? 'Image set' : 'Choose image file…')
        selectedImage = p.image || null
        $('#modalTitle').text('Edit Instrument'); $('#itemForm').removeClass('was-validated')
        $('#itemSubmit').hide(); $('#itemUpdate').show()
        $('#itemModal').modal('show')
    })

    // ── Update item submit (PUT to Backend DB) ───────────────────
    $('#itemUpdate').on('click', function (e) {
        e.preventDefault()

        const id = parseInt($('#itemId').val())
        const name = $('#itemName').val().trim()
        const brandName = $('#itemBrand').val()
        const categoryName = $('#itemCategory').val()
        const price = Number($('#itemPrice').val())
        const cost_price = $('#itemCostPrice').val()
        const stock = Number($('#itemStock').val())
        const desc = $('#itemDesc').val().trim()

        if (!name) {
            Swal.fire({ icon: 'warning', text: 'Please enter the item name.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }
        if (!price || price < 1) {
            Swal.fire({ icon: 'warning', text: 'Selling price must be greater than 0.', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            return
        }

        const token = getToken()
        if (!token) return

        $.ajax({
            method: "PUT",
            url: `${url}items`,
            data: JSON.stringify({ 
                id,
                name,
                brandName,
                categoryName,
                price,
                cost_price: cost_price !== '' ? Number(cost_price) : undefined,
                stock,
                image: selectedImage,
                desc
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": "Bearer " + getToken() },
            success: function (res) {
                $('#itemModal').modal('hide')
                Swal.fire({ icon: 'success', text: 'Instrument updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                loadDataFromDB();
            },
            error: function (err) {
                console.error(err);
                const errMsg = err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "Failed to update instrument.";
                Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true });
            }
        });
    })

    // ── Delete button (Soft-delete to Backend DB) ─────────────────
    $('#itable tbody').on('click', 'a.deletebtn', function (e) {
        e.preventDefault()
        const id = parseInt($(this).data('id'))
        const p = productsList.find(x => x.id === id)
        if (!p) return

        bootbox.confirm({
            message: `Deactivate <strong>${p.name}</strong>? It will be hidden from the store.`,
            buttons: {
                confirm: { label: 'Yes, Deactivate', className: 'btn-danger' },
                cancel:  { label: 'Cancel',           className: 'btn-secondary' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "DELETE",
                        url: `${url}items`,
                        data: JSON.stringify({ id }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        headers: { "Authorization": "Bearer " + getToken() },
                        success: function (res) {
                            Swal.fire({ icon: 'success', text: `"${p.name}" deactivated`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                            loadDataFromDB();
                        },
                        error: function (err) {
                            console.error(err);
                            Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.responseJSON?.error || 'Failed to deactivate instrument.' });
                        }
                    });
                }
            }
        })
    })

    // ── Restore button ───────────────────────────────────────────
    $('#itable tbody').on('click', 'a.restoreBtn', function (e) {
        e.preventDefault()
        const id = parseInt($(this).data('id'))
        const p = productsList.find(x => x.id === id)
        if (!p) return

        bootbox.confirm({
            message: `Restore <strong>${p.name}</strong> and make it active again?`,
            buttons: {
                confirm: { label: 'Yes, Restore', className: 'btn-success' },
                cancel:  { label: 'Cancel',        className: 'btn-secondary' }
            },
            callback: function (result) {
                if (result) {
                    const token = getToken()
                    if (!token) return
                    $.ajax({
                        method: "PATCH",
                        url: `${url}items/restore`,
                        data: JSON.stringify({ id }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        headers: { "Authorization": "Bearer " + token },
                        success: function (res) {
                            Swal.fire({ icon: 'success', text: `"${p.name}" restored!`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                            loadDataFromDB()
                        },
                        error: function (err) {
                            console.error(err);
                            Swal.fire({ icon: 'error', title: 'Restore Failed', text: err.responseJSON?.error || 'Failed to restore instrument.' });
                        }
                    })
                }
            }
        })
    })

    // Initialize Page
    loadDataFromDB();
    })
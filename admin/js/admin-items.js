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

    // ── Load Dropdowns and Data from DB ─────────────────────────
    const loadDataFromDB = () => {
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

                        // 3. Fetch Items
                        $.ajax({
                            method: "GET",
                            url: `${url}items`,
                            dataType: "json",
                            success: function (items) {
                                productsList = items;
                                reloadTable();
                            },
                            error: function (err) {
                                console.error("Failed to load items:", err);
                            }
                        });
                    },
                    error: function (err) {
                        console.error("Failed to load categories:", err);
                    }
                });
            },
            error: function (err) {
                console.error("Failed to load brands:", err);
            }
        });
    }

    const getProducts = () => productsList;

    // ── DataTable ────────────────────────────────────────────────
    let table = $('#itable').DataTable({
        data: [],
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', text: '<i class="fas fa-file-excel mr-1"></i> Export Excel', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } },
            { extend: 'pdfHtml5', text: '<i class="fas fa-file-pdf mr-1"></i> Export PDF', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } },
            {
                text: '<i class="fas fa-plus mr-1"></i> Add Item', className: 'btn btn-primary',
                action: function () {
                    $('#itemForm')[0].reset(); $('#itemId').val(''); selectedImage = null
                    $('#fileLabel').text('Choose image file…'); $('#modalTitle').text('Add Instrument')
                    $('#itemForm').removeClass('was-validated'); $('#itemModal').modal('show')
                    $('#itemSubmit').show(); $('#itemUpdate').hide()
                }
            }
        ],
        pageLength: 8,
        order: [[0, 'desc']],
        language: { searchPlaceholder: 'Search inventory…', search: '' }
    })

    const reloadTable = () => {
        table.destroy()
        table = $('#itable').DataTable({
            data: getProducts().map(p => [
                p.id,
                p.image ? `<img src="../${p.image}" width="50" height="60" onerror="this.style.display='none'">` : `<i class="fas ${CAT_ICONS[p.category] || 'fa-music'}" style="font-size:1.4rem;color:var(--gold)"></i>`,
                p.name, 
                p.brand,
                p.category.charAt(0).toUpperCase() + p.category.slice(1),
                '₱' + Math.round(p.price * 0.6).toLocaleString(),
                '₱' + p.price.toLocaleString(), 
                p.stock,
                `<a href='#' class='editBtn' data-id='${p.id}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
                `<a href='#' class='deletebtn' data-id='${p.id}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`
            ]),
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: '<i class="fas fa-file-excel mr-1"></i> Export Excel', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } },
                { extend: 'pdfHtml5', text: '<i class="fas fa-file-pdf mr-1"></i> Export PDF', title: 'Tunify Inventory', exportOptions: { columns: [0, 2, 3, 4, 6, 7] } }
            ],
            pageLength: 8, 
            order: [[0, 'desc']],
            language: { searchPlaceholder: 'Search inventory…', search: '' }
        })
    }

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
        if (!$('#itemForm')[0].checkValidity()) { $('#itemForm').addClass('was-validated'); return }

        const name = $('#itemName').val().trim()
        const brandName = $('#itemBrand').val()
        const categoryName = $('#itemCategory').val()
        const price = Number($('#itemPrice').val())
        const stock = Number($('#itemStock').val())

        $.ajax({
            method: "POST",
            url: `${url}items`,
            data: JSON.stringify({ 
                name,
                brandName,
                categoryName,
                price,
                stock,
                image: selectedImage
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
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
        $('#itemCostPrice').val(Math.round(p.price * 0.6)); $('#itemStock').val(p.stock)
        $('#itemBadge').val(p.badge || ''); $('#itemDesc').val(p.desc || '')
        $('#itemSpecs').val(p.specs ? p.specs.join('\n') : '')
        $('#fileLabel').text(p.image ? 'Image set' : 'Choose image file…')
        selectedImage = p.image || null
        $('#modalTitle').text('Edit Instrument'); $('#itemForm').removeClass('was-validated')
        $('#itemSubmit').hide(); $('#itemUpdate').show()
        $('#itemModal').modal('show')
    })

    // ── Update item submit (PUT to Backend DB) ───────────────────
    $('#itemUpdate').on('click', function (e) {
        e.preventDefault()
        if (!$('#itemForm')[0].checkValidity()) { $('#itemForm').addClass('was-validated'); return }

        const id = parseInt($('#itemId').val())
        const name = $('#itemName').val().trim()
        const brandName = $('#itemBrand').val()
        const categoryName = $('#itemCategory').val()
        const price = Number($('#itemPrice').val())
        const stock = Number($('#itemStock').val())

        $.ajax({
            method: "PUT",
            url: `${url}items`,
            data: JSON.stringify({ 
                id,
                name,
                brandName,
                categoryName,
                price,
                stock,
                image: selectedImage
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + getToken()
            },
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

    // ── Delete button (DELETE to Backend DB) ─────────────────────
    $('#itable tbody').on('click', 'a.deletebtn', function (e) {
        e.preventDefault()
        const id = parseInt($(this).data('id'))
        const p = getProducts().find(x => x.id === id)
        if (!p) return

        bootbox.confirm({
            message: `Do you want to delete <strong>${p.name}</strong>?`,
            buttons: {
                confirm: { label: 'Yes', className: 'btn-success' },
                cancel: { label: 'No', className: 'btn-danger' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "DELETE",
                        url: `${url}items`,
                        data: JSON.stringify({ id }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            Swal.fire({ icon: 'success', text: `"${p.name}" deleted`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                            loadDataFromDB();
                        },
                        error: function (err) {
                            console.error(err);
                            const errMsg = err.responseJSON && err.responseJSON.error 
                                ? err.responseJSON.error 
                                : "Failed to delete instrument.";
                            Swal.fire({ icon: 'error', title: 'Delete Failed', text: errMsg });
                        }
                    });
                }
            }
        })
    })

    // Initialize Page
    loadDataFromDB();
    })
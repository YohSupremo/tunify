$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-cats';
    loadNav();
    loadFooter();

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

    // Now categoriesList and productsList will store database objects
    let categoriesList = [];
    let productsList = [];

    // 1. Fetch categories and products from the database API
    const loadDataFromDB = () => {
        $.ajax({
            method: "GET",
            url: `${url}items`,
            dataType: "json",
            success: function (products) {
                productsList = products;
                
                // Fetch categories after products load
                $.ajax({
                    method: "GET",
                    url: `${url}categories`,
                    dataType: "json",
                    success: function (data) {
                        categoriesList = data; 
                        reloadTable();
                    },
                    error: function (err) {
                        console.error("Failed to load categories:", err);
                        Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch categories.' });
                    }
                });
            },
            error: function (err) {
                console.error("Failed to load products:", err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch products.' });
            }
        });
    }

    // Return products fetched from the database
    const getProducts = () => productsList;

    // 2. Render Checkboxes of Products inside the edit/add modal
    const renderProductChecklist = (categoryId) => {
        const $checklist = $('#productChecklist');
        $checklist.empty();

        const products = getProducts();
        const categoryObj = categoriesList.find(c => c.id == categoryId);
        const catName = categoryObj ? categoryObj.name.toLowerCase() : '';

        products.forEach(p => {
            // Check if this product belongs to the current category (by ID or fallback to name string)
            const isChecked = categoryId !== 0 && (
                p.category_id == categoryId || 
                (p.category && p.category.toLowerCase() === catName)
            );

            $checklist.append(`
                <label class="d-block text-white" style="font-size:0.8rem; margin-bottom:0.4rem; cursor:pointer;">
                    <input type="checkbox" class="prod-assign-cb" value="${p.id}" ${isChecked ? 'checked' : ''} /> 
                    ${p.name} <span style="font-size:0.7rem; color:var(--text-dim);">(${p.brand})</span>
                </label>
            `);
        });
    }

    // 3. Build Table Rows (Columns: ID, Name, Associated Products Count, Description, Actions)
    const buildRows = () => categoriesList.map(c => {
        const display = c.name.charAt(0).toUpperCase() + c.name.slice(1)
        const count = getProducts().filter(p => 
            p.category_id == c.id || 
            (p.category && p.category.toLowerCase() === c.name.toLowerCase())
        ).length // Count by DB ID or Name string!
        return [
            c.id, // Column 0: ID
            display, // Column 1: Name
            count + ' product(s)', // Column 2: Associated Products
            c.description || '—', // Column 3: Description
            `<a href='#' class='editBtn' data-id='${c.id}' data-cat='${c.name}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
            `<a href='#' class='deletebtn' data-cat='${c.name}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`
        ]
    })

    let table = $('#catsTable').DataTable({
        data: buildRows(),
        pageLength: 10,
        order: [[0, 'asc']],
        language: { searchPlaceholder: 'Search categories…', search: '' }
    })

    const reloadTable = () => {
        table.destroy()
        table = $('#catsTable').DataTable({ 
            data: buildRows(), 
            pageLength: 10, 
            order: [[0, 'asc']], 
            language: { searchPlaceholder: 'Search categories…', search: '' } 
        })
    }

    // Clicking Add Category (We now show and render the checklist for new categories)
    $('#btnAddNewCat').on('click', function () {
        $('#catForm')[0].reset()
        $('#catOldName').val('')
        $('#catId').val('')
        $('#modalTitle').text('Add Category')
        
        // Render checklist and show checklist container
        renderProductChecklist(0)
        $('#prodChecklistGroup').show()

        $('#catForm').removeClass('was-validated')
        $('#catModal').modal('show')
    })

    // Clicking Edit Category (We populate inputs and show the products checklist)
    $('#catsTable tbody').on('click', 'a.editBtn', function (e) {
        e.preventDefault()
        const catName = $(this).data('cat')
        const catId = $(this).data('id')

        const categoryObj = categoriesList.find(c => c.id == catId);
        if (!categoryObj) return;

        $('#catOldName').val(categoryObj.name)
        $('#catId').val(categoryObj.id)
        $('#catName').val(categoryObj.name.charAt(0).toUpperCase() + categoryObj.name.slice(1))
        $('#catDesc').val(categoryObj.description || '')

        // Render product checklist for this specific category ID
        renderProductChecklist(categoryObj.id)
        $('#prodChecklistGroup').show() // Show checklist for editing

        $('#modalTitle').text('Edit Category')
        $('#catForm').removeClass('was-validated')
        $('#catModal').modal('show')
    })

    // DELETE Category via API
    $('#catsTable tbody').on('click', 'a.deletebtn', function (e) {
        e.preventDefault()
        const catName = $(this).data('cat')

        bootbox.confirm({
            message: `Do you want to delete the category <strong>"${catName}"</strong>?`,
            buttons: {
                confirm: { label: 'Yes', className: 'btn-success' },
                cancel: { label: 'No', className: 'btn-danger' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: "DELETE",
                        url: `${url}categories`,
                        data: JSON.stringify({ name: catName }),
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        headers: {
                            "Authorization": "Bearer " + getToken()
                        },
                        success: function (res) {
                            Swal.fire({ icon: 'success', text: `Category "${catName}" deleted`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                            loadDataFromDB();
                        },
                        error: function (err) {
                            console.error(err);
                            const errMsg = err.responseJSON && err.responseJSON.error 
                                ? err.responseJSON.error 
                                : "Failed to delete category.";
                            Swal.fire({ icon: 'error', title: 'Constraint Violation', text: errMsg });
                        }
                    });
                }
            }
        })
    })

    // CREATE / UPDATE Category via API
    $('#catForm').on('submit', function (e) {
        e.preventDefault()
        if (!this.checkValidity()) { $(this).addClass('was-validated'); return }

        const oldName = $('#catOldName').val()
        const newName = $('#catName').val().trim().toLowerCase()
        const description = $('#catDesc').val().trim()

        // Gather all checked product IDs from the checklist
        const checkedProductIds = $('.prod-assign-cb:checked').map(function() {
            return parseInt($(this).val());
        }).get();

        if (oldName) {
            // Edit Mode (PUT request)
            $.ajax({
                method: "PUT",
                url: `${url}categories`,
                data: JSON.stringify({ 
                    oldName, 
                    newName, 
                    description,
                    productIds: checkedProductIds // Send product associations
                }),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + getToken()
                },
                success: function (res) {
                    Swal.fire({ icon: 'success', text: 'Category updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true });
                    $('#catModal').modal('hide');
                    loadDataFromDB();
                },
                error: function (err) {
                    console.error(err);
                    const errMsg = err.responseJSON && err.responseJSON.error 
                        ? err.responseJSON.error 
                        : "Failed to update category.";
                    Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true });
                }
            });
        } else {
            // Add Mode (POST request)
            $.ajax({
                method: "POST",
                url: `${url}categories`,
                data: JSON.stringify({ 
                    name: newName,
                    description,
                    productIds: checkedProductIds // Send product associations
                }),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: {
                    "Authorization": "Bearer " + getToken()
                },
                success: function (res) {
                    Swal.fire({ icon: 'success', text: 'Category added!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true });
                    $('#catModal').modal('hide');
                    loadDataFromDB();
                },
                error: function (err) {
                    console.error(err);
                    const errMsg = err.responseJSON && err.responseJSON.error 
                        ? err.responseJSON.error 
                        : "Failed to add category.";
                    Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true });
                }
            });
        }
    })

    // Initialize Page
    loadDataFromDB();
})
$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-cats';
    loadNav();
    loadFooter();

    const url = 'http://localhost:4000/'

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

    const getCategories = () => {
        const s = localStorage.getItem('tunify_categories')
        if (s) {
            const parsed = JSON.parse(s)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
        return ['string', 'percussion', 'keys', 'wind', 'vocals', 'accessories']
    }

    const saveCategories = (list) => {
        localStorage.setItem('tunify_categories', JSON.stringify(list))
    }

    const getProducts = () => {
        const s = localStorage.getItem('tunify_products')
        return s ? JSON.parse(s) : TunifyProducts.slice()
    }

    const saveProducts = (list) => {
        localStorage.setItem('tunify_products', JSON.stringify(list))
    }

    const buildRows = () => getCategories().map(c => {
        const slug = c.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const display = c.charAt(0).toUpperCase() + c.slice(1)
        const count = getProducts().filter(p => p.category.toLowerCase() === c.toLowerCase()).length
        return [
            display, slug, count + ' product(s)',
            `<a href='#' class='editBtn' data-cat='${c}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
            `<a href='#' class='deletebtn' data-cat='${c}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`
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
        table = $('#catsTable').DataTable({ data: buildRows(), pageLength: 10, order: [[0, 'asc']], language: { searchPlaceholder: 'Search categories…', search: '' } })
    }

    $('#btnAddNewCat').on('click', function () {
        $('#catForm')[0].reset()
        $('#catOldName').val('')
        $('#modalTitle').text('Add Category')
        $('#catForm').removeClass('was-validated')
        $('#catModal').modal('show')
    })

    $('#catsTable tbody').on('click', 'a.editBtn', function (e) {
        e.preventDefault()
        const catName = $(this).data('cat')
        $('#catOldName').val(catName)
        $('#catName').val(catName.charAt(0).toUpperCase() + catName.slice(1))
        $('#modalTitle').text('Edit Category')
        $('#catForm').removeClass('was-validated')
        $('#catModal').modal('show')
    })

    $('#catsTable tbody').on('click', 'a.deletebtn', function (e) {
        e.preventDefault()
        const catName = $(this).data('cat')
        const count = getProducts().filter(p => p.category.toLowerCase() === catName.toLowerCase()).length

        if (count > 0) {
            bootbox.alert({
                title: "<span class='text-danger'><i class='fas fa-exclamation-circle'></i> Constraint Violation</span>",
                message: `Cannot delete category <strong>"${catName}"</strong> — it contains <strong>${count} product(s)</strong>.`
            })
            return
        }

        bootbox.confirm({
            message: `Do you want to delete the category <strong>"${catName}"</strong>?`,
            buttons: {
                confirm: { label: 'Yes', className: 'btn-success' },
                cancel: { label: 'No', className: 'btn-danger' }
            },
            callback: function (result) {
                if (result) {
                    saveCategories(getCategories().filter(c => c.toLowerCase() !== catName.toLowerCase()))
                    Swal.fire({ icon: 'success', text: `Category "${catName}" deleted`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
                    reloadTable()
                }
            }
        })
    })

    $('#catForm').on('submit', function (e) {
        e.preventDefault()
        if (!this.checkValidity()) { $(this).addClass('was-validated'); return }

        const oldName = $('#catOldName').val()
        const newName = $('#catName').val().trim().toLowerCase()
        const cats = getCategories()

        const isDuplicate = cats.some(c => c.toLowerCase() === newName && c.toLowerCase() !== oldName.toLowerCase())
        if (isDuplicate) {
            Swal.fire({ icon: 'warning', text: 'A category with this name already exists!', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
            $('#catName').addClass('is-invalid')
            return
        }
        $('#catName').removeClass('is-invalid')

        if (oldName) {
            const idx = cats.findIndex(c => c.toLowerCase() === oldName.toLowerCase())
            if (idx !== -1) {
                cats[idx] = newName
                saveProducts(getProducts().map(p =>
                    p.category.toLowerCase() === oldName.toLowerCase() ? { ...p, category: newName } : p
                ))
                Swal.fire({ icon: 'success', text: 'Category updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
            }
        } else {
            cats.push(newName)
            Swal.fire({ icon: 'success', text: 'Category added!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
        }

        saveCategories(cats)
        $('#catModal').modal('hide')
        reloadTable()
    })

})

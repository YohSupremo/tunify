$(document).ready(function () {
  const adminUser = sessionStorage.getItem('tunify_admin');
  if (!adminUser) {
    window.location.href = '../login.html';
    return;
  }
  document.body.dataset.page = 'admin-brands';
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

  const getBrands = () => {
    const s = localStorage.getItem('tunify_brands')
    return s ? JSON.parse(s) : TunifyBrands.slice()
  }

  const saveBrands = (list) => {
    localStorage.setItem('tunify_brands', JSON.stringify(list))
  }

  const getProducts = () => {
    const s = localStorage.getItem('tunify_products')
    return s ? JSON.parse(s) : TunifyProducts.slice()
  }

  const saveProducts = (list) => {
    localStorage.setItem('tunify_products', JSON.stringify(list))
  }

  const brandToSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  let table = $('#brandsTable').DataTable({
    data: getBrands().map(b => {
      const count = getProducts().filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length
      return [
        b.name,
        b.slug,
        count + ' product(s)',
        `<a href='#' class='editBtn' data-brand='${b.name}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
        `<a href='#' class='deletebtn' data-brand='${b.name}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`
      ]
    }),
    pageLength: 10,
    order: [[0, 'asc']],
    language: { searchPlaceholder: 'Search brands…', search: '' }
  })

  $('#btnAddNewBrand').on('click', function () {
    $('#brandForm')[0].reset()
    $('#brandOldName').val('')
    $('#modalTitle').text('Add Brand')
    $('#brandForm').removeClass('was-validated')
    $('#brandModal').modal('show')
  })

  $('#brandsTable tbody').on('click', 'a.editBtn', function (e) {
    e.preventDefault()
    const brandName = $(this).data('brand')
    $('#brandOldName').val(brandName)
    $('#brandName').val(brandName)
    $('#modalTitle').text('Edit Brand')
    $('#brandForm').removeClass('was-validated')
    $('#brandModal').modal('show')
  })

  $('#brandsTable tbody').on('click', 'a.deletebtn', function (e) {
    e.preventDefault()
    const brandName = $(this).data('brand')
    const count = getProducts().filter(p => p.brand.toLowerCase() === brandName.toLowerCase()).length

    if (count > 0) {
      bootbox.alert({
        title: "<span class='text-danger'><i class='fas fa-exclamation-circle'></i> Constraint Violation</span>",
        message: `Cannot delete brand <strong>"${brandName}"</strong> — it has <strong>${count} associated product(s)</strong>. Reassign or delete those products first.`
      })
      return
    }

    bootbox.confirm({
      message: `Do you want to delete the brand <strong>"${brandName}"</strong>?`,
      buttons: {
        confirm: { label: 'Yes', className: 'btn-success' },
        cancel: { label: 'No', className: 'btn-danger' }
      },
      callback: function (result) {
        if (result) {
          saveBrands(getBrands().filter(b => b.name.toLowerCase() !== brandName.toLowerCase()))
          Swal.fire({
            icon: 'success',
            text: `Brand "${brandName}" deleted`,
            showConfirmButton: false,
            position: 'bottom-right',
            timer: 1500,
            timerProgressBar: true
          })
          table.destroy()
          table = $('#brandsTable').DataTable({
            data: getBrands().map(b => {
              const c = getProducts().filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length
              return [b.name, b.slug, c + ' product(s)',
              `<a href='#' class='editBtn' data-brand='${b.name}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
              `<a href='#' class='deletebtn' data-brand='${b.name}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`]
            }),
            pageLength: 10, order: [[0, 'asc']],
            language: { searchPlaceholder: 'Search brands…', search: '' }
          })
        }
      }
    })
  })

  $('#brandForm').on('submit', function (e) {
    e.preventDefault()
    if (!this.checkValidity()) {
      $(this).addClass('was-validated')
      return
    }

    const oldName = $('#brandOldName').val()
    const newName = $('#brandName').val().trim()
    const newSlug = brandToSlug(newName)
    const list = getBrands()

    const isDuplicate = list.some(b =>
      b.name.toLowerCase() === newName.toLowerCase() &&
      b.name.toLowerCase() !== oldName.toLowerCase()
    )
    if (isDuplicate) {
      Swal.fire({ icon: 'warning', text: 'A brand with this name already exists!', showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
      $('#brandName').addClass('is-invalid')
      return
    }
    $('#brandName').removeClass('is-invalid')

    if (oldName) {
      const idx = list.findIndex(b => b.name.toLowerCase() === oldName.toLowerCase())
      if (idx !== -1) {
        list[idx] = { name: newName, slug: newSlug }
        saveProducts(getProducts().map(p =>
          p.brand.toLowerCase() === oldName.toLowerCase() ? { ...p, brand: newName } : p
        ))
        Swal.fire({ icon: 'success', text: 'Brand updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
      }
    } else {
      list.push({ name: newName, slug: newSlug })
      Swal.fire({ icon: 'success', text: 'Brand added!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
    }

    saveBrands(list)
    $('#brandModal').modal('hide')

    table.destroy()
    table = $('#brandsTable').DataTable({
      data: getBrands().map(b => {
        const c = getProducts().filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length
        return [b.name, b.slug, c + ' product(s)',
        `<a href='#' class='editBtn' data-brand='${b.name}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
        `<a href='#' class='deletebtn' data-brand='${b.name}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`]
      }),
      pageLength: 10, order: [[0, 'asc']],
      language: { searchPlaceholder: 'Search brands…', search: '' }
    })
  })

})

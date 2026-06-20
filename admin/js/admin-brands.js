$(document).ready(function () {
  const adminUser = sessionStorage.getItem('tunify_admin');
  if (!adminUser) {
    window.location.href = '../login.html';
    return;
  }
  document.body.dataset.page = 'admin-brands';
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

  // Now brandsList and productsList will store database objects
  let brandsList = [];
  let productsList = [];

  // 1. Fetch brands and products from the database API
  const loadDataFromDB = () => {
    $.ajax({
      method: "GET",
      url: `${url}items`,
      dataType: "json",
      success: function (products) {
        productsList = products;
        
        // Fetch brands after products load
        $.ajax({
          method: "GET",
          url: `${url}brands`,
          dataType: "json",
          success: function (data) {
            brandsList = data; 
            reloadTable();
          },
          error: function (err) {
            console.error("Failed to load brands:", err);
            Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch brands.' });
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

  // Render Checkboxes of Products inside the edit/add modal
  const renderProductChecklist = (brandId) => {
    const $checklist = $('#productChecklist');
    $checklist.empty();

    const products = getProducts();
    const brandObj = brandsList.find(b => b.id == brandId);
    const brandName = brandObj ? brandObj.name.toLowerCase() : '';

    products.forEach(p => {
        // Check if this product belongs to the current brand (by ID or fallback to name string)
        const isChecked = brandId !== 0 && (
            p.brand_id == brandId || 
            (p.brand && p.brand.toLowerCase() === brandName)
        );

        $checklist.append(`
            <label class="d-block text-white" style="font-size:0.8rem; margin-bottom:0.4rem; cursor:pointer;">
                <input type="checkbox" class="prod-assign-cb" value="${p.id}" ${isChecked ? 'checked' : ''} /> 
                ${p.name} <span style="font-size:0.7rem; color:var(--text-dim);">(${p.category})</span>
            </label>
        `);
    });
  }

  const brandToSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Build Table Rows (Columns: ID, Name, Associated Products Count, Description, Actions)
  const buildRows = () => brandsList.map(b => {
    const count = getProducts().filter(p => 
        p.brand_id == b.id || 
        (p.brand && p.brand.toLowerCase() === b.name.toLowerCase())
    ).length // Count by DB ID or Name string!
    const slug = brandToSlug(b.name)
    return [
      b.id, // Column 0: ID
      b.name, // Column 1: Name
      count + ' product(s)', // Column 2: Associated Products
      b.description || '—', // Column 3: Description
      `<a href='#' class='editBtn' data-id='${b.id}' data-brand='${b.name}'><i class='fas fa-edit' style='font-size:20px'></i></a>  ` +
      `<a href='#' class='deletebtn' data-brand='${b.name}'><i class='fas fa-trash-alt' style='font-size:20px;color:red'></i></a>`
    ]
  })

  let table = $('#brandsTable').DataTable({
    data: buildRows(),
    pageLength: 10,
    order: [[0, 'asc']],
    language: { searchPlaceholder: 'Search brands…', search: '' }
  })

  const reloadTable = () => {
    table.destroy()
    table = $('#brandsTable').DataTable({
      data: buildRows(),
      pageLength: 10, 
      order: [[0, 'asc']],
      language: { searchPlaceholder: 'Search brands…', search: '' }
    })
  }

  // Clicking Add Brand (Show and render product checklist)
  $('#btnAddNewBrand').on('click', function () {
    $('#brandForm')[0].reset()
    $('#brandOldName').val('')
    $('#brandId').val('')
    $('#modalTitle').text('Add Brand')
    
    // Render the product checklist and make it visible
    renderProductChecklist(0)
    $('#prodChecklistGroup').show()

    $('#brandForm').removeClass('was-validated')
    $('#brandModal').modal('show')
  })

  // Clicking Edit Brand
  $('#brandsTable tbody').on('click', 'a.editBtn', function (e) {
    e.preventDefault()
    const brandName = $(this).data('brand')
    const brandId = $(this).data('id')

    const brandObj = brandsList.find(b => b.id == brandId);
    if (!brandObj) return;

    $('#brandOldName').val(brandObj.name)
    $('#brandId').val(brandObj.id)
    $('#brandName').val(brandObj.name)
    $('#brandDesc').val(brandObj.description || '')

    // Render product checklist for this brand ID
    renderProductChecklist(brandObj.id)
    $('#prodChecklistGroup').show() // Show checklist for editing

    $('#modalTitle').text('Edit Brand')
    $('#brandForm').removeClass('was-validated')
    $('#brandModal').modal('show')
  })

  // DELETE Brand via API
  $('#brandsTable tbody').on('click', 'a.deletebtn', function (e) {
    e.preventDefault()
    const brandName = $(this).data('brand')

    bootbox.confirm({
      message: `Do you want to delete the brand <strong>"${brandName}"</strong>?`,
      buttons: {
        confirm: { label: 'Yes', className: 'btn-success' },
        cancel: { label: 'No', className: 'btn-danger' }
      },
      callback: function (result) {
        if (result) {
          $.ajax({
            method: "DELETE",
            url: `${url}brands`,
            data: JSON.stringify({ name: brandName }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
              "Authorization": "Bearer " + getToken()
            },
            success: function (res) {
              Swal.fire({ icon: 'success', text: `Brand "${brandName}" deleted`, showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
              loadDataFromDB();
            },
            error: function (err) {
              console.error(err);
              const errMsg = err.responseJSON && err.responseJSON.error 
                ? err.responseJSON.error 
                : "Failed to delete brand.";
              Swal.fire({ icon: 'error', title: 'Constraint Violation', text: errMsg });
            }
          });
        }
      }
    })
  })

  // CREATE / UPDATE Brand via API
  $('#brandForm').on('submit', function (e) {
    e.preventDefault()
    if (!this.checkValidity()) {
      $(this).addClass('was-validated')
      return
    }

    const oldName = $('#brandOldName').val()
    const newName = $('#brandName').val().trim()
    const description = $('#brandDesc').val().trim()

    // Gather all checked product IDs from the checklist
    const checkedProductIds = $('.prod-assign-cb:checked').map(function() {
        return parseInt($(this).val());
    }).get();

    if (oldName) {
      // Edit Mode (PUT request)
      $.ajax({
        method: "PUT",
        url: `${url}brands`,
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
          Swal.fire({ icon: 'success', text: 'Brand updated!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
          $('#brandModal').modal('hide')
          loadDataFromDB();
        },
        error: function (err) {
          console.error(err);
          const errMsg = err.responseJSON && err.responseJSON.error 
            ? err.responseJSON.error 
            : "Failed to update brand.";
          Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
        }
      })
    } else {
      // Add Mode (POST request)
      $.ajax({
        method: "POST",
        url: `${url}brands`,
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
          Swal.fire({ icon: 'success', text: 'Brand added!', showConfirmButton: false, position: 'bottom-right', timer: 1500, timerProgressBar: true })
          $('#brandModal').modal('hide')
          loadDataFromDB();
        },
        error: function (err) {
          console.error(err);
          const errMsg = err.responseJSON && err.responseJSON.error 
            ? err.responseJSON.error 
            : "Failed to add brand.";
          Swal.fire({ icon: 'warning', text: errMsg, showConfirmButton: false, position: 'bottom-right', timer: 2000, timerProgressBar: true })
        }
      })
    }
  })

  // Initialize Page
  loadDataFromDB();
})
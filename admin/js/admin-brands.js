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
  let logoFile = null;

  // File upload change handler
  $(document).on('change', '#brandLogoFile', function (e) {
    const file = e.target.files[0];
    if (!file) {
      logoFile = null;
      $('#fileLabel').text('Choose logo file...');
      $('#logoPreviewContainer').hide();
      return;
    }

    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image file.' });
      $(this).val('');
      logoFile = null;
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Max size is 2MB.' });
      $(this).val('');
      logoFile = null;
      return;
    }

    logoFile = file;
    $('#fileLabel').text(file.name);

    const reader = new FileReader();
    reader.onload = function (evt) {
      $('#logoPreview').attr('src', evt.target.result);
      $('#logoPreviewContainer').show();
    }
    reader.readAsDataURL(file);
  });

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

  // Build Table Rows (Columns: ID, Logo, Name, Associated Products Count, Description, Actions)
  const buildRows = () => brandsList.map(b => {
    const count = getProducts().filter(p => 
        p.brand_id == b.id || 
        (p.brand && p.brand.toLowerCase() === b.name.toLowerCase())
    ).length // Count by DB ID or Name string!
    const slug = brandToSlug(b.name)
    const logoSrc = b.logo_path
        ? (b.logo_path.startsWith('http') ? b.logo_path : `http://localhost:5000/${b.logo_path}`)
        : null
    const logoHtml = logoSrc 
        ? `<img src="${logoSrc}" height="30" style="max-width:80px; object-fit:contain; border-radius:4px; background: rgba(255,255,255,0.05); padding: 2px;" onerror="this.style.display='none';">`
        : `<i class="fas fa-tag" style="font-size:1.1rem; color:var(--gold); opacity:.5;"></i>`

    return [
      b.id, // Column 0: ID
      logoHtml, // Column 1: Logo
      b.name, // Column 2: Name
      count + ' product(s)', // Column 3: Associated Products
      b.description || '—', // Column 4: Description
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
    logoFile = null
    $('#brandLogoFile').val('')
    $('#logoPreview').attr('src', '')
    $('#logoPreviewContainer').hide()
    $('#fileLabel').text('Choose logo file...')
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

    logoFile = null
    $('#brandLogoFile').val('')
    if (brandObj.logo_path) {
      const logoSrc = brandObj.logo_path.startsWith('http') ? brandObj.logo_path : `http://localhost:5000/${brandObj.logo_path}`;
      $('#logoPreview').attr('src', logoSrc)
      $('#logoPreviewContainer').show()
      $('#fileLabel').text('Keep current logo')
    } else {
      $('#logoPreview').attr('src', '')
      $('#logoPreviewContainer').hide()
      $('#fileLabel').text('Choose logo file...')
    }

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

  // Initialize jQuery Validation
  const brandValidator = $('#brandForm').validate({
    errorClass: "is-invalid",
    validClass: "is-valid",
    errorElement: "div",
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback");
      error.insertAfter(element);
    },
    rules: {
      brandName: {
        required: true,
        minlength: 2,
        maxlength: 50
      },
      brandDesc: {
        maxlength: 500
      }
    },
    messages: {
      brandName: {
        required: "Brand Name is required.",
        minlength: "Brand Name must be at least 2 characters.",
        maxlength: "Brand Name cannot exceed 50 characters."
      },
      brandDesc: {
        maxlength: "Brand Description cannot exceed 500 characters."
      }
    }
  });

  // CREATE / UPDATE Brand via API
  $('#brandForm').on('submit', function (e) {
    e.preventDefault()
    if (!$(this).valid()) {
      brandValidator.focusInvalid();
      return;
    }

    const oldName = $('#brandOldName').val()
    const newName = $('#brandName').val().trim()
    const description = $('#brandDesc').val().trim()

    // Gather all checked product IDs from the checklist
    const checkedProductIds = $('.prod-assign-cb:checked').map(function() {
        return parseInt($(this).val());
    }).get();

    const formData = new FormData();
    formData.append('description', description);
    formData.append('productIds', JSON.stringify(checkedProductIds));
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    if (oldName) {
      // Edit Mode (PUT request)
      formData.append('oldName', oldName);
      formData.append('newName', newName);

      $.ajax({
        method: "PUT",
        url: `${url}brands`,
        data: formData,
        processData: false,
        contentType: false,
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
      formData.append('name', newName);

      $.ajax({
        method: "POST",
        url: `${url}brands`,
        data: formData,
        processData: false,
        contentType: false,
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
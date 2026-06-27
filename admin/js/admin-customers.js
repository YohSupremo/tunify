$(document).ready(function () {
    // ── Auth Guard ───────────────────────────────────────────────────────────
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-customers';
    loadNav();
    loadFooter();

    // ── API Config ───────────────────────────────────────────────────────────
    const url = 'http://localhost:5000/api/v1/';

    const getToken = () => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to access this page.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = '../login.html';
            });
            return null;
        }
        return JSON.parse(token);
    };

    // ── State ────────────────────────────────────────────────────────────────
    let customersList = [];
    let currentStatusFilter = 'active';
    let currentRoleFilter = 'all';

    // ── Load Customers from DB ───────────────────────────────────────────────
    function loadCustomersFromDB() {
        $.ajax({
            method: 'GET',
            url: `${url}customers?status=${currentStatusFilter}&role=${currentRoleFilter}`,
            dataType: 'json',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            },
            success: function (data) {
                customersList = data;
                initTable();
            },
            error: function (err) {
                console.error('Failed to load customers:', err);
                Swal.fire({ icon: 'error', title: 'Load Failed', text: 'Could not fetch customers from server.' });
            }
        });
    }

    // ── DataTable ────────────────────────────────────────────────────────────
    var table;

    function initTable() {
        if ($.fn.DataTable.isDataTable('#customersTable')) {
            $('#customersTable').DataTable().destroy();
        }

        var data = customersList.map(function (c) {
            // Format the joined date (only date part, not time)
            var joined = c.created_at
                ? new Date(c.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—';

            var fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || '—';
            var phone    = c.phone || '—';

            // Role badge & status badge
            var roleBadge = c.role === 'admin'
                ? '<span style="font-size:0.72rem;font-weight:700;color:var(--gold);background:rgba(251,191,36,0.12);padding:2px 8px;border-radius:20px;">Admin</span>'
                : '<span style="font-size:0.72rem;font-weight:600;color:var(--text-dim);background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:20px;">Customer</span>';
            
            var statusBadge = c.deleted_at
                ? '<span style="font-size:0.72rem;font-weight:700;color:#F43F5E;background:rgba(244,63,94,0.12);padding:2px 8px;border-radius:20px;margin-left:4px;">Deactivated</span>'
                : '';

            var actionHtml = '<button class="btn btn-sm btn-outline-info edit-btn mr-1" data-id="' + c.user_id + '" title="Edit Customer"><i class="fas fa-edit"></i></button>';
            if (c.role !== 'admin') {
                if (c.deleted_at) {
                    actionHtml += '<button class="btn btn-sm btn-outline-success reactivate-btn" data-id="' + c.user_id + '" title="Reactivate Customer"><i class="fas fa-user-check"></i></button>';
                } else {
                    actionHtml += '<button class="btn btn-sm btn-outline-danger deactivate-btn" data-id="' + c.user_id + '" title="Deactivate Customer"><i class="fas fa-user-slash"></i></button>';
                }
            }

            return [
                c.user_id,                                   // Column 0: User ID
                fullName,                                    // Column 1: Full Name
                c.email || '—',                              // Column 2: Email
                phone,                                       // Column 3: Phone
                roleBadge + statusBadge,                     // Column 4: Role/Status Badge
                c.order_count   + ' order(s)',               // Column 5: Orders
                c.address_count + ' address(es)',            // Column 6: Addresses
                joined,                                      // Column 7: Joined date
                actionHtml                                   // Column 8: Actions
            ];
        });

        table = $('#customersTable').DataTable({
            data: data,
            pageLength: 10,
            order: [[0, 'asc']],
            language: { searchPlaceholder: 'Search customers…', search: '' },
            columnDefs: [
                { targets: [4, 8], orderable: false }
            ]
        });
    }

    // ── Add Customer Button ──────────────────────────────────────────────
    $('#btnAddNewCustomer').on('click', function () {
        $('#customerForm')[0].reset();
        $('#customerId').val('');
        selectedAvatarFile = null;
        $('#customerAvatarFile').val('');
        
        // Reset modal avatar preview
        $('#modalCustomerAvatar').html('<i class="fas fa-user" style="font-size: 2rem; color: var(--gold);"></i>' + 
        '<div class="avatar-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.6rem; padding: 4px 0; text-align: center; opacity: 0; transition: opacity 0.2s; cursor: pointer;">Change</div>');
        
        // Show profile image upload section for creation
        $('#modalCustomerAvatar').closest('.form-row').show();
        
        // Hide addresses section
        $('#customerAddressesGroup').hide();
        
        // Show password field and set as required
        $('#customerPasswordRow').show();
        $('#customerPasswordHelp').hide();
        $('#customerPassword').prop('required', true).attr('placeholder', 'Enter password (min 6 characters)');
        
        $('#customerModalTitle').text('Add New Customer');
        $('#customerForm').removeClass('was-validated');
        $('#customerForm').find('.form-control').removeClass('is-valid is-invalid');
        $('#customerModal').modal('show');
    });

    // ── Edit Button (delegated) ──────────────────────────────────────────────
    let selectedAvatarFile = null;

    $('#customersTable').on('click', '.edit-btn', function () {
        var userId = parseInt($(this).data('id'));
        var c = customersList.find(function (x) { return x.user_id === userId; });
        if (!c) return;

        // Reset file selection
        selectedAvatarFile = null;
        $('#customerAvatarFile').val('');

        // Show profile image upload and addresses sections
        $('#modalCustomerAvatar').closest('.form-row').show();
        $('#customerAddressesGroup').show();

        // Show password field as optional edit
        $('#customerPasswordRow').show();
        $('#customerPasswordHelp').show();
        $('#customerPassword').prop('required', false).attr('placeholder', 'Enter new password to change (optional)').val('');

        // Populate form fields
        $('#customerId').val(c.user_id);
        $('#customerFirstName').val(c.first_name || '');
        $('#customerLastName').val(c.last_name || '');
        $('#customerEmail').val(c.email || '');
        $('#customerPhone').val(c.phone || '');
        $('#customerRole').val(c.role || 'customer');

        // Populate modal avatar preview
        if (c.profile_image_path) {
            $('#modalCustomerAvatar').html('<img src="http://localhost:5000/' + c.profile_image_path + '" style="width:100%;height:100%;object-fit:cover;"/>' + 
            '<div class="avatar-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.6rem; padding: 4px 0; text-align: center; opacity: 0; transition: opacity 0.2s; cursor: pointer;">Change</div>');
        } else {
            $('#modalCustomerAvatar').html('<i class="fas fa-user" style="font-size: 2rem; color: var(--gold);"></i>' + 
            '<div class="avatar-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.6rem; padding: 4px 0; text-align: center; opacity: 0; transition: opacity 0.2s; cursor: pointer;">Change</div>');
        }

        // Show modal title and clear old address list
        $('#customerModalTitle').text('Edit Customer — ' + ((c.first_name || '') + ' ' + (c.last_name || '')).trim());
        $('#customerAddressList').html('<p class="text-muted" style="font-size:0.8rem; margin:0;">Loading addresses…</p>');
        $('#customerForm').removeClass('was-validated');
        $('#customerForm').find('.form-control').removeClass('is-valid is-invalid');
        $('#customerModal').modal('show');

        // Fetch customer addresses for display inside the modal (read-only reference)
        fetchCustomerAddresses(c.user_id);
    });

    // ── Avatar Upload Events inside modal ────────────────────────────────────
    $(document).on('click', '#modalCustomerAvatar', function (e) {
        if (e.target.id === 'customerAvatarFile') return;
        $('#customerAvatarFile').click();
    });

    $(document).on('click', '#customerAvatarFile', function (e) {
        e.stopPropagation();
    });

    $(document).on('change', '#customerAvatarFile', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image.' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Max 2MB.' });
            return;
        }

        selectedAvatarFile = file;

        const reader = new FileReader();
        reader.onload = function (evt) {
            $('#modalCustomerAvatar').html('<img src="' + evt.target.result + '" style="width:100%;height:100%;object-fit:cover;"/>' + 
            '<div class="avatar-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 0.6rem; padding: 4px 0; text-align: center; opacity: 0; transition: opacity 0.2s; cursor: pointer;">Change</div>');
        };
        reader.readAsDataURL(file);
    });

    // ── Fetch and render addresses inside modal (read-only) ──────────────────
    // Enhancement: shows addresses inside the edit modal so admin has full context
    // of the customer's saved addresses without leaving the page.
    function fetchCustomerAddresses(userId) {
        $.ajax({
            method: 'GET',
            url: `${url}customers/${userId}`,
            dataType: 'json',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            },
            success: function (res) {
                var $list = $('#customerAddressList');
                $list.empty();

                if (!res.addresses || res.addresses.length === 0) {
                    $list.html('<p class="text-muted" style="font-size:0.8rem; margin:0;">No addresses saved yet.</p>');
                    return;
                }

                res.addresses.forEach(function (a) {
                    var defaultBadge = a.is_default
                        ? '<span class="badge badge-warning ml-1" style="font-size:0.65rem;">Default</span>'
                        : '';
                    $list.append(
                        '<div style="padding:0.4rem 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
                            '<span style="font-size:0.75rem; font-weight:600; color:var(--gold);">' + (a.label || 'Home') + '</span>' +
                            defaultBadge +
                            '<br>' +
                            '<span style="font-size:0.78rem; color:var(--text-dim);">' +
                                a.street + ', ' + a.city + ', ' + a.province + ' ' + a.zip_code +
                            '</span>' +
                        '</div>'
                    );
                });
            },
            error: function (err) {
                console.error('Failed to load addresses:', err);
                $('#customerAddressList').html('<p class="text-muted" style="font-size:0.8rem; margin:0;">Could not load addresses.</p>');
            }
        });
    }

    // ── Deactivate Button (delegated) ────────────────────────────────────────
    // Follows the same bootbox confirm + DELETE API pattern used in admin-suppliers.js.
    $('#customersTable').on('click', '.deactivate-btn', function () {
        var userId = parseInt($(this).data('id'));
        var c = customersList.find(function (x) { return x.user_id === userId; });
        if (!c) return;

        var fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.email;

        bootbox.confirm({
            message: 'Are you sure you want to <strong>deactivate</strong> the customer account of <strong>' + fullName + '</strong>?<br><small class="text-muted">The customer will not be able to log in. This action can be reversed in the database.</small>',
            buttons: {
                confirm: { label: 'Yes, Deactivate', className: 'btn-danger' },
                cancel:  { label: 'Cancel',           className: 'btn-outline-secondary' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: 'DELETE',
                        url: `${url}customers/${userId}`,
                        headers: {
                            'Authorization': 'Bearer ' + getToken()
                        },
                        success: function (res) {
                            Swal.fire({
                                icon: 'success',
                                text: 'Customer "' + fullName + '" has been deactivated.',
                                showConfirmButton: false,
                                position: 'bottom-right',
                                timer: 1800,
                                timerProgressBar: true
                            });
                            loadCustomersFromDB();
                        },
                        error: function (err) {
                            console.error(err);
                            var errMsg = err.responseJSON && err.responseJSON.error
                                ? err.responseJSON.error
                                : 'Failed to deactivate customer.';
                            Swal.fire({ icon: 'error', title: 'Error', text: errMsg });
                        }
                    });
                }
            }
        });
    });

    // ── Reactivate Button (delegated) ────────────────────────────────────────
    $('#customersTable').on('click', '.reactivate-btn', function () {
        var userId = parseInt($(this).data('id'));
        var c = customersList.find(function (x) { return x.user_id === userId; });
        if (!c) return;

        var fullName = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.email;

        bootbox.confirm({
            message: 'Are you sure you want to <strong>reactivate</strong> the customer account of <strong>' + fullName + '</strong>?<br><small class="text-muted">The customer will be able to log in again immediately.</small>',
            buttons: {
                confirm: { label: 'Yes, Reactivate', className: 'btn-success' },
                cancel:  { label: 'Cancel',           className: 'btn-outline-secondary' }
            },
            callback: function (result) {
                if (result) {
                    $.ajax({
                        method: 'PATCH',
                        url: `${url}customers/${userId}/reactivate`,
                        headers: {
                            'Authorization': 'Bearer ' + getToken()
                        },
                        success: function (res) {
                            Swal.fire({
                                icon: 'success',
                                text: 'Customer "' + fullName + '" has been reactivated.',
                                showConfirmButton: false,
                                position: 'bottom-right',
                                timer: 1800,
                                timerProgressBar: true
                            });
                            loadCustomersFromDB();
                        },
                        error: function (err) {
                            console.error(err);
                            var errMsg = err.responseJSON && err.responseJSON.error
                                ? err.responseJSON.error
                                : 'Failed to reactivate customer.';
                            Swal.fire({ icon: 'error', title: 'Error', text: errMsg });
                        }
                    });
                }
            }
        });
    });

    // ── Handle Status Filter Change ──────────────────────────────────────────
    $(document).on('change', '#statusFilter', function () {
        currentStatusFilter = $(this).val();
        loadCustomersFromDB();
    });

    // ── Handle Role Filter Change ────────────────────────────────────────────
    $(document).on('change', '#roleFilter', function () {
        currentRoleFilter = $(this).val();
        loadCustomersFromDB();
    });

    // ── Form Submit (UPDATE Customer) ────────────────────────────────────────
    // Follows the same form submit + PUT API pattern used in admin-suppliers.js.
    $('#customerForm').on('submit', function (e) {
        e.preventDefault();
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }

        var userId = $('#customerId').val();
        var $btn = $('#btnSaveCustomer');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving…');

        if (!userId) {
            // CREATE customer
            var formData = new FormData();
            formData.append('email', $('#customerEmail').val().trim());
            formData.append('password', $('#customerPassword').val());
            formData.append('first_name', $('#customerFirstName').val().trim());
            formData.append('last_name', $('#customerLastName').val().trim());
            formData.append('phone', $('#customerPhone').val().trim());
            formData.append('role', $('#customerRole').val());

            if (selectedAvatarFile) {
                formData.append('image', selectedAvatarFile);
            }

            $.ajax({
                method: 'POST',
                url: `${url}customers`,
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                },
                success: function (res) {
                    $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Customer');
                    Swal.fire({
                        icon: 'success',
                        text: 'Customer created successfully!',
                        showConfirmButton: false,
                        position: 'bottom-right',
                        timer: 1500,
                        timerProgressBar: true
                    });
                    $('#customerModal').modal('hide');
                    loadCustomersFromDB();
                },
                error: function (err) {
                    $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Customer');
                    console.error(err);
                    var errMsg = err.responseJSON && err.responseJSON.error
                        ? err.responseJSON.error
                        : 'Failed to create customer.';
                    Swal.fire({
                        icon: 'warning',
                        text: errMsg,
                        showConfirmButton: false,
                        position: 'bottom-right',
                        timer: 2000,
                        timerProgressBar: true
                    });
                }
            });
        } else {
            // UPDATE customer
            var formData = new FormData();
            formData.append('email', $('#customerEmail').val().trim());
            formData.append('first_name', $('#customerFirstName').val().trim());
            formData.append('last_name', $('#customerLastName').val().trim());
            formData.append('phone', $('#customerPhone').val().trim());
            formData.append('role', $('#customerRole').val());

            var passwordVal = $('#customerPassword').val();
            if (passwordVal && passwordVal.trim() !== '') {
                formData.append('password', passwordVal.trim());
            }

            if (selectedAvatarFile) {
                formData.append('image', selectedAvatarFile);
            }

            $.ajax({
                method: 'PUT',
                url: `${url}customers/${userId}`,
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + getToken()
                },
                success: function (res) {
                    $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Customer');
                    Swal.fire({
                        icon: 'success',
                        text: 'Customer updated!',
                        showConfirmButton: false,
                        position: 'bottom-right',
                        timer: 1500,
                        timerProgressBar: true
                    });
                    $('#customerModal').modal('hide');
                    loadCustomersFromDB();
                },
                error: function (err) {
                    $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Customer');
                    console.error(err);
                    var errMsg = err.responseJSON && err.responseJSON.error
                        ? err.responseJSON.error
                        : 'Failed to update customer.';
                    Swal.fire({
                        icon: 'warning',
                        text: errMsg,
                        showConfirmButton: false,
                        position: 'bottom-right',
                        timer: 2000,
                        timerProgressBar: true
                    });
                }
            });
        }
    });

    // ── Phone Input Sanitization ─────────────────────────────────────────────
    $('#customerPhone').on('input', function () {
        var val = $(this).val();
        var cleanVal = val.replace(/[^\d\s+-]/g, '');
        if (cleanVal.startsWith('-')) {
            cleanVal = cleanVal.slice(1);
        }
        if (cleanVal.indexOf('+') > 0) {
            cleanVal = cleanVal.charAt(0) + cleanVal.slice(1).replace(/\+/g, '');
        }
        if (val !== cleanVal) {
            $(this).val(cleanVal);
        }
    });

    // ── Real-Time Form Field Validation ──────────────────────────────────────
    function validateInput(el) {
        var $el = $(el);
        var id = $el.attr('id');
        var val = $el.val();
        var isValid = false;

        if (id === 'customerFirstName' || id === 'customerLastName') {
            isValid = val.trim().length >= 2;
        } else if (id === 'customerEmail') {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
        } else if (id === 'customerPhone') {
            var phoneVal = val.trim();
            isValid = phoneVal === "" || /^\+?[0-9][0-9\s\-]{6,14}$/.test(phoneVal);
        } else if (id === 'customerPassword') {
            var isEdit = $('#customerId').val() !== '';
            if (isEdit && val === '') {
                $el.removeClass('is-invalid is-valid');
                return;
            } else {
                isValid = val.length >= 6;
            }
        }

        if (isValid) {
            $el.removeClass('is-invalid').addClass('is-valid');
        } else {
            $el.removeClass('is-valid').addClass('is-invalid');
        }
    }

    $('#customerFirstName, #customerLastName, #customerEmail, #customerPhone, #customerPassword').on('input change', function () {
        validateInput(this);
    });

    // ── Initialize Page ──────────────────────────────────────────────────────
    loadCustomersFromDB();
});

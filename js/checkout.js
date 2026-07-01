$(document).ready(function () {

    const apiBaseUrl = typeof url !== 'undefined' ? url : 'http://localhost:5000/';
    
    // Page Access Check
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) {
        return; // app.js handles redirection
    }

    // Load checkout items
    const checkoutItemsStr = localStorage.getItem('tunify_checkout_items');
    if (!checkoutItemsStr) {
        Swal.fire({
            icon: 'warning',
            title: 'No Items Selected',
            text: 'Your checkout queue is empty. Redirecting to cart…'
        }).then(function () {
            window.location.href = 'cart.html';
        });
        return;
    }

    const checkoutItems = JSON.parse(checkoutItemsStr);
    if (!checkoutItems.length) {
        window.location.href = 'cart.html';
        return;
    }

    document.body.dataset.page = 'shop';
    loadNav();
    loadFooter();

    let customerProfile = null;
    let savedAddresses = [];
    let selectedAddressId = null;
    let editingAddressId = null; // Track which address is being edited (null for new address)

    let currentShippingFee = 100.00;

    /* ── Fetch Delivery & Customer Details ────────────────────── */
    function loadDeliveryDetails() {
        // 1. Fetch Profile info (Full name & Phone)
        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/update-profile`,
            data: JSON.stringify({ user_id: userId }),
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (profileRes) {
                if (profileRes && profileRes.customer) {
                    customerProfile = profileRes.customer;
                }
                
                // 2. Fetch Addresses
                $.ajax({
                    method: "GET",
                    url: `${apiBaseUrl}api/v1/addresses`,
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (addrRes) {
                        if (addrRes && addrRes.success && addrRes.addresses) {
                            savedAddresses = addrRes.addresses;
                            
                            // If no address selected yet, default to the default address or first address
                            if (!selectedAddressId && savedAddresses.length > 0) {
                                const defaultAddr = savedAddresses.find(a => a.is_default === 1 || a.is_default === true || a.is_default === "1");
                                if (defaultAddr) {
                                    selectedAddressId = defaultAddr.id;
                                } else {
                                    selectedAddressId = savedAddresses[0].id;
                                }
                            }
                        } else {
                            savedAddresses = [];
                        }
                        renderDeliveryInfo();
                    },
                    error: function (err) {
                        console.error("Failed to load addresses:", err);
                        renderDeliveryInfo();
                    }
                });
            },
            error: function (err) {
                console.error("Failed to load customer profile:", err);
                renderDeliveryInfo();
            }
        });
    }

    /* ── Render Delivery Info (Shopee Style: Name Phone \n Address) ── */
    function renderDeliveryInfo() {
        const $container = $('#deliveryInfoContainer');
        $container.empty();

        if (!customerProfile) {
            $container.html('<div class="text-center py-2"><i class="fas fa-spinner fa-spin mr-2"></i> Loading delivery details...</div>');
            return;
        }

        const fullName = `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Valued Customer';
        const phone = customerProfile.phone || 'No phone number configured';

        if (savedAddresses.length === 0) {
            $container.html(`
                <div class="mb-2" style="font-size: 1rem; font-weight: 600; color: var(--text);">
                    ${fullName} ${phone}
                </div>
                <div class="alert alert-warning mb-0 d-flex align-items-center justify-content-between" style="border: 1px dashed var(--gold); background: rgba(212, 175, 55, 0.05); color: var(--gold); padding: 0.75rem 1rem;">
                    <div>
                        <i class="fas fa-exclamation-triangle mr-2"></i> No delivery addresses configured. Please add an address to continue.
                    </div>
                </div>
            `);
            return;
        }

        // Render list of selectable address cards (Shopee style layout)
        let html = `<div class="d-flex flex-column" style="gap: 0.75rem;">`;
        savedAddresses.forEach(function (addr) {
            const isChecked = selectedAddressId == addr.id;
            const isDefault = addr.is_default === 1 || addr.is_default === true || addr.is_default === "1";
            
            html += `
                <div class="address-select-card p-3 rounded d-flex align-items-center justify-content-between ${isChecked ? 'selected-address' : ''}" 
                     data-id="${addr.id}" 
                     style="background: ${isChecked ? 'rgba(212, 175, 55, 0.06)' : 'rgba(255,255,255,0.02)'}; 
                            border: 1px solid ${isChecked ? 'var(--gold)' : 'var(--border)'}; 
                            cursor: pointer; 
                            transition: all 0.2s ease;">
                    <div class="d-flex align-items-start" style="gap: 1rem; flex: 1;">
                        <input type="radio" name="selectedAddressRadio" value="${addr.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; transform: scale(1.2); accent-color: var(--gold); margin-top: 0.35rem;" />
                        <div style="flex: 1;">
                            <div class="mb-1" style="font-size: 0.95rem;">
                                <span class="font-weight-bold" style="color: var(--text);">${fullName}</span>
                                <span class="ml-2 text-muted" style="font-size: 0.85rem;">${phone}</span>
                                ${isDefault ? '<span class="ml-2" style="background:var(--gold-dim); color:#fff; font-size:.65rem; padding: 0.05rem 0.3rem; border-radius:3px;"><i class="fas fa-check"></i> Default</span>' : ''}
                            </div>
                            <div style="font-size: 0.88rem; color: var(--silver); line-height: 1.4;">
                                <span class="badge badge-secondary mr-1" style="font-size: 0.72rem; padding: 0.15rem 0.35rem; background: rgba(255,255,255,0.08);">${addr.label}</span>
                                 ${addr.street}, ${addr.city}, ${addr.province}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center ml-3" style="gap: 0.5rem;">
                        <button class="btn btn-sm btn-outline-gold btn-edit-address-checkout" data-id="${addr.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Edit Address">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-address-checkout" data-id="${addr.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Delete Address">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        $container.html(html);

        // Bind delete address click handlers
        $('.btn-delete-address-checkout').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const addressId = $(this).data('id');
            deleteAddressCheckout(addressId);
        });

        // Bind edit address click handlers
        $('.btn-edit-address-checkout').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const addressId = $(this).data('id');
            openEditAddressModal(addressId);
        });

        // Bind card select click handler
        $('.address-select-card').on('click', function() {
            const addressId = $(this).data('id');
            selectedAddressId = addressId;
            renderDeliveryInfo();
        });
    }

    /* ── Delete Address Action ───────────────────────────────────── */
    function deleteAddressCheckout(addressId) {
        confirmDialog('Are you sure you want to delete this address?', function (result) {
            if (result) {
                $.ajax({
                    method: "DELETE",
                    url: `${apiBaseUrl}api/v1/addresses/${addressId}`,
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (data) {
                        if (data && data.success) {
                            if (selectedAddressId == addressId) {
                                selectedAddressId = null;
                            }
                            loadDeliveryDetails();
                            swalToast('success', 'Address deleted successfully!');
                        }
                    },
                    error: function (error) {
                        console.error("Failed to delete address:", error);
                        swalToast('error', 'Failed to delete address.');
                    }
                });
            }
        });
    }

    /* ── Render Products Ordered ────────────────────────────────── */
    function renderProducts() {
        const $container = $('#productsOrderedContainer');
        $container.empty();
        
        let subtotal = 0;
        checkoutItems.forEach(function (item) {
            const itemSubtotal = item.price * item.quantity;
            subtotal += itemSubtotal;
            
            $container.append(`
                <div class="checkout-item-row">
                    <div class="checkout-item-left">
                        <img src="${item.image || ''}" class="checkout-item-img" onerror="this.style.display='none'">
                        <div>
                            <div class="checkout-item-name">${item.description}</div>
                            <div class="checkout-item-qty">Quantity: ${item.quantity}</div>
                        </div>
                    </div>
                    <div class="checkout-item-price" style="white-space: nowrap;">₱ ${itemSubtotal.toFixed(2)}</div>
                </div>
            `);
        });

        // Update Summary block details from settings
        const totalPayment = subtotal + currentShippingFee;

        $('#merchandiseSubtotal').text('₱ ' + subtotal.toFixed(2));
        $('#shippingFee').text('₱ ' + currentShippingFee.toFixed(2));
        $('#totalPayment').text('₱ ' + totalPayment.toFixed(2));
    }

    /* ── Payment Option Selection & Sub-forms ───────────────────── */
    function handlePaymentForm(method) {
        const $formContainer = $('#paymentDetailsForm');
        $formContainer.empty();

        if (method === 'cod') {
            $formContainer.hide();
            return;
        }

        $formContainer.show();

        if (method === 'gcash') {
            $formContainer.html(`
                <div>
                    <h6 style="color: var(--gold); font-size: 0.9rem; margin-bottom: 0.75rem;"><i class="fas fa-mobile-alt mr-1"></i> GCash Account Verification</h6>
                    <div class="form-group">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">GCash Mobile Number</label>
                        <input type="text" class="form-control" placeholder="e.g. 09171234567" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                    <div class="form-group mb-0">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Account Name</label>
                        <input type="text" class="form-control" placeholder="e.g. Juan Dela Cruz" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                </div>
            `);
        } else if (method === 'card') {
            $formContainer.html(`
                <div>
                    <h6 style="color: var(--gold); font-size: 0.9rem; margin-bottom: 0.75rem;"><i class="fas fa-credit-card mr-1"></i> Credit / Debit Card Information</h6>
                    <div class="form-group">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Cardholder Name</label>
                        <input type="text" class="form-control" placeholder="e.g. Juan Dela Cruz" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Card Number</label>
                        <input type="text" class="form-control" placeholder="e.g. 1234 5678 1234 5678" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                    <div class="row">
                        <div class="col-6 form-group mb-0">
                            <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Expiration Date</label>
                            <input type="text" class="form-control" placeholder="MM/YY" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                        </div>
                        <div class="col-6 form-group mb-0">
                            <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">CVV</label>
                            <input type="password" class="form-control" placeholder="123" maxlength="4" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                        </div>
                    </div>
                </div>
            `);
        } else if (method === 'bank_transfer') {
            $formContainer.html(`
                <div>
                    <h6 style="color: var(--gold); font-size: 0.9rem; margin-bottom: 0.75rem;"><i class="fas fa-university mr-1"></i> Bank Transfer Information</h6>
                    <div class="form-group">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Select Bank</label>
                        <select class="form-control" style="background: var(--surface); border: 1px solid var(--border); color: var(--text);">
                            <option>BDO Unibank</option>
                            <option>BPI (Bank of the Philippine Islands)</option>
                            <option>Metrobank</option>
                            <option>Landbank</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Account Number</label>
                        <input type="text" class="form-control" placeholder="e.g. 1234567890" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                    <div class="form-group mb-0">
                        <label style="font-size: 0.72rem; font-weight: 600; color: var(--silver); text-transform: uppercase;">Account Name</label>
                        <input type="text" class="form-control" placeholder="e.g. Juan Dela Cruz" required style="background: var(--surface); border: 1px solid var(--border); color: var(--text);" />
                    </div>
                </div>
            `);
        }
    }

    $('#paymentOptionsGrid').on('click', '.payment-option-card', function () {
        $('.payment-option-card').removeClass('selected');
        $('.payment-option-card input[type="radio"]').prop('checked', false);
        
        $(this).addClass('selected');
        $(this).find('input[type="radio"]').prop('checked', true);

        const method = $(this).data('method');
        handlePaymentForm(method);
    });

    /* ── Real-Time Validation Checks ────────────────────────────── */
    function validateDeliveryInput(el) {
        const $el = $(el);
        const id = $el.attr('id');
        const val = $el.val().trim();
        let isValid = false;

        if (id === 'checkoutPhoneInput') {
            isValid = val !== "" && /^\+?[0-9][0-9\s\-]{6,14}$/.test(val);
        } else if (id === 'checkoutAddrLabel') {
            isValid = val.length >= 2;
        } else if (id === 'checkoutAddrStreet') {
            isValid = val.length >= 5;
        } else if (id === 'checkoutAddrCity' || id === 'checkoutAddrProvince') {
            isValid = val.length >= 2;
        } else if (id === 'checkoutAddrZip') {
            isValid = /^\d{4,8}$/.test(val);
        }

        if (isValid) {
            $el.removeClass('is-invalid').addClass('is-valid');
        } else {
            $el.removeClass('is-valid').addClass('is-invalid');
        }
        return isValid;
    }

    $('#checkoutPhoneInput, #checkoutAddrLabel, #checkoutAddrStreet, #checkoutAddrCity, #checkoutAddrProvince, #checkoutAddrZip').on('input change', function () {
        validateDeliveryInput(this);
    });

    function resetModalValidation() {
        $('#checkoutDeliveryDetailsForm input').removeClass('is-valid is-invalid');
    }

    /* ── Modal Opening ───────────────────────────────────────────── */
    // Add Click
    $('#btnManageDelivery').on('click', function () {
        editingAddressId = null;
        $('#addressManagerModalLabel').html('<i class="fas fa-plus mr-2"></i> Add Delivery Address');
        resetModalValidation();
        
        // Reset address fields
        $('#checkoutAddrLabel').val('');
        $('#checkoutAddrStreet').val('');
        $('#checkoutAddrCity').val('');
        $('#checkoutAddrProvince').val('');
        $('#checkoutAddrZip').val('');
        $('#checkoutAddrDefault').prop('checked', false);

        // Prepopulate phone
        if (customerProfile) {
            $('#checkoutPhoneInput').val(customerProfile.phone || '');
            if (customerProfile.phone) {
                $('#checkoutPhoneInput').addClass('is-valid');
            }
        }

        $('#addressManagerModal').modal('show');
    });

    // Edit Click
    function openEditAddressModal(addressId) {
        editingAddressId = addressId;
        $('#addressManagerModalLabel').html('<i class="fas fa-edit mr-2"></i> Edit Delivery Address');
        resetModalValidation();

        const addr = savedAddresses.find(a => a.id == addressId);
        if (addr) {
            $('#checkoutAddrLabel').val(addr.label || '').addClass('is-valid');
            $('#checkoutAddrStreet').val(addr.street || '').addClass('is-valid');
            $('#checkoutAddrCity').val(addr.city || '').addClass('is-valid');
            $('#checkoutAddrProvince').val(addr.province || '').addClass('is-valid');
            $('#checkoutAddrZip').val(addr.zip_code || '').addClass('is-valid');
            $('#checkoutAddrDefault').prop('checked', addr.is_default === 1 || addr.is_default === true);
        }

        // Prepopulate phone
        if (customerProfile) {
            $('#checkoutPhoneInput').val(customerProfile.phone || '');
            if (customerProfile.phone) {
                $('#checkoutPhoneInput').addClass('is-valid');
            }
        }

        $('#addressManagerModal').modal('show');
    }

    // Save Delivery Details Form (Unified)
    $('#checkoutDeliveryDetailsForm').on('submit', function (e) {
        e.preventDefault();

        // Run validation on all fields
        let isFormValid = true;
        let invalidFields = [];
        
        const fieldNames = {
            'checkoutPhoneInput': 'Contact Number',
            'checkoutAddrLabel': 'Label',
            'checkoutAddrStreet': 'Block/Lot and Street',
            'checkoutAddrCity': 'City',
            'checkoutAddrProvince': 'Province',
            'checkoutAddrZip': 'Zip Code'
        };

        $('#checkoutPhoneInput, #checkoutAddrLabel, #checkoutAddrStreet, #checkoutAddrCity, #checkoutAddrProvince, #checkoutAddrZip').each(function() {
            const valid = validateDeliveryInput(this);
            if (!valid) {
                isFormValid = false;
                const labelName = fieldNames[$(this).attr('id')] || 'Field';
                invalidFields.push(labelName);
            }
        });

        if (!isFormValid) {
            Swal.fire({
                icon: 'warning',
                title: 'Validation Failed',
                html: `Please correct the errors in the following fields:<br><strong style="color: #ef4444; display: block; margin-top: 0.5rem;">${invalidFields.join(', ')}</strong>`
            });
            return;
        }

        const phone = $('#checkoutPhoneInput').val().trim();
        const label = $('#checkoutAddrLabel').val().trim();
        const street = $('#checkoutAddrStreet').val().trim();
        const city = $('#checkoutAddrCity').val().trim();
        const province = $('#checkoutAddrProvince').val().trim();
        const zip_code = $('#checkoutAddrZip').val().trim();
        const is_default = $('#checkoutAddrDefault').prop('checked');

        const $btn = $('#btnSaveCheckoutDetails');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving…');

        // Step 1: Save Phone (only if changed from current)
        const updatePhonePromise = () => {
            return new Promise((resolve, reject) => {
                const currentPhone = customerProfile && customerProfile.phone ? String(customerProfile.phone).replace(/[\s-]/g, '') : '';
                const newPhone = phone ? String(phone).replace(/[\s-]/g, '') : '';

                if (currentPhone === newPhone) {
                    return resolve(); // No change, skip
                }

                $.ajax({
                    method: "POST",
                    url: `${apiBaseUrl}api/v1/update-profile`,
                    data: JSON.stringify({
                        user_id: userId,
                        phone: phone
                    }),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (data) {
                        if (data && data.customer) {
                            customerProfile = data.customer;
                        }
                        resolve();
                    },
                    error: function (err) {
                        console.error("Phone update failed:", err);
                        reject(err);
                    }
                });
            });
        };

        // Step 2: Add or Update Address
        const saveAddressPromise = () => {
            return new Promise((resolve, reject) => {
                const url = editingAddressId 
                    ? `${apiBaseUrl}api/v1/addresses/${editingAddressId}`
                    : `${apiBaseUrl}api/v1/addresses`;

                const method = editingAddressId ? "PUT" : "POST";

                $.ajax({
                    method: method,
                    url: url,
                    data: JSON.stringify({ label: label || "Home", street, city, province, zip_code, is_default }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (data) {
                        if (!editingAddressId && data && data.success && data.address) {
                            selectedAddressId = data.address.id; // Auto-select newly added address
                        }
                        resolve();
                    },
                    error: function (err) {
                        console.error("Address save failed:", err);
                        reject(err);
                    }
                });
            });
        };

        // Execute sequentially
        updatePhonePromise()
            .then(function () {
                return saveAddressPromise();
            })
            .then(function() {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Details');
                $('#addressManagerModal').modal('hide');
                swalToast('success', editingAddressId ? 'Address details updated successfully!' : 'Address added successfully!');
                loadDeliveryDetails();
            })
            .catch(function(err) {
                console.error("Save process failed:", err);
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Details');
                
                const errMsg = err && err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "An error occurred while saving details.";
                
                Swal.fire({
                    icon: 'error',
                    title: 'Save Failed',
                    text: errMsg
                });
            });
    });

    /* ── Place Order Action ──────────────────────────────────────── */
    $('#btnPlaceOrder').on('click', function () {
        if (!selectedAddressId) {
            Swal.fire({
                icon: 'error',
                title: 'Address Required',
                text: 'Please select a delivery address or add a new one before placing your order.'
            });
            return;
        }

        // Validate that checkout phone is present
        if (!customerProfile || !customerProfile.phone || customerProfile.phone.trim() === '') {
            Swal.fire({
                icon: 'error',
                title: 'Phone Number Required',
                text: 'Please configure your contact number in delivery details before placing an order.'
            });
            return;
        }

        const selectedMethod = $('.payment-option-card.selected').data('method') || 'cod';
        
        // Validation on payment details form fields
        if (selectedMethod !== 'cod') {
            let formValid = true;
            $('#paymentDetailsForm input, #paymentDetailsForm select').each(function() {
                if ($(this).prop('required') && $(this).val().trim() === '') {
                    formValid = false;
                    $(this).addClass('is-invalid');
                } else {
                    $(this).removeClass('is-invalid');
                }
            });
            if (!formValid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Form Validation Failed',
                    text: 'Please fill in all payment method details fields.'
                });
                return;
            }
        }

        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Processing…');

        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/orders`,
            data: JSON.stringify({ 
                cart: checkoutItems,
                payment_method: selectedMethod,
                address_id: selectedAddressId
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (res) {
                // Remove purchased items from the main cart
                let cart = getCart();
                const checkoutItemIds = checkoutItems.map(i => String(i.item_id));
                let updatedCart = cart.filter(i => !checkoutItemIds.includes(String(i.item_id)));
                saveCart(updatedCart);
                
                // Clear temporary checkout storage
                localStorage.removeItem('tunify_checkout_items');

                Swal.fire({
                    icon: 'success',
                    title: 'Order Completed!',
                    text: `Your transaction ${res.orderId} has been successfully placed.`,
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true
                }).then(function () {
                    // Redirect to profile page and automatically show the "My Orders" tab
                    window.location.href = 'profile.html#orders';
                });
            },
            error: function (err) {
                console.error("Order placement failed:", err);
                $btn.prop('disabled', false).html('<i class="fas fa-shopping-cart"></i> Place Order');
                
                const errMsg = err.responseJSON && err.responseJSON.error 
                    ? err.responseJSON.error 
                    : "Something went wrong while placing your order.";
                    
                Swal.fire({
                    icon: 'error',
                    title: 'Checkout Failed',
                    text: errMsg
                });
            }
        });
    });

    /* ── Main Initialization ────────────────────────────────────── */
    loadDeliveryDetails();
    applyGlobalSettings(function(settings) {
        currentShippingFee = parseFloat(settings.default_shipping_fee || 100.00);
        renderProducts();
    });

});

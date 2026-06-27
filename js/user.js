$(document).ready(function () {

    const apiBaseUrl = typeof url !== 'undefined' ? url : 'http://localhost:5000/';
    const userId = getUserId();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // ── Page Access Restrictions & Init ──────────────────────────
    const page = document.body.dataset.page || '';

    if (page === 'login' || page === 'register') {
        if (sessionStorage.getItem('token')) {
            window.location.href = 'profile.html';
            return;
        }
        loadNav();
    } else if (page === 'profile') {
        if (!sessionStorage.getItem('token')) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to view your profile.',
                showConfirmButton: true
            }).then(function () {
                window.location.href = 'login.html';
            });
            return;
        }
        loadNav();
        loadFooter();
    }

    /* ── Password show/hide (login & register) ──────────────────── */
    $('.password-toggle, .pw-toggle-btn').on('click', function () {
        const $input = $(this).closest('.password-wrap, .input-wrap').find('input');
        const show = $input.attr('type') === 'password';
        $input.attr('type', show ? 'text' : 'password');
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });

    function saveUserSession(user, token) {
        sessionStorage.setItem('token', JSON.stringify(token));
        sessionStorage.setItem('userId', JSON.stringify(user.id));
        sessionStorage.setItem('tunify_email', user.email);

        if (user.name) {
            const parts = user.name.split(' ');
            sessionStorage.setItem('tunify_first_name', parts[0] || '');
            sessionStorage.setItem('tunify_last_name', parts.slice(1).join(' ') || '');
        } else {
            sessionStorage.setItem('tunify_first_name', '');
            sessionStorage.setItem('tunify_last_name', '');
        }

        // Role comes directly from the login API response — no email guessing
        if (user.role === 'admin') {
            sessionStorage.setItem('tunify_admin', 'true');
        } else {
            sessionStorage.removeItem('tunify_admin');
        }
    }

    /* ── Login submit ───────────────────────────────────────────── */
    let loginValidator;
    if (page === 'login') {
        loginValidator = $('#authForm').validate({
            errorClass: "is-invalid",
            validClass: "is-valid",
            errorElement: "div",
            rules: {
                email: {
                    required: true,
                    email: true
                },
                password: {
                    required: true,
                    minlength: 6
                }
            },
            messages: {
                email: {
                    required: "Login Email is required.",
                    email: "Please enter a valid Login Email address."
                },
                password: {
                    required: "Login Password is required.",
                    minlength: "Login Password must be at least 6 characters."
                }
            },
            errorPlacement: function (error, element) {
                error.addClass("invalid-feedback");
                if (element.closest('.password-wrap').length) {
                    error.insertAfter(element.closest('.password-wrap'));
                } else {
                    error.insertAfter(element);
                }
            }
        });
    }

    $('#login').on('click', function (e) {
        e.preventDefault();

        if (loginValidator && !$('#authForm').valid()) {
            loginValidator.focusInvalid();
            return;
        }

        const email = $('#email').val().trim();
        const password = $('#password').val();

        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Please wait…');

        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/login`,
            data: JSON.stringify({ email, password }),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (data) {
                saveUserSession(data.user, data.token);

                const isAdmin = sessionStorage.getItem('tunify_admin') === 'true';

                Swal.fire({
                    icon: 'success',
                    title: 'Welcome Back!',
                    text: 'Successfully logged in.',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                    position: 'bottom-right'
                }).then(function () {
                    window.location.href = isAdmin ? 'admin/dashboard.html' : 'index.html';
                });
            },
            error: function (error) {
                console.error(error);
                $btn.prop('disabled', false).html('<i class="fas fa-sign-in-alt"></i> Login');
                const errMsg = error.responseJSON && error.responseJSON.message
                    ? error.responseJSON.message
                    : (error.responseJSON && error.responseJSON.error ? error.responseJSON.error : 'Invalid email or password.');
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: errMsg,
                    showConfirmButton: true
                });
            }
        });
    });
    /* ── Register Submit and Multi-step Form Logic ───────────────── */
    if (page === 'register') {
        // Expose functions called inline to window
        window.goToStep = goToStep;
        window.toggleTerms = toggleTerms;

        // Music notes background
        const $bg = $('#musicBg');
        if ($bg.length) {
            const icons = ['♩', '♪', '♫', '♬', '𝄞', '𝄢'];
            for (let i = 0; i < 14; i++) {
                $('<div>')
                    .addClass('music-note')
                    .text(icons[Math.floor(Math.random() * icons.length)])
                    .css({
                        left: Math.random() * 100 + '%',
                        animationDuration: (12 + Math.random() * 14) + 's',
                        animationDelay: (Math.random() * 14) + 's',
                        fontSize: (1 + Math.random() * 1.5) + 'rem'
                    })
                    .appendTo($bg);
            }
        }

        let currentStep = 1;
        let selectedAvatar = null;
        let termsChecked = false;

        function goToStep(step, back = false) {
            const $current = $('#panel' + currentStep);
            const $next = $('#panel' + step);
            if (!$current.length || !$next.length) return;
            $current.removeClass('active');
            $next.toggleClass('slide-back', back).addClass('active');

            for (let i = 1; i <= 3; i++) {
                const $item = $('#stepItem' + i);
                const $bubble = $('#stepBubble' + i);
                if ($item.length && $bubble.length) {
                    $item.removeClass('active done');
                    if (i < step) {
                        $item.addClass('done');
                        $bubble.html('<i class="fas fa-check"></i>');
                    } else if (i === step) {
                        $item.addClass('active');
                        $bubble.text(i);
                    } else {
                        $bubble.text(i);
                    }
                }
            }

            const $line1 = $('#stepLine1');
            const $line2 = $('#stepLine2');
            if ($line1.length) $line1.css('width', step >= 2 ? '100%' : '0%');
            if ($line2.length) $line2.css('width', step >= 3 ? '100%' : '0%');

            currentStep = step;
        }

        // Initialize jQuery Validation for Register Form
        $.validator.addMethod("strongPassword", function(value, element) {
            const score = requirements.filter(req => req.test(value)).length;
            return this.optional(element) || score >= 2;
        }, "Password must meet at least 2 strength requirements.");

        window.registerValidator = $('#authForm').validate({
            ignore: [],
            errorClass: "is-invalid",
            validClass: "is-valid",
            errorElement: "div",
            rules: {
                first_name: {
                    required: true,
                    minlength: 2
                },
                last_name: {
                    required: true,
                    minlength: 2
                },
                email: {
                    required: true,
                    email: true
                },
                password: {
                    required: true,
                    minlength: 8,
                    strongPassword: true
                },
                confirmPassword: {
                    required: true,
                    equalTo: "#password"
                },
                terms: {
                    required: true
                }
            },
            messages: {
                first_name: {
                    required: "First Name is required.",
                    minlength: "First Name must be at least 2 characters."
                },
                last_name: {
                    required: "Last Name is required.",
                    minlength: "Last Name must be at least 2 characters."
                },
                email: {
                    required: "Email Address is required.",
                    email: "Please enter a valid Email Address."
                },
                password: {
                    required: "Password is required.",
                    minlength: "Password must be at least 8 characters."
                },
                confirmPassword: {
                    required: "Confirm Password is required.",
                    equalTo: "Passwords do not match."
                },
                terms: {
                    required: "You must accept the Terms of Service to proceed."
                }
            },
            errorPlacement: function (error, element) {
                error.addClass("invalid-feedback");
                if (element.attr("id") === "terms") {
                    error.insertAfter("#termsBox");
                } else if (element.closest('.input-wrap').length) {
                    error.insertAfter(element.closest('.input-wrap'));
                } else {
                    error.insertAfter(element);
                }
            }
        });

        $('#first_name, #last_name, #email, #confirmPassword').on('input', function () {
            if (window.registerValidator) {
                window.registerValidator.element(this);
            }
        });

        const requirements = [
            { id: 'req-len', test: v => v.length >= 8 },
            { id: 'req-upper', test: v => /[A-Z]/.test(v) },
            { id: 'req-num', test: v => /[0-9]/.test(v) },
            { id: 'req-special', test: v => /[^A-Za-z0-9]/.test(v) }
        ];
        const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = { 1: 'filled-1', 2: 'filled-2', 3: 'filled-3', 4: 'filled-4' };

        function calculatePasswordScore(v) {
            return requirements.filter(req => req.test(v)).length;
        }

        $('#password').on('input', function () {
            const v = $(this).val();
            const score = calculatePasswordScore(v);

            requirements.forEach(req => {
                const met = req.test(v);
                const $el = $('#' + req.id);
                if ($el.length) {
                    $el.toggleClass('met', met);
                    $el.find('i').attr('class', met ? 'fas fa-check-circle' : 'fas fa-circle');
                }
            });

            for (let i = 1; i <= 4; i++) {
                const $seg = $('#seg' + i);
                if ($seg.length) {
                    $seg.attr('class', 'strength-segment');
                    if (i <= score && score > 0) {
                        $seg.addClass(strengthColors[score]);
                    }
                }
            }

            const $lbl = $('#strengthLabel');
            if ($lbl.length) {
                $lbl.text(v.length === 0 ? 'Enter a password' : strengthLabels[score] || 'Weak');
                $lbl.css('color', score >= 3 ? '#A3E635' : score >= 2 ? '#FBBF24' : '#F87171');
            }

            if (window.registerValidator) {
                window.registerValidator.element(this);
                const conf = $('#confirmPassword').val();
                if (conf.length > 0) {
                    window.registerValidator.element("#confirmPassword");
                }
            }
        });

        function toggleTerms() {
            termsChecked = !termsChecked;
            $('#terms').prop('checked', termsChecked);
            $('#customCb').toggleClass('checked', termsChecked);
            $('#termsBox').toggleClass('checked', termsChecked);
            if (window.registerValidator) {
                window.registerValidator.element("#terms");
            }
        }

        $('#profilePicture').on('change', function () {
            const file = this.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image file' });
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Image must be less than 2MB' });
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedAvatar = e.target.result;
                $('#avatarPreviewCircle').html(
                    `<img src="${e.target.result}"/><div class="avatar-overlay"><i class="fas fa-camera"></i></div>`
                );
            };
            reader.readAsDataURL(file);
        });

        const $avatarZone = $('#avatarZone');
        if ($avatarZone.length) {
            $avatarZone.on('dragover', function (e) {
                e.preventDefault();
                $(this).addClass('drag-over');
            });
            $avatarZone.on('dragleave', function () {
                $(this).removeClass('drag-over');
            });
            $avatarZone.on('drop', function (e) {
                e.preventDefault();
                $(this).removeClass('drag-over');
                const file = e.originalEvent.dataTransfer.files[0];
                const $picInput = $('#profilePicture');
                if (file && $picInput.length) {
                    $picInput[0].files = e.originalEvent.dataTransfer.files;
                    $picInput.trigger('change');
                }
            });
        }

        $('#toStep2').on('click', function () {
            const isFirstNameValid = window.registerValidator.element("#first_name");
            const isLastNameValid = window.registerValidator.element("#last_name");
            const isEmailValid = window.registerValidator.element("#email");

            if (!isFirstNameValid || !isLastNameValid || !isEmailValid) {
                Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please complete all required fields' });
                return;
            }
            goToStep(2);
        });

        $('#toStep3').on('click', function () {
            const isPassValid = window.registerValidator.element("#password");
            const isConfValid = window.registerValidator.element("#confirmPassword");
            const isTermsValid = window.registerValidator.element("#terms");

            if (!isPassValid || !isConfValid || !isTermsValid) {
                if (!isTermsValid) {
                    $('#termsBox').addClass('shake');
                    setTimeout(() => $('#termsBox').removeClass('shake'), 400);
                    Swal.fire({ icon: 'error', title: 'Terms of Service', text: 'Please agree to the Terms & Privacy Policy' });
                } else {
                    Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please complete all required fields' });
                }
                return;
            }

            const firstName = $('#first_name').val().trim();
            const lastName = $('#last_name').val().trim();
            const name = (firstName + ' ' + lastName).trim();
            $('#reviewName').text(name);
            $('#reviewEmail').text($('#email').val().trim());
            if (selectedAvatar) {
                $('#reviewAvatarCircle').html(`<img src="${selectedAvatar}"/>`);
            } else {
                const initial = firstName ? firstName.charAt(0).toUpperCase() : '';
                $('#reviewAvatarCircle').html(`<span style="font-size:1.3rem;font-weight:700;color:var(--gold);">${initial}</span>`);
            }

            goToStep(3);
        });

        $('#toStep1').on('click', () => goToStep(1, true));
        $('#toStep2b').on('click', () => goToStep(2, true));

        $('#authForm').on('submit', function (e) {
            e.preventDefault();
            const $btn = $('#submitBtn');
            if (!$btn.length) return;
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Creating your account…');

            const firstName = $('#first_name').val().trim();
            const lastName = $('#last_name').val().trim();
            const email = $('#email').val().trim();
            const password = $('#password').val();

            $.ajax({
                method: "POST",
                url: `${apiBaseUrl}api/v1/register`,
                data: JSON.stringify({ first_name: firstName, last_name: lastName, email, password }),
                processData: false,
                contentType: 'application/json; charset=utf-8',
                dataType: "json",
                success: function (regData) {
                    $.ajax({
                        method: "POST",
                        url: `${apiBaseUrl}api/v1/login`,
                        data: JSON.stringify({ email, password }),
                        processData: false,
                        contentType: 'application/json; charset=utf-8',
                        dataType: "json",
                        success: function (loginData) {
                            saveUserSession(loginData.user, loginData.token);

                            const $fileInput = $('#profilePicture');
                            const avatarFile = $fileInput.length ? $fileInput[0].files[0] : null;

                            const proceedToSuccess = () => {
                                $('#authForm').hide();
                                $('#stepProgress').hide();
                                $('.register-header').hide();
                                $('.register-benefits').hide();
                                $('#footerLink').hide();
                                $('#successPanel').show();

                                setTimeout(() => {
                                    $('#redirectBar').css('width', '100%');
                                }, 50);

                                Swal.fire({
                                    icon: 'success',
                                    title: 'Account Created!',
                                    text: 'Welcome to Tunify! 🎵',
                                    showConfirmButton: false,
                                    timer: 2000
                                });
                                setTimeout(() => window.location.href = 'profile.html', 2200);
                            };

                            if (avatarFile) {
                                const formData = new FormData();
                                formData.append('user_id', loginData.user.id);
                                formData.append('image', avatarFile);

                                formData.append('first_name', firstName);
                                formData.append('last_name', lastName);

                                $.ajax({
                                    method: "POST",
                                    url: `${apiBaseUrl}api/v1/update-profile`,
                                    data: formData,
                                    processData: false,
                                    contentType: false,
                                    dataType: "json",
                                    success: function (profileData) {
                                        if (profileData && profileData.customer && profileData.customer.profile_image_path) {
                                            sessionStorage.setItem('tunify_avatar', 'http://localhost:5000/' + profileData.customer.profile_image_path);
                                        }
                                        proceedToSuccess();
                                    },
                                    error: function (uploadErr) {
                                        console.error("Avatar upload failed:", uploadErr);
                                        proceedToSuccess();
                                    }
                                });
                            } else {
                                proceedToSuccess();
                            }
                        },
                        error: function (loginErr) {
                            console.error(loginErr);
                            $btn.prop('disabled', false).html('<i class="fas fa-user-plus"></i> Create Account');
                            Swal.fire({ icon: 'error', title: 'Auto-Login Failed', text: 'Account created, but we could not log you in automatically. Please sign in.' });
                            setTimeout(() => window.location.href = 'login.html', 2000);
                        }
                    });
                },
                error: function (regErr) {
                    console.error(regErr);
                    $btn.prop('disabled', false).html('<i class="fas fa-user-plus"></i> Create Account');
                    const errMsg = regErr.responseJSON && regErr.responseJSON.error ? regErr.responseJSON.error : 'Registration failed.';
                    Swal.fire({ icon: 'error', title: 'Registration Failed', text: errMsg });
                }
            });
        });


    }

    /* ── Profile Loading & Display ──────────────────────────────── */
    let userData = {
        first_name: sessionStorage.getItem('tunify_first_name') || '',
        last_name: sessionStorage.getItem('tunify_last_name') || '',
        email: sessionStorage.getItem('tunify_email') || '',
        phone: sessionStorage.getItem('tunify_phone') || '',
        address_line: sessionStorage.getItem('tunify_address_line') || '',
        zip_code: sessionStorage.getItem('tunify_zip_code') || '',
        avatar: sessionStorage.getItem('tunify_avatar') || null
    };

    function renderProfile() {
        const fullName = ((userData.first_name || '') + ' ' + (userData.last_name || '')).trim() || 'Guest User';
        $('#profileName').text(fullName);
        $('#profileEmail').text(userData.email);

        $('#editFirstName').val(userData.first_name);
        $('#editLastName').val(userData.last_name);
        $('#editEmail').val(userData.email).prop('disabled', true);
        $('#editPhone').val(userData.phone);

        const $avatarContainer = $('#profileAvatarContainer');
        if ($avatarContainer.length) {
            if (userData.avatar) {
                $avatarContainer.html(`<img src="${userData.avatar}" style="width:100%;height:100%;object-fit:cover;"/>`);
            } else {
                $avatarContainer.html('<i class="fas fa-user"></i>');
            }
        }

        // Render orders from the database
        if ($('#orderList').length) {
            const token = getToken();
            if (token) {
                $.ajax({
                    method: "GET",
                    url: `${apiBaseUrl}api/v1/orders`,
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (dbOrders) {
                        if (!dbOrders || dbOrders.length === 0) {
                            $('#orderList').html('<div class="text-white text-center py-3">No orders yet</div>');
                            return;
                        }
                        $('#orderList').html(dbOrders.map(function (o) {
                            const isPending = o.status.toLowerCase() === 'pending';
                            const cancelBtn = isPending
                                ? `<button type="button" class="btn btn-sm btn-danger cancel-order-btn" data-raw-id="${o.raw_id}" data-id="${o.id}" style="font-size: 0.72rem; padding: 0.25rem 0.65rem; border-radius: 4px;">
                                     <i class="fas fa-times-circle mr-1"></i> Cancel Order
                                   </button>`
                                : '';
                            return `
                                <div class="order-card">
                                  <div class="order-card-header">
                                    <span class="order-card-id">${o.id}</span>
                                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                                  </div>
                                  <div class="order-card-date">${o.date} · ₱${o.total.toLocaleString()}</div>
                                  <div style="font-size:.78rem;color:var(--text-dim);margin-top:.35rem;margin-bottom:1rem;">${o.items.join(', ')}</div>
                                  <div class="d-flex justify-content-end" style="gap: 0.5rem; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem;">
                                    ${cancelBtn}
                                    <button type="button" class="btn btn-sm btn-outline-gold view-receipt-btn" data-raw-id="${o.raw_id}" data-id="${o.id}" style="font-size: 0.72rem; padding: 0.25rem 0.65rem; border-radius: 4px;">
                                      <i class="fas fa-file-invoice mr-1"></i> View Receipt
                                    </button>
                                  </div>
                                </div>`;
                        }).join(''));
                    },
                    error: function (err) {
                        console.error("Failed to load user orders:", err);
                        $('#orderList').html('<div class="text-white text-center py-3">Could not load orders</div>');
                    }
                });
            } else {
                $('#orderList').html('<div class="text-white text-center py-3">Please log in to view orders</div>');
            }
        }
    }

    function fetchProfile() {
        if (!userId) return;
        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/update-profile`,
            data: JSON.stringify({ user_id: userId }),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (data) {
                if (data && data.customer) {
                    const c = data.customer;
                    userData.first_name = c.first_name || '';
                    userData.last_name = c.last_name || '';
                    userData.phone = c.phone || '';
                    userData.address_line = c.address_line || '';
                    userData.zip_code = c.zip_code || '';

                    if (c.profile_image_path) {
                        userData.avatar = 'http://localhost:5000/' + c.profile_image_path;
                        sessionStorage.setItem('tunify_avatar', userData.avatar);
                    }
                    sessionStorage.setItem('tunify_first_name', userData.first_name);
                    sessionStorage.setItem('tunify_last_name', userData.last_name);
                    sessionStorage.setItem('tunify_phone', userData.phone);
                    sessionStorage.setItem('tunify_address_line', userData.address_line);
                    sessionStorage.setItem('tunify_zip_code', userData.zip_code);
                    renderProfile();
                }
            },
            error: function (error) {
                console.error("Error fetching profile:", error);
            }
        });
    }

    if (page === 'profile') {
        renderProfile();
        fetchProfile();
        loadAddresses();
    }

    let profileSavedAddresses = [];
    let editingProfileAddrId = null;

    function loadAddresses() {
        const token = getToken();
        if (!token) return;
        $.ajax({
            method: "GET",
            url: `${apiBaseUrl}api/v1/addresses`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                if (data && data.success && data.addresses) {
                    profileSavedAddresses = data.addresses;
                    const addresses = data.addresses;
                    const $list = $('#addressList');
                    $list.empty();
                    if (addresses.length === 0) {
                        $list.html('<div class="text-white text-center py-3">No addresses yet</div>');
                        return;
                    }
                    addresses.forEach(function (addr) {
                        const isDefault = addr.is_default === 1 || addr.is_default === true || addr.is_default === "1";
                        const defaultBadge = isDefault ? '<span class="address-badge ml-2"><i class="fas fa-check"></i> Default</span>' : '';
                        const defaultBtn = !isDefault
                            ? `<button class="btn-make-default make-default-addr" data-id="${addr.id}"><i class="fas fa-star mr-1"></i> Make Default</button>`
                            : '';
                        const editBtn = `<button class="btn-edit-addr edit-addr btn btn-sm btn-outline-gold mr-2" data-id="${addr.id}" style="padding: 0.15rem 0.45rem; font-size: 0.72rem; border-radius: 4px;"><i class="fas fa-edit mr-1"></i> Edit</button>`;
                        const deleteBtn = `<button class="btn-delete-addr delete-addr btn btn-sm btn-danger" data-id="${addr.id}" style="padding: 0.15rem 0.45rem; font-size: 0.72rem; border-radius: 4px;"><i class="fas fa-trash-alt mr-1"></i> Delete</button>`;

                        const cardHtml = `
                            <div class="address-card ${isDefault ? 'default-addr' : ''}">
                                <div class="address-details">
                                    <div class="address-label-row">
                                        <span class="address-label">${addr.label}</span>
                                        ${defaultBadge}
                                    </div>
                                    <div style="font-size: .88rem; color: var(--silver); margin-top: 0.25rem;">
                                        ${addr.street}, ${addr.city}, ${addr.province}
                                    </div>
                                </div>
                                <div class="address-actions d-flex align-items-center">
                                    ${defaultBtn}
                                    ${editBtn}
                                    ${deleteBtn}
                                </div>
                            </div>
                        `;
                        $list.append(cardHtml);
                    });
                }
            },
            error: function (err) {
                console.error("Failed to load addresses:", err);
                $('#addressList').html('<div class="text-white text-center py-3">Could not load addresses</div>');
            }
        });
    }

    // Edit Profile Address Clicked
    $(document).on('click', '.edit-addr', function (e) {
        e.preventDefault();
        const addressId = $(this).data('id');
        editingProfileAddrId = addressId;

        const addr = profileSavedAddresses.find(a => a.id == addressId);
        if (addr) {
            $('#profileAddrLabel').val(addr.label || '').removeClass('is-invalid is-valid');
            $('#profileAddrStreet').val(addr.street || '').removeClass('is-invalid is-valid');
            $('#profileAddrCity').val(addr.city || '').removeClass('is-invalid is-valid');
            $('#profileAddrProvince').val(addr.province || '').removeClass('is-invalid is-valid');
            $('#profileAddrZip').val(addr.zip_code || '').removeClass('is-invalid is-valid');
            $('#profileAddrDefault').prop('checked', addr.is_default === 1 || addr.is_default === true);

            $('#profileAddressModal').modal('show');
        }
    });

    // Real-Time Profile Address Form Validation
    function validateProfileAddrInput(el) {
        const $el = $(el);
        const id = $el.attr('id');
        const val = $el.val().trim();
        let isValid = false;

        if (id === 'profileAddrLabel') {
            isValid = val.length >= 2;
        } else if (id === 'profileAddrStreet') {
            isValid = val.length >= 5;
        } else if (id === 'profileAddrCity' || id === 'profileAddrProvince') {
            isValid = val.length >= 2;
        } else if (id === 'profileAddrZip') {
            isValid = /^\d{4,8}$/.test(val);
        }

        if (isValid) {
            $el.removeClass('is-invalid').addClass('is-valid');
        } else {
            $el.removeClass('is-valid').addClass('is-invalid');
        }
        return isValid;
    }

    $('#profileAddrLabel, #profileAddrStreet, #profileAddrCity, #profileAddrProvince, #profileAddrZip').on('input change', function () {
        validateProfileAddrInput(this);
    });

    // Profile Edit Address Submit
    $('#profileAddressForm').on('submit', function (e) {
        e.preventDefault();

        let isFormValid = true;
        let invalidFields = [];
        
        const fieldNames = {
            'profileAddrLabel': 'Label',
            'profileAddrStreet': 'Block/Lot and Street',
            'profileAddrCity': 'City',
            'profileAddrProvince': 'Province',
            'profileAddrZip': 'Zip Code'
        };

        $('#profileAddrLabel, #profileAddrStreet, #profileAddrCity, #profileAddrProvince, #profileAddrZip').each(function() {
            const valid = validateProfileAddrInput(this);
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

        const label = $('#profileAddrLabel').val().trim();
        const street = $('#profileAddrStreet').val().trim();
        const city = $('#profileAddrCity').val().trim();
        const province = $('#profileAddrProvince').val().trim();
        const zip_code = $('#profileAddrZip').val().trim();
        const is_default = $('#profileAddrDefault').prop('checked');

        const token = getToken();
        if (!token) return;

        const $btn = $('#btnSaveProfileAddress');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving…');

        $.ajax({
            method: "PUT",
            url: `${apiBaseUrl}api/v1/addresses/${editingProfileAddrId}`,
            data: JSON.stringify({ label, street, city, province, zip_code, is_default }),
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Details');
                if (data && data.success) {
                    $('#profileAddressModal').modal('hide');
                    Swal.fire({
                        icon: 'success',
                        title: 'Address Updated',
                        text: 'Your address details have been updated.',
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true,
                        position: 'bottom-right'
                    });
                    loadAddresses();
                }
            },
            error: function (err) {
                console.error("Failed to update profile address:", err);
                $btn.prop('disabled', false).html('<i class="fas fa-save mr-1"></i> Save Details');
                const errMsg = err.responseJSON && err.responseJSON.error ? err.responseJSON.error : 'Failed to update address.';
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: errMsg
                });
            }
        });
    });

    // Add Address Form Submit
    $('#addAddressForm').on('submit', function (e) {
        e.preventDefault();
        const label = $('#newAddressLabel').val().trim();
        const street = $('#newAddressStreet').val().trim();
        const city = $('#newAddressCity').val().trim();
        const province = $('#newAddressProvince').val().trim();
        const zip_code = $('#newAddressZip').val().trim();
        const is_default = $('#newAddressDefault').is(':checked') ? 1 : 0;

        if (!street || !city || !province || !zip_code) {
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'All fields are required.' });
            return;
        }

        const token = getToken();
        if (!token) return;

        const $btn = $('#saveNewAddressBtn');
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Adding…');

        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/addresses`,
            data: JSON.stringify({ label, street, city, province, zip_code, is_default }),
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                $btn.prop('disabled', false).html('<i class="fas fa-plus"></i> Add Address');
                if (data && data.success) {
                    $('#addAddressForm')[0].reset();
                    loadAddresses();
                    Swal.fire({
                        icon: 'success',
                        title: 'Address Added',
                        text: 'Your new address has been saved.',
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true,
                        position: 'bottom-right'
                    });
                }
            },
            error: function (error) {
                console.error("Error adding address:", error);
                $btn.prop('disabled', false).html('<i class="fas fa-plus"></i> Add Address');
                const errMsg = error.responseJSON && error.responseJSON.error ? error.responseJSON.error : 'Failed to add address.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errMsg
                });
            }
        });
    });

    // Delete Address Click Handler
    $(document).on('click', '.delete-addr', function (e) {
        e.preventDefault();
        const addressId = $(this).data('id');
        const token = getToken();
        if (!token) return;

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
                            loadAddresses();
                            swalToast('success', 'Address deleted successfully!');
                        }
                    },
                    error: function (error) {
                        console.error("Failed to delete address:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to delete address.'
                        });
                    }
                });
            }
        });
    });

    // Make Default Address Click Handler
    $(document).on('click', '.make-default-addr', function (e) {
        e.preventDefault();
        const addressId = $(this).data('id');
        const token = getToken();
        if (!token) return;

        $.ajax({
            method: "PUT",
            url: `${apiBaseUrl}api/v1/addresses/${addressId}/default`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                if (data && data.success) {
                    loadAddresses();
                    swalToast('success', 'Default address updated!');
                }
            },
            error: function (error) {
                console.error("Failed to update default address:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update default address.'
                });
            }
        });
    });

    /* ── Save profile ───────────────────────────────────────────── */
    $('#saveProfile, #updateBtn').on('click', function (e) {
        e.preventDefault();

        // Run validation check on all fields
        $('#editFirstName, #editLastName, #editPhone').each(function() {
            validateProfileInput(this);
        });

        if ($('#tabEdit .is-invalid').length > 0) {
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please fix the errors in the form before saving.' });
            return;
        }

        const first_name = $('#editFirstName').val().trim();
        const last_name = $('#editLastName').val().trim();
        const phone = $('#editPhone').val().trim();

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('first_name', first_name);
        formData.append('last_name', last_name);
        formData.append('phone', phone);

        const $btn = $(this);
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Saving…');

        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/update-profile`,
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            success: function (data) {
                $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
                if (data && data.customer) {
                    userData.first_name = first_name;
                    userData.last_name = last_name;
                    userData.phone = phone;

                    sessionStorage.setItem('tunify_first_name', first_name);
                    sessionStorage.setItem('tunify_last_name', last_name);
                    sessionStorage.setItem('tunify_phone', phone);

                    renderProfile();
                    Swal.fire({
                        icon: 'success',
                        title: 'Profile Saved',
                        text: 'Your changes have been saved.',
                        showConfirmButton: false,
                        timer: 1500,
                        timerProgressBar: true,
                        position: 'bottom-right'
                    });
                }
            },
            error: function (error) {
                console.error("Profile save failed:", error);
                $btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Changes');
                Swal.fire({
                    icon: 'error',
                    title: 'Error Saving Profile',
                    text: 'Failed to update profile details.'
                });
            }
        });
    });

    /* ── Avatar change ──────────────────────────────────────────── */
    $(document).on('click', '#profileAvatar', function (e) {
        if (e.target.id === 'editProfilePicture') return;
        $('#editProfilePicture').click();
    });

    $(document).on('click', '#editProfilePicture', function (e) {
        e.stopPropagation();
    });

    $(document).on('change', '#editProfilePicture', function (e) {
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

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('image', file);

        $.ajax({
            method: "POST",
            url: `${apiBaseUrl}api/v1/update-profile`,
            data: formData,
            processData: false,
            contentType: false,
            dataType: "json",
            success: function (data) {
                if (data && data.customer && data.customer.profile_image_path) {
                    userData.avatar = 'http://localhost:5000/' + data.customer.profile_image_path;
                    sessionStorage.setItem('tunify_avatar', userData.avatar);
                    renderProfile();
                    swalToast('success', 'Avatar updated!');
                }
            },
            error: function (error) {
                console.error("Avatar upload failed:", error);
                swalToast('error', 'Failed to upload avatar.');
            }
        });
    });

    /* ── Logout (Moved globally to js/app.js) ───────────────────── */

    /* ── Deactivate account ─────────────────────────────────────── */
    $('#deactivateBtn').on('click', function (e) {
        e.preventDefault();
        confirmDialog('Are you sure you want to deactivate your account? This cannot be undone.', function (result) {
            if (result) {
                $.ajax({
                    method: "DELETE",
                    url: `${apiBaseUrl}api/v1/deactivate`,
                    data: JSON.stringify({ email: userData.email }),
                    processData: false,
                    contentType: 'application/json; charset=utf-8',
                    dataType: "json",
                    success: function (data) {
                        sessionStorage.clear();
                        Swal.fire({
                            icon: 'info',
                            title: 'Account Deactivated',
                            text: 'Your account has been deactivated.',
                            showConfirmButton: false,
                            timer: 1500,
                            timerProgressBar: true
                        }).then(function () {
                            window.location.href = 'index.html';
                        });
                    },
                    error: function (error) {
                        console.error("Deactivation failed:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Deactivation Failed',
                            text: 'An error occurred while deactivating your account.'
                        });
                    }
                });
            }
        });
    });

    // ── Profile Phone Input Sanitization ─────────────────────────────────────
    $('#editPhone').on('input', function () {
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

    // ── Profile Real-Time Form Field Validation ──────────────────────────────
    function validateProfileInput(el) {
        var $el = $(el);
        var id = $el.attr('id');
        var val = $el.val();
        var isValid = false;

        if (id === 'editFirstName' || id === 'editLastName') {
            isValid = val.trim().length >= 2;
        } else if (id === 'editPhone') {
            var phoneVal = val.trim();
            isValid = phoneVal === "" || /^\+?[0-9][0-9\s\-]{6,14}$/.test(phoneVal);
        }

        if (isValid) {
            $el.removeClass('is-invalid').addClass('is-valid');
        } else {
            $el.removeClass('is-valid').addClass('is-invalid');
        }
    }

    $('#editFirstName, #editLastName, #editPhone').on('input change', function () {
        validateProfileInput(this);
    });

    // View Receipt click handler
    $(document).on('click', '.view-receipt-btn', function (e) {
        e.preventDefault();
        const rawId = $(this).data('raw-id');
        const formattedId = $(this).data('id');
        const token = getToken();
        if (!token) return;

        Swal.fire({
            title: 'Loading Receipt...',
            html: '<div class="py-3"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--gold);"></i></div>',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        $.ajax({
            method: "GET",
            url: `${apiBaseUrl}api/v1/orders/${rawId}`,
            dataType: "json",
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (res) {
                let itemsHtml = '';
                let totalMerchandise = 0;

                res.items.forEach(function (item) {
                    const lineTotal = item.price * item.quantity;
                    totalMerchandise += lineTotal;
                    itemsHtml += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 0.5rem 0; text-align: left; color: var(--text);">${item.name}</td>
                            <td style="padding: 0.5rem 0; text-align: center; color: var(--silver);">${item.quantity}</td>
                            <td style="padding: 0.5rem 0; text-align: right; color: var(--silver); font-family: var(--font-mono);">₱${Number(item.price).toFixed(2)}</td>
                            <td style="padding: 0.5rem 0; text-align: right; color: var(--text); font-family: var(--font-mono);">₱${Number(lineTotal).toFixed(2)}</td>
                        </tr>
                    `;
                });

                const totalPaid = Number(res.shipping_fee) + totalMerchandise;
                const statusColor = res.status === 'Pending' ? '#f59e0b' : res.status === 'Cancelled' ? '#ef4444' : '#10b981';
                const txRefHtml = res.transaction_ref 
                    ? `<div style="font-size: 0.8rem; color: var(--text-dim);">Transaction Ref: <span style="font-family: var(--font-mono); font-weight: bold; color: var(--silver);">${res.transaction_ref}</span></div>`
                    : '';
                
                const receiptHtml = `
                    <div style="font-family: var(--font-sans); color: var(--text); text-align: left; font-size: 0.88rem; max-height: 70vh; overflow-y: auto; padding: 0.5rem;">
                        <div style="text-align: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                            <h4 style="color: var(--gold); font-family: var(--font-display); font-weight: bold; margin-bottom: 0.25rem;">TUNIFY RECEIPT</h4>
                            <div style="font-size: 0.8rem; color: var(--text-dim);">Order ID: <span style="font-family: var(--font-mono); font-weight: bold; color: var(--silver);">${formattedId}</span></div>
                            ${txRefHtml}
                            <div style="font-size: 0.8rem; color: var(--text-dim);">Placed on: ${res.date_placed}</div>
                        </div>

                        <div style="margin-bottom: 1.25rem; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border);">
                            <div style="font-weight: bold; color: var(--gold); margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-shipping-fast mr-1"></i> Shipping Address</div>
                            <div style="font-weight: 600; color: var(--text); margin-bottom: 0.15rem;">${res.customer_name} (${res.customer_phone || 'No phone'})</div>
                            <div style="color: var(--silver);">${res.shipping_street}, ${res.shipping_city}, ${res.shipping_province}, ${res.shipping_zip}</div>
                        </div>

                        <div style="margin-bottom: 1.25rem;">
                            <div style="font-weight: bold; color: var(--gold); margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;"><i class="fas fa-shopping-bag mr-1"></i> Order Items</div>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border); font-size: 0.78rem; text-transform: uppercase; color: var(--text-dim);">
                                        <th style="padding-bottom: 0.5rem; text-align: left;">Item</th>
                                        <th style="padding-bottom: 0.5rem; text-align: center;">Qty</th>
                                        <th style="padding-bottom: 0.5rem; text-align: right;">Price</th>
                                        <th style="padding-bottom: 0.5rem; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>

                        <div style="border-top: 1px dashed var(--border); padding-top: 1rem; margin-top: 1rem; margin-bottom: 1.25rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--silver);">
                                <span>Merchandise Subtotal:</span>
                                <span style="font-family: var(--font-mono);">₱${totalMerchandise.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--silver);">
                                <span>Shipping Fee:</span>
                                <span style="font-family: var(--font-mono);">₱${Number(res.shipping_fee).toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; margin-top: 0.75rem; border-top: 1px solid var(--border); padding-top: 0.75rem; color: var(--text);">
                                <span>Total Amount Paid:</span>
                                <span style="font-family: var(--font-mono); color: var(--gold);">₱${totalPaid.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border);">
                            <div>
                                <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: bold;">Payment Method</div>
                                <div style="font-weight: bold; color: var(--text); margin-top: 0.1rem;">${res.payment_method ? res.payment_method.toUpperCase().replace('_', ' ') : 'COD'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; font-weight: bold;">Order Status</div>
                                <div style="font-weight: bold; color: ${statusColor}; margin-top: 0.1rem; text-transform: uppercase;">${res.status}</div>
                            </div>
                        </div>
                    </div>
                `;

                Swal.fire({
                    html: receiptHtml,
                    width: '600px',
                    confirmButtonText: '<i class="fas fa-times mr-1"></i> Close Receipt',
                    confirmButtonColor: 'var(--gold)',
                    background: '#121622',
                    customClass: {
                        popup: 'border-gold rounded'
                    }
                });
            },
            error: function (err) {
                console.error("Failed to load receipt details:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load',
                    text: 'Could not retrieve receipt details.'
                });
            }
        });
    });

    // Cancel Order click handler
    $(document).on('click', '.cancel-order-btn', function (e) {
        e.preventDefault();
        const rawId = $(this).data('raw-id');
        const formattedId = $(this).data('id');
        const token = getToken();
        if (!token) return;

        confirmDialog(`Are you sure you want to cancel order ${formattedId}?`, function (result) {
            if (result) {
                $.ajax({
                    method: "PUT",
                    url: `${apiBaseUrl}api/v1/orders/${rawId}/status`,
                    data: JSON.stringify({ status: 5 }), // 5 corresponds to 'Cancelled'
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + token
                    },
                    success: function (data) {
                        if (data && data.success) {
                            swalToast('success', `Order ${formattedId} has been successfully cancelled.`);
                            // Refresh orders list
                            fetchProfile();
                        }
                    },
                    error: function (error) {
                        console.error("Failed to cancel order:", error);
                        const errMsg = error.responseJSON && error.responseJSON.error 
                            ? error.responseJSON.error 
                            : "Failed to cancel order.";
                        Swal.fire({
                            icon: 'error',
                            title: 'Cancellation Failed',
                            text: errMsg
                        });
                    }
                });
            }
        });
    });

    // Auto-select tab based on URL hash
    if (window.location.hash === '#orders') {
        $('.nav-tabs a[href="#tabOrders"]').tab('show');
    }

});

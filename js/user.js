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
    $('#login').on('click', function (e) {
        e.preventDefault();
        const email = $('#email').val().trim();
        const password = $('#password').val();

        if (!emailRegex.test(email)) {
            $('#email').addClass('is-invalid');
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Enter a valid email address.' });
            return;
        }
        if (password.length < 6) {
            $('#password').addClass('is-invalid');
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Password must be at least 6 characters.' });
            return;
        }

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
                    window.location.href = isAdmin ? 'admin/dashboard.html' : 'profile.html';
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

        function setFieldState(inputId, statIconId, msgId, state, msg) {
            const $input = $('#' + inputId);
            const $icon = $('#' + statIconId);
            const $msgEl = $('#' + msgId);
            if (!$input.length || !$icon.length) return;

            $input.removeClass('is-valid is-invalid');
            $icon.removeClass('valid invalid');

            if (state === 'valid') {
                $input.addClass('is-valid');
                $icon.attr('class', 'fas fa-check field-status-icon valid').show();
                if ($msgEl.length) {
                    $msgEl.attr('class', 'field-msg success').html('<i class="fas fa-check-circle"></i> ' + msg);
                }
            } else if (state === 'invalid') {
                $input.addClass('is-invalid');
                $icon.attr('class', 'fas fa-times field-status-icon invalid').show();
                if ($msgEl.length) {
                    $msgEl.attr('class', 'field-msg error').html('<i class="fas fa-exclamation-circle"></i> ' + msg);
                }
            } else {
                $icon.hide();
                if ($msgEl.length) {
                    $msgEl.attr('class', 'field-msg hint').html(msg || '');
                }
            }
        }

        $('#fullname').on('input', function () {
            const v = $(this).val().trim();
            if (v.length === 0) setFieldState('fullname', 'nameStat', 'nameMsg', 'none', '<i class="fas fa-info-circle"></i> At least 2 characters');
            else if (v.length < 2) setFieldState('fullname', 'nameStat', 'nameMsg', 'invalid', 'Name is too short');
            else setFieldState('fullname', 'nameStat', 'nameMsg', 'valid', 'Looks good!');
        });

        $('#email').on('input', function () {
            const v = $(this).val().trim();
            const ok = emailRegex.test(v);
            if (v.length === 0) setFieldState('email', 'emailStat', 'emailMsg', 'none', '<i class="fas fa-info-circle"></i> We\'ll send a confirmation here');
            else if (!ok) setFieldState('email', 'emailStat', 'emailMsg', 'invalid', 'Enter a valid email address');
            else setFieldState('email', 'emailStat', 'emailMsg', 'valid', 'Valid email address');
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

            if (v.length === 0) {
                setFieldState('password', 'passStat', null, 'none', null);
            } else if (score < 2) {
                setFieldState('password', 'passStat', null, 'invalid', null);
            } else {
                setFieldState('password', 'passStat', null, 'valid', null);
            }

            const conf = $('#confirmPassword').val();
            if (conf.length > 0) {
                if (conf === v) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'valid', 'Passwords match!');
                else setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'invalid', 'Passwords do not match');
            }
        });

        $('#confirmPassword').on('input', function () {
            const v = $(this).val();
            const pass = $('#password').val();
            if (v.length === 0) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'none', '<i class="fas fa-info-circle"></i> Must match the password above');
            else if (v === pass) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'valid', 'Passwords match!');
            else setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'invalid', 'Passwords do not match');
        });

        function toggleTerms() {
            termsChecked = !termsChecked;
            $('#terms').prop('checked', termsChecked);
            $('#customCb').toggleClass('checked', termsChecked);
            $('#termsBox').toggleClass('checked', termsChecked);
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
            const name = $('#fullname').val().trim();
            const email = $('#email').val().trim();
            const birthdate = $('#birthdate').val().trim();

            let ok = true;
            if (name.length < 2) {
                setFieldState('fullname', 'nameStat', 'nameMsg', 'invalid', 'Please enter your full name');
                ok = false;
            }
            if (!emailRegex.test(email)) {
                setFieldState('email', 'emailStat', 'emailMsg', 'invalid', 'Enter a valid email address');
                ok = false;
            }
            if (!birthdate) {
                $('#birthdate').addClass('is-invalid');
                $('#birthdateMsg')
                    .attr('class', 'field-msg error')
                    .html('<i class="fas fa-exclamation-circle"></i> Please select your birthdate');
                ok = false;
            }

            if (!ok) {
                Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please complete all required fields' });
                return;
            }
            goToStep(2);
        });

        $('#toStep3').on('click', function () {
            const pass = $('#password').val();
            const conf = $('#confirmPassword').val();

            let ok = true;
            const score = calculatePasswordScore(pass);
            if (score < 2) {
                setFieldState('password', 'passStat', null, 'invalid', null);
                Swal.fire({ icon: 'error', title: 'Weak Password', text: 'Please use a stronger password (must meet at least 2 requirements)' });
                ok = false;
            }
            if (pass !== conf) {
                setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'invalid', 'Passwords do not match');
                if (ok) Swal.fire({ icon: 'error', title: 'Password Mismatch', text: 'Passwords do not match' });
                ok = false;
            }
            if (!termsChecked) {
                $('#termsBox').addClass('shake');
                setTimeout(() => $('#termsBox').removeClass('shake'), 400);
                if (ok) Swal.fire({ icon: 'error', title: 'Terms of Service', text: 'Please agree to the Terms & Privacy Policy' });
                ok = false;
            }
            if (!ok) return;

            const name = $('#fullname').val().trim();
            $('#reviewName').text(name);
            $('#reviewEmail').text($('#email').val().trim());
            $('#reviewBirthdate').text($('#birthdate').val() || '—');
            if (selectedAvatar) {
                $('#reviewAvatarCircle').html(`<img src="${selectedAvatar}"/>`);
            } else {
                $('#reviewAvatarCircle').html(`<span style="font-size:1.3rem;font-weight:700;color:var(--gold);">${name.charAt(0).toUpperCase()}</span>`);
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

            const name = $('#fullname').val().trim();
            const email = $('#email').val().trim();
            const password = $('#password').val();

            $.ajax({
                method: "POST",
                url: `${apiBaseUrl}api/v1/register`,
                data: JSON.stringify({ name, email, password }),
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

                                let fname = name || "";
                                let lname = "";
                                if (name && name.includes(" ")) {
                                    const parts = name.split(" ");
                                    fname = parts[0];
                                    lname = parts.slice(1).join(" ");
                                }
                                formData.append('first_name', fname);
                                formData.append('last_name', lname);

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

        // Initialize datepicker
        const dpInput = $('#birthdate');
        if (dpInput.length) {
            dpInput.datepicker({
                changeMonth: true,
                changeYear: true,
                yearRange: '-80:-13',
                maxDate: '-13y',
                dateFormat: 'yy-mm-dd',
                onSelect: function (dateText) {
                    $(this).removeClass('is-invalid').addClass('is-valid');
                    const $msgEl = $('#birthdateMsg');
                    if ($msgEl.length) {
                        $msgEl.attr('class', 'field-msg success')
                            .html('<i class="fas fa-check-circle"></i> Birthdate selected');
                    }
                }
            });
            dpInput.on('click focus', function () {
                $(this).datepicker('show');
            });
        }
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
                            return `
                                <div class="order-card">
                                  <div class="order-card-header">
                                    <span class="order-card-id">${o.id}</span>
                                    <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span>
                                  </div>
                                  <div class="order-card-date">${o.date} · ₱${o.total.toLocaleString()}</div>
                                  <div style="font-size:.78rem;color:var(--text-dim);margin-top:.35rem">${o.items.join(', ')}</div>
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
                        const deleteBtn = `<button class="btn-delete-addr delete-addr" data-id="${addr.id}"><i class="fas fa-trash-alt mr-1"></i> Delete</button>`;
                        
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
                                    <div style="font-size: .78rem; color: var(--text-dim); margin-top: 0.15rem;">
                                        Zip Code: ${addr.zip_code}
                                    </div>
                                </div>
                                <div class="address-actions">
                                    ${defaultBtn}
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
        const first_name = $('#editFirstName').val().trim();
        const last_name = $('#editLastName').val().trim();
        const phone = $('#editPhone').val().trim();

        if (!first_name) {
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'First name is required.' });
            return;
        }

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

});

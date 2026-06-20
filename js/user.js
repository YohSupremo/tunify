$(document).ready(function () {

    const apiBaseUrl = typeof url !== 'undefined' ? url : 'http://localhost:5000/';
    const userId = getUserId();

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
    $('.password-toggle').on('click', function () {
        const $input = $(this).siblings('input');
        const show = $input.attr('type') === 'password';
        $input.attr('type', show ? 'text' : 'password');
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });

    /* ── Password strength (register page only) ────────────────── */
    $('#password').on('input', function () {
        if (!$('#seg1').length) return; // Only run on registration page
        const v = $(this).val();
        let score = 0;
        if (v.length >= 8) {
            score++;
            $('#req-len').addClass('met').find('i').className = 'fas fa-check-circle';
        } else {
            $('#req-len').removeClass('met').find('i').className = 'fas fa-circle';
        }
        if (/[A-Z]/.test(v)) {
            score++;
            $('#req-upper').addClass('met').find('i').className = 'fas fa-check-circle';
        } else {
            $('#req-upper').removeClass('met').find('i').className = 'fas fa-circle';
        }
        if (/[0-9]/.test(v)) {
            score++;
            $('#req-num').addClass('met').find('i').className = 'fas fa-check-circle';
        } else {
            $('#req-num').removeClass('met').find('i').className = 'fas fa-circle';
        }
        if (/[^A-Za-z0-9]/.test(v)) {
            score++;
            $('#req-special').addClass('met').find('i').className = 'fas fa-check-circle';
        } else {
            $('#req-special').removeClass('met').find('i').className = 'fas fa-circle';
        }

        const colors = ['#F87171', '#FBBF24', '#86EFAC', '#A3E635'];
        const labels = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong'];

        for (let i = 1; i <= 4; i++) {
            const $seg = $('#seg' + i);
            $seg.removeClass('filled-1 filled-2 filled-3 filled-4');
            if (i <= score && score > 0) {
                $seg.addClass('filled-' + score);
            }
        }

        const $lbl = $('#strengthLabel');
        $lbl.text(v.length === 0 ? 'Enter a password' : labels[score] || 'Weak');
        $lbl.css('color', score >= 3 ? '#A3E635' : score >= 2 ? '#FBBF24' : '#F87171');
    });

    /* ── Login submit ───────────────────────────────────────────── */
    $('#login').on('click', function (e) {
        e.preventDefault();
        const email    = $('#email').val().trim();
        const password = $('#password').val();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
                sessionStorage.setItem('token', JSON.stringify(data.token));
                sessionStorage.setItem('userId', JSON.stringify(data.user.id));
                sessionStorage.setItem('tunify_email', data.user.email);
                
                if (data.user.name) {
                    const parts = data.user.name.split(' ');
                    sessionStorage.setItem('tunify_first_name', parts[0] || '');
                    sessionStorage.setItem('tunify_last_name', parts.slice(1).join(' ') || '');
                } else {
                    sessionStorage.setItem('tunify_first_name', '');
                    sessionStorage.setItem('tunify_last_name', '');
                }

                const isAdmin = data.user.role === 'admin' || email.includes('admin');
                if (isAdmin) sessionStorage.setItem('tunify_admin', 'true');
                else sessionStorage.removeItem('tunify_admin');

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
        const bg = document.getElementById('musicBg');
        if (bg) {
            const icons = ['♩', '♪', '♫', '♬', '𝄞', '𝄢'];
            for (let i = 0; i < 14; i++) {
                const el = document.createElement('div');
                el.className = 'music-note';
                el.textContent = icons[Math.floor(Math.random() * icons.length)];
                el.style.left = Math.random() * 100 + '%';
                el.style.animationDuration = (12 + Math.random() * 14) + 's';
                el.style.animationDelay = (Math.random() * 14) + 's';
                el.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
                bg.appendChild(el);
            }
        }

        let currentStep = 1;
        let selectedAvatar = null;
        let termsChecked = false;

        function goToStep(step, back = false) {
            const current = document.getElementById('panel' + currentStep);
            const next = document.getElementById('panel' + step);
            if (!current || !next) return;
            current.classList.remove('active');
            next.classList.toggle('slide-back', back);
            next.classList.add('active');

            for (let i = 1; i <= 3; i++) {
                const item = document.getElementById('stepItem' + i);
                const bubble = document.getElementById('stepBubble' + i);
                if (item && bubble) {
                    item.classList.remove('active', 'done');
                    if (i < step) {
                        item.classList.add('done');
                        bubble.innerHTML = '<i class="fas fa-check"></i>';
                    } else if (i === step) {
                        item.classList.add('active');
                        bubble.textContent = i;
                    } else {
                        bubble.textContent = i;
                    }
                }
            }

            const line1 = document.getElementById('stepLine1');
            const line2 = document.getElementById('stepLine2');
            if (line1) line1.style.width = step >= 2 ? '100%' : '0%';
            if (line2) line2.style.width = step >= 3 ? '100%' : '0%';

            currentStep = step;
        }

        function setFieldState(inputId, statIconId, msgId, state, msg) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(statIconId);
            const msgEl = document.getElementById(msgId);
            if (!input || !icon) return;
            input.classList.remove('is-valid', 'is-invalid');
            icon.classList.remove('valid', 'invalid');
            if (state === 'valid') {
                input.classList.add('is-valid');
                icon.classList.add('valid');
                icon.className = 'fas fa-check field-status-icon valid';
                icon.style.display = '';
                if (msgEl) { msgEl.className = 'field-msg success'; msgEl.innerHTML = '<i class="fas fa-check-circle"></i> ' + msg; }
            } else if (state === 'invalid') {
                input.classList.add('is-invalid');
                icon.className = 'fas fa-times field-status-icon invalid';
                icon.style.display = '';
                if (msgEl) { msgEl.className = 'field-msg error'; msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + msg; }
            } else {
                icon.style.display = 'none';
                if (msgEl) { msgEl.className = 'field-msg hint'; msgEl.innerHTML = msg || ''; }
            }
        }

        const nameInput = document.getElementById('fullname');
        if (nameInput) {
            nameInput.addEventListener('input', function() {
                const v = this.value.trim();
                if (v.length === 0) setFieldState('fullname', 'nameStat', 'nameMsg', 'none', '<i class="fas fa-info-circle"></i> At least 2 characters');
                else if (v.length < 2) setFieldState('fullname', 'nameStat', 'nameMsg', 'invalid', 'Name is too short');
                else setFieldState('fullname', 'nameStat', 'nameMsg', 'valid', 'Looks good!');
            });
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                const v = this.value.trim();
                const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                if (v.length === 0) setFieldState('email', 'emailStat', 'emailMsg', 'none', '<i class="fas fa-info-circle"></i> We\'ll send a confirmation here');
                else if (!ok) setFieldState('email', 'emailStat', 'emailMsg', 'invalid', 'Enter a valid email address');
                else setFieldState('email', 'emailStat', 'emailMsg', 'valid', 'Valid email address');
            });
        }

        const requirements = [
            { id: 'req-len',     test: v => v.length >= 8 },
            { id: 'req-upper',   test: v => /[A-Z]/.test(v) },
            { id: 'req-num',     test: v => /[0-9]/.test(v) },
            { id: 'req-special', test: v => /[^A-Za-z0-9]/.test(v) }
        ];
        const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = { 1: 'filled-1', 2: 'filled-2', 3: 'filled-3', 4: 'filled-4' };

        const passInput = document.getElementById('password');
        if (passInput) {
            passInput.addEventListener('input', function() {
                const v = this.value;
                let score = 0;
                requirements.forEach(req => {
                    const met = req.test(v);
                    const el = document.getElementById(req.id);
                    if (el) {
                        el.classList.toggle('met', met);
                        el.querySelector('i').className = met ? 'fas fa-check-circle' : 'fas fa-circle';
                    }
                    if (met) score++;
                });

                for (let i = 1; i <= 4; i++) {
                    const seg = document.getElementById('seg' + i);
                    if (seg) {
                        seg.className = 'strength-segment';
                        if (i <= score && score > 0) seg.classList.add(strengthColors[score]);
                    }
                }

                const lbl = document.getElementById('strengthLabel');
                if (lbl) {
                    lbl.textContent = v.length === 0 ? 'Enter a password' : strengthLabels[score] || 'Weak';
                    lbl.style.color = score >= 3 ? '#A3E635' : score >= 2 ? '#FBBF24' : '#F87171';
                }

                if (v.length === 0) {
                    setFieldState('password', 'passStat', null, 'none', null);
                } else if (score < 2) {
                    setFieldState('password', 'passStat', null, 'invalid', null);
                } else {
                    setFieldState('password', 'passStat', null, 'valid', null);
                }

                const conf = document.getElementById('confirmPassword').value;
                if (conf.length > 0) {
                    if (conf === v) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'valid', 'Passwords match!');
                    else setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'invalid', 'Passwords do not match');
                }
            });
        }

        const confirmInput = document.getElementById('confirmPassword');
        if (confirmInput) {
            confirmInput.addEventListener('input', function() {
                const v = this.value;
                const pass = document.getElementById('password').value;
                if (v.length === 0) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'none', '<i class="fas fa-info-circle"></i> Must match the password above');
                else if (v === pass) setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'valid', 'Passwords match!');
                else setFieldState('confirmPassword', 'confirmStat', 'confirmMsg', 'invalid', 'Passwords do not match');
            });
        }

        const togglePass = document.getElementById('togglePass');
        if (togglePass) {
            togglePass.addEventListener('click', function() {
                const input = document.getElementById('password');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                this.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }

        const toggleConfirm = document.getElementById('toggleConfirm');
        if (toggleConfirm) {
            toggleConfirm.addEventListener('click', function() {
                const input = document.getElementById('confirmPassword');
                if (!input) return;
                const isPass = input.type === 'password';
                input.type = isPass ? 'text' : 'password';
                this.querySelector('i').className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }

        function toggleTerms() {
            termsChecked = !termsChecked;
            document.getElementById('terms').checked = termsChecked;
            document.getElementById('customCb').classList.toggle('checked', termsChecked);
            document.getElementById('termsBox').classList.toggle('checked', termsChecked);
        }

        const picInput = document.getElementById('profilePicture');
        if (picInput) {
            picInput.addEventListener('change', function() {
                const file = this.files[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image file' }); return;
                }
                if (file.size > 2 * 1024 * 1024) {
                    Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Image must be less than 2MB' }); return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedAvatar = e.target.result;
                    document.getElementById('avatarPreviewCircle').innerHTML =
                        `<img src="${e.target.result}"/><div class="avatar-overlay"><i class="fas fa-camera"></i></div>`;
                };
                reader.readAsDataURL(file);
            });
        }

        const avatarZone = document.getElementById('avatarZone');
        if (avatarZone) {
            avatarZone.addEventListener('dragover', (e) => { e.preventDefault(); avatarZone.classList.add('drag-over'); });
            avatarZone.addEventListener('dragleave', () => avatarZone.classList.remove('drag-over'));
            avatarZone.addEventListener('drop', (e) => {
                e.preventDefault();
                avatarZone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file && picInput) {
                    picInput.files = e.dataTransfer.files;
                    picInput.dispatchEvent(new Event('change'));
                }
            });
        }

        const toStep2Btn = document.getElementById('toStep2');
        if (toStep2Btn) {
            toStep2Btn.addEventListener('click', function() {
                const name = document.getElementById('fullname').value.trim();
                const email = document.getElementById('email').value.trim();
                const birthdate = document.getElementById('birthdate').value.trim();

                let ok = true;
                if (name.length < 2) {
                    setFieldState('fullname', 'nameStat', 'nameMsg', 'invalid', 'Please enter your full name');
                    ok = false;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setFieldState('email', 'emailStat', 'emailMsg', 'invalid', 'Enter a valid email address');
                    ok = false;
                }
                if (!birthdate) {
                    document.getElementById('birthdate').classList.add('is-invalid');
                    document.getElementById('birthdateMsg').className = 'field-msg error';
                    document.getElementById('birthdateMsg').innerHTML = '<i class="fas fa-exclamation-circle"></i> Please select your birthdate';
                    ok = false;
                }

                if (!ok) {
                    Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Please complete all required fields' });
                    return;
                }
                goToStep(2);
            });
        }

        const toStep3Btn = document.getElementById('toStep3');
        if (toStep3Btn) {
            toStep3Btn.addEventListener('click', function() {
                const pass = document.getElementById('password').value;
                const conf = document.getElementById('confirmPassword').value;

                let ok = true;
                const score = requirements.filter(r => r.test(pass)).length;
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
                    document.getElementById('termsBox').classList.add('shake');
                    setTimeout(() => document.getElementById('termsBox').classList.remove('shake'), 400);
                    if (ok) Swal.fire({ icon: 'error', title: 'Terms of Service', text: 'Please agree to the Terms & Privacy Policy' });
                    ok = false;
                }
                if (!ok) return;

                const name = document.getElementById('fullname').value.trim();
                document.getElementById('reviewName').textContent = name;
                document.getElementById('reviewEmail').textContent = document.getElementById('email').value.trim();
                document.getElementById('reviewBirthdate').textContent = document.getElementById('birthdate').value || '—';
                if (selectedAvatar) {
                    document.getElementById('reviewAvatarCircle').innerHTML = `<img src="${selectedAvatar}"/>`;
                } else {
                    document.getElementById('reviewAvatarCircle').innerHTML = `<span style="font-size:1.3rem;font-weight:700;color:var(--gold);">${name.charAt(0).toUpperCase()}</span>`;
                }

                goToStep(3);
            });
        }

        const back1 = document.getElementById('toStep1');
        if (back1) back1.addEventListener('click', () => goToStep(1, true));

        const back2 = document.getElementById('toStep2b');
        if (back2) back2.addEventListener('click', () => goToStep(2, true));

        const form = document.getElementById('authForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const btn = document.getElementById('submitBtn');
                if (!btn) return;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your account…';

                const name = document.getElementById('fullname').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;

                $.ajax({
                    method: "POST",
                    url: `${apiBaseUrl}api/v1/register`,
                    data: JSON.stringify({ name, email, password }),
                    processData: false,
                    contentType: 'application/json; charset=utf-8',
                    dataType: "json",
                    success: function(regData) {
                        $.ajax({
                            method: "POST",
                            url: `${apiBaseUrl}api/v1/login`,
                            data: JSON.stringify({ email, password }),
                            processData: false,
                            contentType: 'application/json; charset=utf-8',
                            dataType: "json",
                            success: function(loginData) {
                                sessionStorage.setItem('token', JSON.stringify(loginData.token));
                                sessionStorage.setItem('userId', JSON.stringify(loginData.user.id));
                                sessionStorage.setItem('tunify_email', loginData.user.email);
                                
                                if (loginData.user.name) {
                                    const parts = loginData.user.name.split(' ');
                                    sessionStorage.setItem('tunify_first_name', parts[0] || '');
                                    sessionStorage.setItem('tunify_last_name', parts.slice(1).join(' ') || '');
                                } else {
                                    sessionStorage.setItem('tunify_first_name', '');
                                    sessionStorage.setItem('tunify_last_name', '');
                                }

                                const fileInput = document.getElementById('profilePicture');
                                const avatarFile = fileInput ? fileInput.files[0] : null;
                                
                                const proceedToSuccess = () => {
                                    const authFormEl = document.getElementById('authForm');
                                    const stepProgressEl = document.getElementById('stepProgress');
                                    const headerEl = document.querySelector('.register-header');
                                    const benefitsEl = document.querySelector('.register-benefits');
                                    const footerLinkEl = document.getElementById('footerLink');
                                    const successPanelEl = document.getElementById('successPanel');

                                    if (authFormEl) authFormEl.style.display = 'none';
                                    if (stepProgressEl) stepProgressEl.style.display = 'none';
                                    if (headerEl) headerEl.style.display = 'none';
                                    if (benefitsEl) benefitsEl.style.display = 'none';
                                    if (footerLinkEl) footerLinkEl.style.display = 'none';
                                    if (successPanelEl) successPanelEl.style.display = 'block';

                                    setTimeout(() => {
                                        const redirectBarEl = document.getElementById('redirectBar');
                                        if (redirectBarEl) redirectBarEl.style.width = '100%';
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
                                        success: function(profileData) {
                                            if (profileData && profileData.customer && profileData.customer.profile_image_path) {
                                                sessionStorage.setItem('tunify_avatar', 'http://localhost:5000/' + profileData.customer.profile_image_path);
                                            }
                                            proceedToSuccess();
                                        },
                                        error: function(uploadErr) {
                                            console.error("Avatar upload failed:", uploadErr);
                                            proceedToSuccess();
                                        }
                                    });
                                } else {
                                    proceedToSuccess();
                                }
                            },
                            error: function(loginErr) {
                                console.error(loginErr);
                                btn.disabled = false;
                                btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                                Swal.fire({ icon: 'error', title: 'Auto-Login Failed', text: 'Account created, but we could not log you in automatically. Please sign in.' });
                                setTimeout(() => window.location.href = 'login.html', 2000);
                            }
                        });
                    },
                    error: function(regErr) {
                        console.error(regErr);
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                        const errMsg = regErr.responseJSON && regErr.responseJSON.error ? regErr.responseJSON.error : 'Registration failed.';
                        Swal.fire({ icon: 'error', title: 'Registration Failed', text: errMsg });
                    }
                });
            });
        }

        // Initialize datepicker
        const dpInput = $('#birthdate');
        if (dpInput.length) {
            dpInput.datepicker({
                changeMonth: true,
                changeYear: true,
                yearRange: '-80:-13',
                maxDate: '-13y',
                dateFormat: 'yy-mm-dd',
                onSelect: function(dateText) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    const msgEl = document.getElementById('birthdateMsg');
                    if (msgEl) {
                        msgEl.className = 'field-msg success';
                        msgEl.innerHTML = '<i class="fas fa-check-circle"></i> Birthdate selected';
                    }
                }
            });
            dpInput.on('click focus', function() {
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
        $('#editAddressLine').val(userData.address_line);
        $('#editZipCode').val(userData.zip_code);

        const $avatar = $('#profileAvatar');
        if (userData.avatar) {
            $avatar.html(`<img src="${userData.avatar}" style="width:100%;height:100%;object-fit:cover;"/>`);
        } else {
            $avatar.html('<i class="fas fa-user"></i>');
        }

        // Render orders from the database
        if ($('#orderList').length) {
            const token = sessionStorage.getItem('token');
            if (token) {
                $.ajax({
                    method: "GET",
                    url: `${apiBaseUrl}api/v1/orders`,
                    dataType: "json",
                    headers: {
                        "Authorization": "Bearer " + JSON.parse(token)
                    },
                    success: function (dbOrders) {
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
    }

    /* ── Save profile ───────────────────────────────────────────── */
    $('#saveProfile, #updateBtn').on('click', function (e) {
        e.preventDefault();
        const first_name = $('#editFirstName').val().trim();
        const last_name = $('#editLastName').val().trim();
        const phone = $('#editPhone').val().trim();
        const address_line = $('#editAddressLine').val().trim();
        const zip_code = $('#editZipCode').val().trim();

        if (!first_name) {
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'First name is required.' });
            return;
        }

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('first_name', first_name);
        formData.append('last_name', last_name);
        formData.append('phone', phone);
        formData.append('address_line', address_line);
        formData.append('zip_code', zip_code);

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
                    userData.address_line = address_line;
                    userData.zip_code = zip_code;

                    sessionStorage.setItem('tunify_first_name', first_name);
                    sessionStorage.setItem('tunify_last_name', last_name);
                    sessionStorage.setItem('tunify_phone', phone);
                    sessionStorage.setItem('tunify_address_line', address_line);
                    sessionStorage.setItem('tunify_zip_code', zip_code);

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
    $(document).on('click', '#profileAvatar', function () {
        $('#editProfilePicture').click();
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

    /* ── Logout ─────────────────────────────────────────────────── */
    $('#logoutBtn, #logout, #logout-link').on('click', function (e) {
        e.preventDefault();
        confirmDialog('Are you sure you want to log out?', function (result) {
            if (result) {
                sessionStorage.clear();
                Swal.fire({
                    text: 'Logged out',
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1000,
                    timerProgressBar: true
                }).then(function () {
                    window.location.href = 'login.html';
                });
            }
        });
    });

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

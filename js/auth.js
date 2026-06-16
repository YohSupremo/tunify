$(document).ready(function () {

    // Redirect if already logged in
    if (sessionStorage.getItem('token')) {
        window.location.href = 'profile.html';
        return;
    }

    loadNav();

    /* ── Password show/hide ────────────────────────────────────── */
    $('.password-toggle').on('click', function () {
        const $input = $(this).siblings('input');
        const show = $input.attr('type') === 'password';
        $input.attr('type', show ? 'text' : 'password');
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });

    /* ── Password strength (register page only) ────────────────── */
    $('#password').on('input', function () {
        if (!$('#strengthFill').length) return;
        const v = $(this).val();
        let score = 0;
        if (v.length >= 6) score++;
        if (/[A-Z]/.test(v)) score++;
        if (/[0-9]/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;
        const colors = ['#F87171', '#FBBF24', '#A3E635', '#A3E635'];
        $('#strengthFill').css({ width: (score * 25) + '%', background: colors[Math.max(0, score - 1)] });
    });

    /* ── Avatar preview (register) ─────────────────────────────── */
    $('#avatar').on('change', function () {
        const file = this.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image.' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'File Too Large', text: 'Image must be less than 2MB.' });
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            $('#avatarPreview').attr('src', e.target.result);
        };
        reader.readAsDataURL(file);
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

        // Simulate login (replace with $.ajax to real API)
        setTimeout(function () {
            const isAdmin = email.includes('admin');

            sessionStorage.setItem('token', JSON.stringify('demo-token-' + Date.now()));
            sessionStorage.setItem('userId', JSON.stringify(1));

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
        }, 800);
    });

    /* ── Register submit ────────────────────────────────────────── */
    $('#register').on('click', function (e) {
        e.preventDefault();
        const email    = $('#email').val().trim();
        const password = $('#password').val();
        const name     = $('#fullname').val().trim();

        if (!name) {
            Swal.fire({ icon: 'error', title: 'Validation Failed', text: 'Full name is required.' });
            return;
        }
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

        Swal.fire({
            icon: 'success',
            title: 'Account Created!',
            text: 'You can now log in.',
            showConfirmButton: false,
            timer: 1800,
            timerProgressBar: true,
            position: 'bottom-right'
        }).then(function () {
            window.location.href = 'login.html';
        });
    });

    /* ── Logout (on profile link in nav) ────────────────────────── */
    $(document).on('click', '#logout', function (e) {
        e.preventDefault();
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('tunify_admin');
        Swal.fire({
            text: 'Logged out',
            showConfirmButton: false,
            position: 'bottom-right',
            timer: 1000,
            timerProgressBar: true
        });
        setTimeout(function () { window.location.href = 'login.html'; }, 1000);
    });

});

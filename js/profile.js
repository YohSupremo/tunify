$(document).ready(function () {

    // Redirect to login if not authenticated
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

    document.body.dataset.page = 'profile';
    loadNav();
    loadFooter();

    /* ── Load user from session ─────────────────────────────────── */
    const userId = getUserId();
    let userData = {
        name: sessionStorage.getItem('tunify_name') || 'Guest User',
        email: sessionStorage.getItem('tunify_email') || '',
        phone: sessionStorage.getItem('tunify_phone') || '',
        avatar: sessionStorage.getItem('tunify_avatar') || null
    };

    function render() {
        $('#profileName').text(userData.name);
        $('#profileEmail').text(userData.email);
        $('#editName').val(userData.name);
        $('#editEmail').val(userData.email);
        $('#editPhone').val(userData.phone);

        const $avatar = $('#profileAvatar');
        if (userData.avatar) {
            $avatar.html(`<img src="${userData.avatar}" style="width:100%;height:100%;object-fit:cover;"/>`);
        } else {
            $avatar.html('<i class="fas fa-user"></i>');
        }

        // Render orders from TunifyOrders (data.js)
        if ($('#orderList').length) {
            $('#orderList').html(TunifyOrders.map(function (o) {
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
        }
    }

    render();

    /* ── Save profile ───────────────────────────────────────────── */
    $('#saveProfile').on('click', function () {
        userData.name = $('#editName').val().trim();
        userData.email = $('#editEmail').val().trim();
        userData.phone = $('#editPhone').val().trim();

        sessionStorage.setItem('tunify_name', userData.name);
        sessionStorage.setItem('tunify_email', userData.email);
        sessionStorage.setItem('tunify_phone', userData.phone);

        render();

        Swal.fire({
            icon: 'success',
            title: 'Profile Saved',
            text: 'Your changes have been saved.',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            position: 'bottom-right'
        });
    });

    /* ── Update profile via form (profile.html form) ─────────────── */
    $('#updateBtn').on('click', function (e) {
        e.preventDefault();
        userData.name = $('#editName').val().trim() || $('#firstName').val().trim() + ' ' + $('#lastName').val().trim();
        userData.phone = $('#editPhone').val().trim() || $('#phone').val().trim();

        sessionStorage.setItem('tunify_name', userData.name);
        sessionStorage.setItem('tunify_phone', userData.phone);

        Swal.fire({
            icon: 'success',
            title: 'Profile Updated',
            text: 'Your profile has been updated.',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            position: 'bottom-right'
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
        const reader = new FileReader();
        reader.onload = function (evt) {
            userData.avatar = evt.target.result;
            sessionStorage.setItem('tunify_avatar', userData.avatar);
            render();
            swalToast('success', 'Avatar updated!');
        };
        reader.readAsDataURL(file);
    });

    /* ── Logout ─────────────────────────────────────────────────── */
    $('#logoutBtn, #logout').on('click', function (e) {
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
                sessionStorage.clear();
                Swal.fire({
                    icon: 'info',
                    text: 'Account deactivated.',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                }).then(function () {
                    window.location.href = 'index.html';
                });
            }
        });
    });

});

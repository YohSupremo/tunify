$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        Swal.fire({
            icon: 'error',
            title: 'Admin Only',
            text: 'Unauthorized access',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            position: 'center'
        }).then(function () {
            window.location.href = '../profile.html';
        });

        return;
    }
    document.body.dataset.page = 'admin-dash';
    loadNav();
    loadFooter();

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

    // ── Stats ────────────────────────────────────────────────────
    $.ajax({
        method: "GET",
        url: `${url}dashboard-stats`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            $('#statRevenue').text('₱' + Math.round(data.revenue).toLocaleString());
            $('#statOrders').text(data.orders);
            $('#statCustomers').text(data.customers);
            $('#statLowStock').text(data.lowStock);
        },
        error: function (err) {
            console.error("Failed to load dashboard stats:", err);
        }
    });

    // ── Monthly Sales Chart (Line) ──────────────────────────────
    $.ajax({
        method: "GET",
        url: `${url}sales-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            const { rows } = data;
            const ctx1 = document.getElementById('monthlySalesChart');
            if (ctx1) {
                new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: rows.map(r => r.month),
                        datasets: [{
                            label: 'Revenue (₱)',
                            data: rows.map(r => parseFloat(r.total)),
                            borderColor: '#FB7185', backgroundColor: 'rgba(251,113,133,0.1)',
                            borderWidth: 3, pointBackgroundColor: '#FBBF24', tension: 0.4, fill: true
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8', callback: v => '₱' + (v / 1000) + 'k' } }
                        }
                    }
                });
            }
        },
        error: function (err) {
            console.error("Sales chart load error:", err);
        }
    });

    // ── Items by Category (Doughnut) ─────────────────────────────
    $.ajax({
        method: "GET",
        url: `${url}items-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            const { rows } = data;
            const ctx2 = document.getElementById('itemsSoldChart');
            if (ctx2) {
                new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: rows.map(r => r.items),
                        datasets: [{
                            data: rows.map(r => parseInt(r.total)),
                            backgroundColor: ['#FBBF24', '#FB7185', '#38BDF8', '#A78BFA', '#64748B', '#F43F5E', '#10B981'],
                            borderColor: '#0F172A', borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'right', labels: { color: '#E2E8F0', font: { size: 11 } } } }
                    }
                });
            }
        },
        error: function (err) {
            console.error("Items chart load error:", err);
        }
    });

    // ── Address Distribution (Horizontal Bar) ─────────────────────
    $.ajax({
        method: "GET",
        url: `${url}address-chart`,
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + getToken()
        },
        success: function (data) {
            const { rows } = data;
            const ctx3 = document.getElementById('addressDistributionChart');
            if (ctx3) {
                new Chart(ctx3, {
                    type: 'bar',
                    data: {
                        labels: rows.map(r => r.addressline || 'Unknown'),
                        datasets: [{
                            label: 'Customers',
                            data: rows.map(r => parseInt(r.total)),
                            backgroundColor: 'rgba(245,158,11,0.75)', borderColor: '#FBBF24',
                            borderWidth: 1, borderRadius: 4, barThickness: 16
                        }]
                    },
                    options: {
                        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
                            y: { grid: { display: false }, ticks: { color: '#E2E8F0' } }
                        }
                    }
                });
            }
        },
        error: function (err) {
            console.error("Address chart load error:", err);
        }
    });

})

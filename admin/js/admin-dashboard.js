$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-dash';
    loadNav();
    loadFooter();

    const url = 'http://localhost:4000/'

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

    const getProducts = () => {
        const s = localStorage.getItem('tunify_products')
        return s ? JSON.parse(s) : TunifyProducts.slice()
    }

    const saveProducts = (list) => {
        localStorage.setItem('tunify_products', JSON.stringify(list))
    }

    const getOrders = () => {
        const s = localStorage.getItem('tunify_orders')
        return s ? JSON.parse(s) : TunifyOrders.slice()
    }

    // ── Stats ────────────────────────────────────────────────────
    const orders = getOrders()
    const products = getProducts()

    $('#statRevenue').text('₱' + (orders.reduce((sum, o) => sum + (o.total || 0), 0) + 2847500).toLocaleString())
    $('#statOrders').text(orders.length + 183)
    $('#statCustomers').text(1240)
    $('#statLowStock').text(products.filter(p => p.stock <= 5).length)

    // ── Monthly Sales Chart ──────────────────────────────────────
    const ctx1 = document.getElementById('monthlySalesChart')
    if (ctx1) {
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue (₱)',
                    data: [185000, 240000, 310000, 280000, 420000, 485000, 520000],
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
        })
    }

    // ── Items by Category (Doughnut) ─────────────────────────────
    const ctx2 = document.getElementById('itemsSoldChart')
    if (ctx2) {
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['String', 'Percussion', 'Keys', 'Accessories', 'Other'],
                datasets: [{
                    data: [32, 22, 24, 15, 7],
                    backgroundColor: ['#FBBF24', '#FB7185', '#38BDF8', '#A78BFA', '#64748B'],
                    borderColor: '#0F172A', borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#E2E8F0', font: { size: 11 } } } }
            }
        })
    }

    // ── Address Distribution (Horizontal Bar) ─────────────────────
    const ctx3 = document.getElementById('addressDistributionChart')
    if (ctx3) {
        new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: ['Metro Manila', 'Cebu City', 'Davao City', 'Cavite', 'Pampanga', 'Iloilo', 'Baguio'],
                datasets: [{
                    label: 'Customers', data: [480, 240, 180, 130, 110, 60, 40],
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
        })
    }

})

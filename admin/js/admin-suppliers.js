$(document).ready(function () {
    const adminUser = sessionStorage.getItem('tunify_admin');
    if (!adminUser) {
        window.location.href = '../login.html';
        return;
    }
    document.body.dataset.page = 'admin-suppliers';
    loadNav();
    loadFooter();

    /* ── Data helpers ───────────────────────────────────────────── */
    var SUPPLIERS_KEY = 'tunify_suppliers';

    var defaultSuppliers = [
        { id: 1, name: 'Fender Asia Pacific', contact_name: 'Juan dela Cruz', email: 'fender@example.com', phone: '+63 912 000 0001', address_line: 'Makati City, Metro Manila' },
        { id: 2, name: 'Yamaha Music PH', contact_name: 'Maria Santos', email: 'yamaha@example.com', phone: '+63 912 000 0002', address_line: 'BGC, Taguig City' },
        { id: 3, name: 'Roland Philippines', contact_name: 'Pedro Reyes', email: 'roland@example.com', phone: '+63 912 000 0003', address_line: 'Mandaluyong City' },
        { id: 4, name: 'Meinl Percussion GmbH', contact_name: 'Klaus Müller', email: 'meinl@example.com', phone: '+49 123 456 789', address_line: 'Gutenstetten, Germany' }
    ];

    function getSuppliers() {
        var s = localStorage.getItem(SUPPLIERS_KEY);
        return s ? JSON.parse(s) : defaultSuppliers.slice();
    }

    function saveSuppliers(list) {
        localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list));
    }

    function getProducts() {
        var s = localStorage.getItem('tunify_products');
        return s ? JSON.parse(s) : TunifyProducts.slice();
    }

    /* ── DataTable init ─────────────────────────────────────────── */
    var table = initTable();

    function initTable() {
        if ($.fn.DataTable.isDataTable('#suppliersTable')) {
            $('#suppliersTable').DataTable().destroy();
        }

        var data = getSuppliers().map(function (s) {
            var count = getProducts().filter(function (p) {
                return p.supplier_id == s.id;
            }).length;
            return [
                s.name,
                s.contact_name || '—',
                s.email || '—',
                s.phone || '—',
                s.address_line || '—',
                count + ' item(s)',
                '<button class="btn btn-sm btn-outline-info edit-btn mr-1" data-id="' + s.id + '" title="Edit"><i class="fas fa-edit"></i></button>' +
                '<button class="btn btn-sm btn-outline-danger delete-btn" data-id="' + s.id + '" title="Delete"><i class="fas fa-trash"></i></button>'
            ];
        });

        return $('#suppliersTable').DataTable({
            data: data,
            pageLength: 10,
            order: [[0, 'asc']],
            language: { searchPlaceholder: 'Search suppliers…', search: '' }
        });
    }

    /* ── Add button ─────────────────────────────────────────────── */
    $('#btnAddNewSupplier').on('click', function () {
        $('#supplierForm')[0].reset();
        $('#supplierId').val('');
        $('#modalTitle').text('Add Supplier');
        $('#supplierForm').removeClass('was-validated');
        $('#supplierModal').modal('show');
    });

    /* ── Edit button (delegated) ────────────────────────────────── */
    $('#suppliersTable').on('click', '.edit-btn', function () {
        var id = parseInt($(this).data('id'));
        var s = getSuppliers().find(function (x) { return x.id === id; });
        if (!s) return;

        $('#supplierId').val(s.id);
        $('#supplierName').val(s.name);
        $('#supplierContact').val(s.contact_name);
        $('#supplierEmail').val(s.email);
        $('#supplierPhone').val(s.phone);
        $('#supplierAddress').val(s.address_line);

        $('#modalTitle').text('Edit Supplier');
        $('#supplierForm').removeClass('was-validated');
        $('#supplierModal').modal('show');
    });

    /* ── Delete button (delegated) — FK check ───────────────────── */
    $('#suppliersTable').on('click', '.delete-btn', function () {
        var id = parseInt($(this).data('id'));
        var s = getSuppliers().find(function (x) { return x.id === id; });
        if (!s) return;

        var count = getProducts().filter(function (p) {
            return p.supplier_id == id;
        }).length;

        if (count > 0) {
            bootbox.alert({
                title: "<span class='text-danger'><i class='fas fa-exclamation-circle'></i> Constraint Violation</span>",
                message: 'Cannot delete <strong>"' + s.name + '"</strong> — it has <strong>' + count + ' linked item(s)</strong>.'
            });
            return;
        }

        bootbox.confirm({
            title: 'Delete Supplier?',
            message: 'Are you sure you want to permanently delete <strong>"' + s.name + '"</strong>?',
            buttons: {
                cancel: { label: '<i class="fa fa-times"></i> Cancel', className: 'btn-outline-secondary' },
                confirm: { label: '<i class="fa fa-trash"></i> Delete', className: 'btn-gold' }
            },
            callback: function (result) {
                if (result) {
                    saveSuppliers(getSuppliers().filter(function (x) { return x.id !== id; }));
                    swalToast('success', 'Supplier "' + s.name + '" deleted');
                    table = initTable();
                }
            }
        });
    });

    /* ── Form submit (Add / Edit) ───────────────────────────────── */
    $('#supplierForm').on('submit', function (e) {
        e.preventDefault();
        if (!this.checkValidity()) {
            $(this).addClass('was-validated');
            return;
        }

        var idVal = $('#supplierId').val();
        var name = $('#supplierName').val().trim();
        var contact = $('#supplierContact').val().trim();
        var email = $('#supplierEmail').val().trim();
        var phone = $('#supplierPhone').val().trim();
        var address = $('#supplierAddress').val().trim();
        var list = getSuppliers();

        var isDuplicate = list.some(function (x) {
            return x.name.toLowerCase() === name.toLowerCase() && x.id != idVal;
        });
        if (isDuplicate) {
            swalToast('warning', 'A supplier with this name already exists!');
            $('#supplierName').addClass('is-invalid');
            return;
        }
        $('#supplierName').removeClass('is-invalid');

        if (idVal) {
            var idx = list.findIndex(function (x) { return x.id == idVal; });
            if (idx !== -1) {
                list[idx] = { id: parseInt(idVal), name: name, contact_name: contact, email: email, phone: phone, address_line: address };
                swalToast('success', 'Supplier updated!');
            }
        } else {
            var newId = list.length ? Math.max.apply(null, list.map(function (x) { return x.id; })) + 1 : 1;
            list.push({ id: newId, name: name, contact_name: contact, email: email, phone: phone, address_line: address });
            swalToast('success', 'Supplier added!');
        }

        saveSuppliers(list);
        $('#supplierModal').modal('hide');
        table = initTable();
    });

});

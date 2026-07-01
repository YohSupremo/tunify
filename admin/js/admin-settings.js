$(document).ready(function () {
  const baseUrl = typeof url !== "undefined" ? url : "http://localhost:5000/";

  // 1. Redirection verification: ensure user is admin
  const token = sessionStorage.getItem("token");
  const isAdmin = sessionStorage.getItem("tunify_admin") === "true";
  if (!token || !isAdmin) {
    window.location.href = "../login.html";
    return;
  }
  document.body.dataset.page = "admin-settings";
  loadNav();
  loadFooter();
  // Helper to fetch authorization header safely
  const getAuthToken = () => {
    if (!token) return "";
    try {
      return JSON.parse(token);
    } catch (e) {
      return token;
    }
  };

  // 2. Load settings from database
  const loadSettings = () => {
    $.ajax({
      method: "GET",
      url: `${baseUrl}api/v1/settings`,
      dataType: "json",
      headers: {
        "Authorization": "Bearer " + getAuthToken()
      },
      success: function (data) {
        if (data) {
          $("#storeName").val(data.store_name || "");
          $("#storeEmail").val(data.store_contact_email || "");
          $("#storePhone").val(data.store_contact_phone || "");
          $("#shippingFee").val(data.default_shipping_fee || "");
          $("#taxRate").val(data.tax_rate || "");
          $("#stockThreshold").val(data.low_stock_threshold || "");
        }
      },
      error: function (xhr) {
        let msg = "Failed to load store settings";
        if (xhr.responseJSON && xhr.responseJSON.error) {
          msg = xhr.responseJSON.error;
        }
        Swal.fire({
          icon: "error",
          title: "Error",
          text: msg,
          background: "#0a0f1e",
          color: "#e2e8f0"
        });
      }
    });
  };



  // 3. Form Validation and Submit
  $("#settingsForm").validate({
    rules: {
      store_name: { required: true, minlength: 2 },
      store_contact_email: { required: true, email: true },
      store_contact_phone: { required: true },
      default_shipping_fee: { required: true, number: true, min: 0 },
      tax_rate: { required: true, number: true, min: 0, max: 1 },
      low_stock_threshold: { required: true, digits: true, min: 0 }
    },
    messages: {
      store_name: "Please enter a valid store name (min 2 characters)",
      store_contact_email: "Please enter a valid store email address",
      store_contact_phone: "Please enter store contact phone",
      default_shipping_fee: "Enter a positive shipping fee",
      tax_rate: "Enter a decimal tax rate between 0 and 1 (e.g., 0.1200)",
      low_stock_threshold: "Enter a valid non-negative integer threshold"
    },
    errorElement: "div",
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback");
      if (element.parent(".input-group").length) {
        error.insertAfter(element.parent());
      } else {
        error.insertAfter(element);
      }
    },
    highlight: function (element) {
      $(element).addClass("is-invalid").removeClass("is-valid");
    },
    unhighlight: function (element) {
      $(element).addClass("is-valid").removeClass("is-invalid");
    },
    submitHandler: function (form) {
      const payload = {
        store_name: $("#storeName").val().trim(),
        store_contact_email: $("#storeEmail").val().trim(),
        store_contact_phone: $("#storePhone").val().trim(),
        default_shipping_fee: parseFloat($("#shippingFee").val()),
        tax_rate: parseFloat($("#taxRate").val()),
        low_stock_threshold: parseInt($("#stockThreshold").val(), 10)
      };

      const btnSave = $("#btnSaveSettings");
      const originalText = btnSave.html();
      btnSave.html('<i class="fas fa-spinner fa-spin mr-1"></i> Saving...').prop("disabled", true);

      $.ajax({
        method: "PUT",
        url: `${baseUrl}api/v1/settings`,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(payload),
        dataType: "json",
        headers: {
          "Authorization": "Bearer " + getAuthToken()
        },
        success: function () {
          Swal.fire({
            icon: "success",
            title: "Settings Saved",
            text: "Global store configurations updated successfully.",
            timer: 1500,
            showConfirmButton: false,
            background: "#0a0f1e",
            color: "#e2e8f0"
          });
          loadSettings();
        },
        error: function (xhr) {
          let errorMsg = "Could not update settings. Check inputs and permissions.";
          if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMsg = xhr.responseJSON.error;
          }
          Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: errorMsg,
            background: "#0a0f1e",
            color: "#e2e8f0"
          });
        },
        complete: function () {
          btnSave.html(originalText).prop("disabled", false);
        }
      });
    }
  });

  // Initial load
  loadSettings();
});

(() => {
  const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const state = {
    customer: null,
    cart: new Map(),
    products: [],
    activeCategory: "",
    customerHighlight: -1,
    customerResults: [],
  };

  const els = {
    productSearch: document.getElementById("product-search"),
    productGrid: document.getElementById("product-grid"),
    productLoading: document.getElementById("product-loading"),
    categoryChips: document.getElementById("category-chips"),
    customerSearch: document.getElementById("customer-search"),
    customerDropdown: document.getElementById("customer-dropdown"),
    customerSelected: document.getElementById("customer-selected"),
    customerSelectedName: document.getElementById("customer-selected-name"),
    customerSelectedMeta: document.getElementById("customer-selected-meta"),
    clearCustomerBtn: document.getElementById("clear-customer"),
    recentCustomers: document.getElementById("recent-customers"),
    cartItems: document.getElementById("cart-items"),
    cartEmpty: document.getElementById("cart-empty"),
    cartTotal: document.getElementById("cart-total"),
    completeBtn: document.getElementById("complete-sale"),
    saleForm: document.getElementById("sale-form"),
    customerIdField: document.getElementById("customer-id-field"),
    formFields: document.getElementById("sale-form-fields"),
    quickAddModal: document.getElementById("quickAddCustomerModal"),
    quickAddForm: document.getElementById("quick-add-form"),
    quickAddError: document.getElementById("quick-add-error"),
    quickAddName: document.getElementById("quick-add-name"),
    quickAddPhone: document.getElementById("quick-add-phone"),
  };

  const renderProducts = () => {
    if (!els.productGrid) return;

    if (state.products.length === 0) {
      els.productGrid.innerHTML = `
        <div class="pos-empty col-12">
          <i class="bi bi-search"></i>
          <p class="mb-0">No products found. Try a different search or category.</p>
        </div>`;
      return;
    }

    els.productGrid.innerHTML = state.products
      .map(
        (product) => `
        <button type="button" class="pos-product-card" data-product-id="${product.id}" aria-label="Add ${product.name}">
          <div class="pos-product-name">${escapeHtml(product.name)}</div>
          <div class="pos-product-meta">${escapeHtml(product.sku)}${product.category_name ? ` · ${escapeHtml(product.category_name)}` : ""}</div>
          <div class="pos-product-price">UGX ${formatCurrency(product.unit_price)}</div>
          <div class="pos-product-stock${product.quantity <= 5 ? " low" : ""}">${product.quantity} in stock</div>
        </button>`
      )
      .join("");

    els.productGrid.querySelectorAll(".pos-product-card").forEach((card) => {
      card.addEventListener("click", () => {
        const product = state.products.find((p) => String(p.id) === card.dataset.productId);
        if (product) addToCart(product);
      });
    });
  };

  const escapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  };

  const fetchProducts = async () => {
    if (!els.productLoading || !els.productGrid) return;

    els.productLoading.style.display = "block";
    els.productGrid.style.display = "none";

    const params = new URLSearchParams();
    const query = els.productSearch?.value.trim() || "";
    if (query) params.set("q", query);
    if (state.activeCategory) params.set("category", state.activeCategory);

    try {
      const response = await fetch(`/api/products/search?${params}`);
      const data = await response.json();
      state.products = data.products || [];
      renderProducts();
    } catch {
      state.products = [];
      renderProducts();
    } finally {
      els.productLoading.style.display = "none";
      els.productGrid.style.display = "grid";
    }
  };

  const debouncedFetchProducts = debounce(fetchProducts, 250);

  const addToCart = (product) => {
    const existing = state.cart.get(product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= product.quantity) {
      flashMessage("Not enough stock for this product.", "warning");
      return;
    }

    state.cart.set(product.id, {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit_price: Number(product.unit_price),
      stock: product.quantity,
      quantity: currentQty + 1,
    });

    renderCart();
    flashMessage(`Added ${product.name}`, "success", 1200);
  };

  const setCartQty = (productId, qty) => {
    const item = state.cart.get(productId);
    if (!item) return;

    const newQty = Math.floor(Number(qty));

    if (!Number.isFinite(newQty) || newQty <= 0) {
      flashMessage("Quantity must be at least 1.", "warning");
      renderCart();
      return;
    }

    if (newQty > item.stock) {
      flashMessage(`Only ${item.stock} in stock for ${item.name}.`, "warning");
      item.quantity = item.stock;
      renderCart();
      return;
    }

    item.quantity = newQty;
    renderCart();
  };

  const updateCartQty = (productId, delta) => {
    const item = state.cart.get(productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartQty(productId, newQty);
  };

  const updateCartTotalPreview = () => {
    let total = 0;
    els.cartItems.querySelectorAll(".pos-cart-item").forEach((row) => {
      const id = Number(row.dataset.productId);
      const item = state.cart.get(id);
      if (!item) return;
      const qty = Number(row.querySelector(".pos-qty-input")?.value) || 0;
      total += item.unit_price * qty;
    });
    els.cartTotal.textContent = formatCurrency(total);
  };

  const removeFromCart = (productId) => {
    state.cart.delete(productId);
    renderCart();
  };

  const renderCart = () => {
    const items = [...state.cart.values()];

    if (items.length === 0) {
      els.cartEmpty.style.display = "block";
      els.cartItems.innerHTML = "";
      els.cartTotal.textContent = "0.00";
      els.completeBtn.disabled = true;
      syncFormFields();
      return;
    }

    els.cartEmpty.style.display = "none";
    els.cartItems.innerHTML = items
      .map(
        (item) => `
        <div class="pos-cart-item" data-product-id="${item.id}">
          <div class="pos-cart-item-name">${escapeHtml(item.name)}</div>
          <div class="pos-cart-item-sku">${escapeHtml(item.sku)}</div>
          <div class="pos-qty-controls">
            <button type="button" class="pos-qty-btn qty-minus" aria-label="Decrease quantity">−</button>
            <input
              type="number"
              class="pos-qty-input"
              min="1"
              max="${item.stock}"
              value="${item.quantity}"
              aria-label="Quantity for ${escapeHtml(item.name)}"
            >
            <button type="button" class="pos-qty-btn qty-plus" aria-label="Increase quantity">+</button>
            <button type="button" class="btn btn-link btn-sm text-danger p-0 ms-1 remove-item">Remove</button>
          </div>
          <div class="pos-cart-item-price">UGX ${formatCurrency(item.unit_price * item.quantity)}</div>
        </div>`
      )
      .join("");

    const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    els.cartTotal.textContent = formatCurrency(total);
    els.completeBtn.disabled = !state.customer;

    els.cartItems.querySelectorAll(".pos-cart-item").forEach((row) => {
      const id = Number(row.dataset.productId);
      const item = state.cart.get(id);
      const qtyInput = row.querySelector(".pos-qty-input");
      const priceEl = row.querySelector(".pos-cart-item-price");

      row.querySelector(".qty-minus")?.addEventListener("click", () => updateCartQty(id, -1));
      row.querySelector(".qty-plus")?.addEventListener("click", () => updateCartQty(id, 1));
      row.querySelector(".remove-item")?.addEventListener("click", () => removeFromCart(id));

      qtyInput?.addEventListener("input", () => {
        const qty = Number(qtyInput.value) || 0;
        if (priceEl && item) {
          priceEl.textContent = `UGX ${formatCurrency(item.unit_price * qty)}`;
        }
        updateCartTotalPreview();
      });

      qtyInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          setCartQty(id, qtyInput.value);
        }
      });

      qtyInput?.addEventListener("blur", () => {
        setCartQty(id, qtyInput.value);
      });

      qtyInput?.addEventListener("focus", () => qtyInput.select());
    });

    syncFormFields();
  };

  const syncCustomerField = () => {
    if (!els.customerIdField) return;
    els.customerIdField.value = state.customer?.id ? String(state.customer.id) : "";
  };

  const syncFormFields = () => {
    if (!els.formFields) return;

    const items = [...state.cart.values()];
    els.formFields.innerHTML = items
      .map(
        (item) => `
        <input type="hidden" name="product_id[]" value="${item.id}">
        <input type="hidden" name="quantity[]" value="${item.quantity}">`
      )
      .join("");
  };

  const commitCartQuantities = () => {
    els.cartItems.querySelectorAll(".pos-cart-item").forEach((row) => {
      const id = Number(row.dataset.productId);
      const item = state.cart.get(id);
      const qtyInput = row.querySelector(".pos-qty-input");
      if (!item || !qtyInput) return;

      const qty = Math.floor(Number(qtyInput.value));
      if (Number.isFinite(qty) && qty > 0 && qty <= item.stock) {
        item.quantity = qty;
      }
    });
  };

  const selectCustomer = (customer) => {
    state.customer = {
      ...customer,
      id: Number(customer.id),
    };
    els.customerSearch.value = "";
    els.customerDropdown.classList.remove("show");
    els.customerSelected.style.display = "flex";
    els.customerSelectedName.textContent = customer.name;
    els.customerSelectedMeta.textContent = [customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact info";
    syncCustomerField();
    els.completeBtn.disabled = state.cart.size === 0;
  };

  const clearCustomer = () => {
    state.customer = null;
    els.customerSelected.style.display = "none";
    syncCustomerField();
    els.completeBtn.disabled = true;
  };

  const renderCustomerDropdown = (customers) => {
    state.customerResults = customers;
    state.customerHighlight = -1;

    if (!customers.length) {
      els.customerDropdown.innerHTML = `
        <div class="px-3 py-2 text-secondary small">No customers found.</div>
        <button type="button" class="pos-dropdown-item" id="open-quick-add">
          <span class="title text-primary"><i class="bi bi-person-plus me-1"></i>Quick add new customer</span>
        </button>`;
      els.customerDropdown.classList.add("show");
      document.getElementById("open-quick-add")?.addEventListener("click", openQuickAddModal);
      return;
    }

    els.customerDropdown.innerHTML = customers
      .map(
        (customer, index) => `
        <button type="button" class="pos-dropdown-item" data-index="${index}">
          <div class="title">${escapeHtml(customer.name)}</div>
          <div class="sub">${escapeHtml([customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact info")}</div>
        </button>`
      )
      .join("");

    els.customerDropdown.classList.add("show");

    els.customerDropdown.querySelectorAll(".pos-dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        const customer = state.customerResults[Number(item.dataset.index)];
        if (customer) selectCustomer(customer);
      });
    });
  };

  const searchCustomers = async () => {
    const query = els.customerSearch.value.trim();
    if (query.length < 1) {
      els.customerDropdown.classList.remove("show");
      return;
    }

    try {
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      renderCustomerDropdown(data.customers || []);
    } catch {
      els.customerDropdown.classList.remove("show");
    }
  };

  const debouncedSearchCustomers = debounce(searchCustomers, 200);

  const openQuickAddModal = () => {
    els.customerDropdown.classList.remove("show");
    els.quickAddError.style.display = "none";
    els.quickAddForm.reset();
    const modal = bootstrap.Modal.getOrCreateInstance(els.quickAddModal);
    modal.show();
    setTimeout(() => els.quickAddName?.focus(), 300);
  };

  const submitQuickAdd = async (event) => {
    event.preventDefault();
    els.quickAddError.style.display = "none";

    const name = els.quickAddName.value.trim();
    const phone = els.quickAddPhone.value.trim();

    if (!name) {
      els.quickAddError.textContent = "Customer name is required.";
      els.quickAddError.style.display = "block";
      return;
    }

    try {
      const response = await fetch("/api/customers/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        els.quickAddError.textContent = data.error || "Unable to add customer.";
        els.quickAddError.style.display = "block";
        return;
      }

      bootstrap.Modal.getOrCreateInstance(els.quickAddModal).hide();
      selectCustomer(data.customer);
      addRecentCustomerChip(data.customer);
      flashMessage(`Customer "${data.customer.name}" added`, "success");
    } catch {
      els.quickAddError.textContent = "Network error. Please try again.";
      els.quickAddError.style.display = "block";
    }
  };

  const addRecentCustomerChip = (customer) => {
    if (!els.recentCustomers) return;

    const existing = els.recentCustomers.querySelector(`[data-customer-id="${customer.id}"]`);
    if (existing) {
      els.recentCustomers.prepend(existing);
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pos-recent-btn";
    btn.dataset.customerId = customer.id;
    btn.dataset.customerName = customer.name;
    btn.dataset.customerPhone = customer.phone || "";
    btn.dataset.customerEmail = customer.email || "";
    btn.textContent = customer.name;
    btn.addEventListener("click", () =>
      selectCustomer({
        id: Number(customer.id),
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      })
    );
    els.recentCustomers.prepend(btn);
  };

  const initRecentCustomers = () => {
    els.recentCustomers?.querySelectorAll(".pos-recent-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        selectCustomer({
          id: Number(btn.dataset.customerId),
          name: btn.dataset.customerName,
          phone: btn.dataset.customerPhone || null,
          email: btn.dataset.customerEmail || null,
        })
      );
    });
  };

  const initCategoryChips = () => {
    els.categoryChips?.querySelectorAll(".pos-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        els.categoryChips.querySelectorAll(".pos-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.activeCategory = chip.dataset.category || "";
        fetchProducts();
      });
    });
  };

  const flashMessage = (message, type = "info", duration = 2500) => {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alert.style.zIndex = "9999";
    alert.style.minWidth = "280px";
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), duration);
  };

  const handleKeyboard = (event) => {
    if (event.key === "F2") {
      event.preventDefault();
      els.productSearch?.focus();
    }

    if (event.key === "F3") {
      event.preventDefault();
      els.customerSearch?.focus();
    }

    if (event.key === "Enter" && document.activeElement === els.productSearch) {
      const firstCard = els.productGrid?.querySelector(".pos-product-card");
      if (firstCard) {
        event.preventDefault();
        firstCard.click();
      }
    }

    if (document.activeElement === els.customerSearch && els.customerDropdown.classList.contains("show")) {
      const items = els.customerDropdown.querySelectorAll(".pos-dropdown-item[data-index]");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.customerHighlight = Math.min(state.customerHighlight + 1, items.length - 1);
        items.forEach((item, i) => item.classList.toggle("highlighted", i === state.customerHighlight));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.customerHighlight = Math.max(state.customerHighlight - 1, 0);
        items.forEach((item, i) => item.classList.toggle("highlighted", i === state.customerHighlight));
      }
      if (event.key === "Enter" && state.customerHighlight >= 0) {
        event.preventDefault();
        items[state.customerHighlight]?.click();
      }
    }
  };

  const validateBeforeSubmit = (event) => {
    commitCartQuantities();
    syncFormFields();
    syncCustomerField();

    if (!state.customer?.id || !els.customerIdField?.value) {
      event.preventDefault();
      flashMessage("Please select a customer before completing the sale.", "danger");
      els.customerSearch?.focus();
      return;
    }

    if (state.cart.size === 0) {
      event.preventDefault();
      flashMessage("Please add at least one product to the cart.", "danger");
      els.productSearch?.focus();
      return;
    }

    els.completeBtn.disabled = true;
    els.completeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
  };

  // Event bindings
  els.productSearch?.addEventListener("input", debouncedFetchProducts);
  els.customerSearch?.addEventListener("input", debouncedSearchCustomers);
  els.customerSearch?.addEventListener("focus", () => {
    if (els.customerSearch.value.trim()) searchCustomers();
  });
  els.clearCustomerBtn?.addEventListener("click", clearCustomer);
  document.getElementById("quick-add-btn")?.addEventListener("click", openQuickAddModal);
  els.quickAddForm?.addEventListener("submit", submitQuickAdd);
  els.saleForm?.addEventListener("submit", validateBeforeSubmit);
  document.addEventListener("keydown", handleKeyboard);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".pos-search-wrap") && !event.target.closest("#quick-add-btn")) {
      els.customerDropdown?.classList.remove("show");
    }
  });

  initRecentCustomers();
  initCategoryChips();
  fetchProducts();
  renderCart();

  els.productSearch?.focus();
})();

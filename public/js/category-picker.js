(() => {
  const categorySelect = document.getElementById("category-select");
  const categoryNewWrap = document.getElementById("category-new-wrap");
  const categoryNewInput = document.getElementById("category-new-input");
  const categoryNameField = document.getElementById("category-name-field");
  const productForm = document.getElementById("product-form");

  if (!categorySelect || !categoryNameField) return;

  const syncCategoryField = () => {
    if (categorySelect.value === "__new__") {
      categoryNameField.value = categoryNewInput?.value.trim() || "";
      return;
    }

    categoryNameField.value = categorySelect.value;
  };

  const toggleNewCategory = () => {
    const isNew = categorySelect.value === "__new__";
    if (categoryNewWrap) {
      categoryNewWrap.style.display = isNew ? "block" : "none";
    }
    if (isNew) {
      categoryNewInput?.focus();
    }
    syncCategoryField();
  };

  categorySelect.addEventListener("change", toggleNewCategory);
  categoryNewInput?.addEventListener("input", syncCategoryField);
  productForm?.addEventListener("submit", (event) => {
    syncCategoryField();
    if (categorySelect.value === "__new__" && !categoryNameField.value.trim()) {
      event.preventDefault();
      categoryNewInput?.focus();
      categoryNewInput?.classList.add("is-invalid");
      return;
    }
    categoryNewInput?.classList.remove("is-invalid");
  });

  toggleNewCategory();
})();

const DATA_URL = "./data/books_1000_chinese_titles.json";

const state = {
  books: [],
  filtered: [],
  page: 1,
  pageSize: 50,
  query: "",
  category: "",
};

const elements = {
  totalCount: document.querySelector("#total-count"),
  filteredCount: document.querySelector("#filtered-count"),
  searchInput: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  pageSize: document.querySelector("#page-size"),
  pageInfo: document.querySelector("#page-info"),
  tableBody: document.querySelector("#book-table-body"),
  rowTemplate: document.querySelector("#book-row-template"),
  prevPage: document.querySelector("#prev-page"),
  nextPage: document.querySelector("#next-page"),
  pageButtons: document.querySelector("#page-buttons"),
  categoryList: document.querySelector("#category-list"),
  dialog: document.querySelector("#book-dialog"),
  detail: document.querySelector("#book-detail"),
};

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawBooks = await response.json();
    state.books = rawBooks.map(normalizeBook);
    state.filtered = [...state.books];
    bindEvents();
    renderCategoryOptions();
    render();
  } catch (error) {
    showLoadError(error);
  }
}

function normalizeBook(book, index) {
  return {
    id: index + 1,
    title: String(book["书名"] ?? ""),
    author: String(book["作者"] ?? ""),
    price: Number(book["价格"] ?? 0),
    category: String(book["类型"] ?? ""),
  };
}

function bindEvents() {
  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value.trim().toLowerCase();
    state.page = 1;
    applyFilters();
  });

  elements.categoryFilter.addEventListener("change", () => {
    state.category = elements.categoryFilter.value;
    state.page = 1;
    applyFilters();
  });

  elements.pageSize.addEventListener("change", () => {
    state.pageSize = Number(elements.pageSize.value);
    state.page = 1;
    render();
  });

  elements.prevPage.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      render();
    }
  });

  elements.nextPage.addEventListener("click", () => {
    if (state.page < getTotalPages()) {
      state.page += 1;
      render();
    }
  });
}

function applyFilters() {
  state.filtered = state.books.filter((book) => {
    const matchesQuery =
      !state.query ||
      book.title.toLowerCase().includes(state.query) ||
      book.author.toLowerCase().includes(state.query);
    const matchesCategory = !state.category || book.category === state.category;
    return matchesQuery && matchesCategory;
  });
  render();
}

function render() {
  renderMetrics();
  renderTable();
  renderPagination();
  renderCategories();
}

function renderMetrics() {
  elements.totalCount.textContent = state.books.length.toString();
  elements.filteredCount.textContent = state.filtered.length.toString();
}

function renderTable() {
  elements.tableBody.innerHTML = "";
  const start = (state.page - 1) * state.pageSize;
  const pageBooks = state.filtered.slice(start, start + state.pageSize);

  for (const book of pageBooks) {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.bookId = book.id.toString();
    row.querySelector(".book-id").textContent = book.id;
    row.querySelector(".book-title").textContent = book.title;
    row.querySelector(".book-author").textContent = book.author;
    row.querySelector(".book-category").textContent = book.category;
    row.querySelector(".book-price").textContent = book.price.toFixed(2);
    row.querySelector(".detail-button").addEventListener("click", () => openDetail(book));
    elements.tableBody.append(row);
  }
}

function renderPagination() {
  const totalPages = getTotalPages();
  state.page = Math.min(state.page, totalPages);
  elements.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;
  elements.pageButtons.innerHTML = "";

  for (const page of getVisiblePages(totalPages)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = page;
    button.className = page === state.page ? "is-active" : "";
    button.addEventListener("click", () => {
      state.page = page;
      render();
    });
    elements.pageButtons.append(button);
  }
}

function renderCategoryOptions() {
  const categories = [...new Set(state.books.map((book) => book.category))].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.append(option);
  }
}

function renderCategories() {
  const counts = new Map();
  for (const book of state.filtered) {
    counts.set(book.category, (counts.get(book.category) ?? 0) + 1);
  }

  elements.categoryList.innerHTML = "";
  for (const [category, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const card = document.createElement("article");
    card.className = "category-card";
    card.dataset.category = category;
    card.innerHTML = `<span class="category-name"></span><strong class="category-count"></strong>`;
    card.querySelector(".category-name").textContent = category;
    card.querySelector(".category-count").textContent = count;
    elements.categoryList.append(card);
  }
}

function openDetail(book) {
  elements.detail.innerHTML = `
    <h2 class="book-title"></h2>
    <dl>
      <dt>ID</dt><dd class="book-id"></dd>
      <dt>作者</dt><dd class="book-author"></dd>
      <dt>类型</dt><dd class="book-category"></dd>
      <dt>价格</dt><dd class="book-price"></dd>
    </dl>
  `;
  elements.detail.dataset.bookId = book.id.toString();
  elements.detail.querySelector(".book-title").textContent = book.title;
  elements.detail.querySelector(".book-id").textContent = book.id;
  elements.detail.querySelector(".book-author").textContent = book.author;
  elements.detail.querySelector(".book-category").textContent = book.category;
  elements.detail.querySelector(".book-price").textContent = book.price.toFixed(2);
  elements.dialog.showModal();
}

function getTotalPages() {
  return Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
}

function getVisiblePages(totalPages) {
  const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function showLoadError(error) {
  const section = document.querySelector("#book-table-section");
  const message = document.createElement("div");
  message.className = "load-error";
  message.textContent = `数据加载失败：${error.message}`;
  section.prepend(message);
}

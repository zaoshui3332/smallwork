const DATA_URL = "./data/books_1000_enriched.json";

const FIELD_TITLE = "\u4e66\u540d";
const FIELD_AUTHOR = "\u4f5c\u8005";
const FIELD_PRICE = "\u4ef7\u683c";
const FIELD_CATEGORY = "\u7c7b\u578b";
const FIELD_RATING = "\u8bc4\u5206";
const FIELD_DATE = "\u53d1\u884c\u65e5\u671f";
const DETAIL_TEXT = "\u8be6\u60c5";
const PAGE_TEXT = "\u7b2c";
const PAGE_SUFFIX = "\u9875";
const LOAD_FAILED_TEXT = "\u6570\u636e\u52a0\u8f7d\u5931\u8d25";

const PREFERRED_FIELDS = [
  FIELD_TITLE,
  FIELD_AUTHOR,
  FIELD_PRICE,
  FIELD_CATEGORY,
  FIELD_RATING,
  FIELD_DATE,
];

const FIELD_CLASSES = {
  [FIELD_TITLE]: "book-title",
  [FIELD_AUTHOR]: "book-author",
  [FIELD_PRICE]: "book-price",
  [FIELD_CATEGORY]: "book-category",
  [FIELD_RATING]: "book-rating",
  [FIELD_DATE]: "book-date",
};

const state = {
  books: [],
  fields: [],
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
  tableHead: document.querySelector("#book-table-head"),
  tableBody: document.querySelector("#book-table-body"),
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
    state.fields = getDataFields(rawBooks);
    state.books = rawBooks.map(normalizeBook);
    state.filtered = [...state.books];

    bindEvents();
    renderCategoryOptions();
    render();
  } catch (error) {
    showLoadError(error);
  }
}

function getDataFields(rawBooks) {
  const seen = new Set();
  const fields = [];

  for (const field of PREFERRED_FIELDS) {
    fields.push(field);
    seen.add(field);
  }

  for (const book of rawBooks) {
    for (const field of Object.keys(book)) {
      if (!seen.has(field)) {
        fields.push(field);
        seen.add(field);
      }
    }
  }

  return fields;
}

function normalizeBook(book, index) {
  const values = {};
  for (const field of state.fields) {
    values[field] = book[field] ?? "";
  }

  return {
    id: index + 1,
    values,
    title: String(values[FIELD_TITLE] ?? ""),
    author: String(values[FIELD_AUTHOR] ?? ""),
    category: String(values[FIELD_CATEGORY] ?? ""),
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
    const searchableText = Object.values(book.values).join(" ").toLowerCase();
    const matchesQuery = !state.query || searchableText.includes(state.query);
    const matchesCategory = !state.category || book.category === state.category;
    return matchesQuery && matchesCategory;
  });
  render();
}

function render() {
  renderMetrics();
  renderTableHead();
  renderTable();
  renderPagination();
  renderCategories();
}

function renderMetrics() {
  elements.totalCount.textContent = state.books.length.toString();
  elements.filteredCount.textContent = state.filtered.length.toString();
}

function renderTableHead() {
  elements.tableHead.innerHTML = "";
  addHeaderCell("ID");
  for (const field of state.fields) {
    addHeaderCell(field, field);
  }
  addHeaderCell(DETAIL_TEXT);
}

function addHeaderCell(text, field = "") {
  const th = document.createElement("th");
  th.scope = "col";
  th.textContent = text;
  if (field) {
    th.dataset.field = field;
  }
  elements.tableHead.append(th);
}

function renderTable() {
  elements.tableBody.innerHTML = "";
  const start = (state.page - 1) * state.pageSize;
  const pageBooks = state.filtered.slice(start, start + state.pageSize);

  for (const book of pageBooks) {
    const row = document.createElement("tr");
    row.className = "book-row";
    row.dataset.bookId = book.id.toString();

    const idCell = document.createElement("td");
    idCell.className = "book-id";
    idCell.textContent = book.id;
    row.append(idCell);

    for (const field of state.fields) {
      const cell = document.createElement("td");
      cell.className = getFieldClass(field);
      cell.dataset.field = field;
      cell.textContent = formatValue(field, book.values[field]);
      row.append(cell);
    }

    const detailCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "detail-button";
    button.type = "button";
    button.textContent = DETAIL_TEXT;
    button.addEventListener("click", () => openDetail(book));
    detailCell.append(button);
    row.append(detailCell);

    elements.tableBody.append(row);
  }
}

function renderPagination() {
  const totalPages = getTotalPages();
  state.page = Math.min(state.page, totalPages);
  elements.pageInfo.textContent = `${PAGE_TEXT} ${state.page} / ${totalPages} ${PAGE_SUFFIX}`;
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
  const categories = [...new Set(state.books.map((book) => book.category))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

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
    if (!book.category) {
      continue;
    }
    counts.set(book.category, (counts.get(book.category) ?? 0) + 1);
  }

  elements.categoryList.innerHTML = "";
  for (const [category, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const card = document.createElement("article");
    card.className = "category-card";
    card.dataset.category = category;

    const name = document.createElement("span");
    name.className = "category-name";
    name.textContent = category;

    const value = document.createElement("strong");
    value.className = "category-count";
    value.textContent = count;

    card.append(name, value);
    elements.categoryList.append(card);
  }
}

function openDetail(book) {
  elements.detail.innerHTML = "";

  const title = document.createElement("h2");
  title.className = "book-title";
  title.textContent = book.title || `${DETAIL_TEXT} ${book.id}`;
  elements.detail.append(title);

  const list = document.createElement("dl");
  addDetailItem(list, "ID", book.id);
  for (const field of state.fields) {
    addDetailItem(list, field, formatValue(field, book.values[field]));
  }
  elements.detail.append(list);
  elements.detail.dataset.bookId = book.id.toString();

  elements.dialog.showModal();
}

function addDetailItem(list, label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  description.className = getFieldClass(label);
  description.dataset.field = label;
  list.append(term, description);
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (field === FIELD_PRICE) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue.toFixed(2) : String(value);
  }

  if (field === FIELD_RATING) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue.toFixed(1) : String(value);
  }

  return String(value);
}

function getFieldClass(field) {
  return FIELD_CLASSES[field] ?? `book-field book-field-${fieldToSlug(field)}`;
}

function fieldToSlug(field) {
  return encodeURIComponent(field).replace(/%/g, "").toLowerCase();
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
  message.textContent = `${LOAD_FAILED_TEXT}: ${error.message}`;
  section.prepend(message);
}

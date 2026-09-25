// reads the json the build wrote, draws the charts, runs the discount tool

// the published Tableau Public link goes here. empty hides the Tableau section
const TABLEAU_URL = "https://public.tableau.com/views/SuperstoreSalesPerformance_17903055112520/Overview";

const COLOR = { blue: "#2a78d6", orange: "#eb6834", grey: "#c3c2b7", red: "#c8553d" };
const SVG_NS = "http://www.w3.org/2000/svg";
const YEARS = [2023, 2024, 2025, 2026];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const num = (v) => Math.round(v).toLocaleString("en-US");
const usd = (v) => (v < 0 ? "-$" : "$") + num(Math.abs(v));
const usdShort = (v) => {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  if (a >= 1e6) return sign + "$" + (a / 1e6).toFixed(2) + "M";
  if (a >= 1e4) return sign + "$" + Math.round(a / 1000) + "k";
  return usd(v);
};
const pct = (v, d = 1) => (100 * v).toFixed(d) + "%";
const signed = (v) => (v >= 0 ? "+" : "") + pct(v);

function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

function mount(id, root) {
  document.getElementById(id).replaceChildren(root);
}

// ---------- charts ----------

// charts that sit in half a column are 640 wide, full width ones 960,
// so the text is the same size on screen
function frame(h, { left = 44, bottom = 28, top = 12, right = 12, w = 640 } = {}) {
  const root = svg("svg", { viewBox: `0 0 ${w} ${h}`, role: "img" });
  return { root, x0: left, x1: w - right, y0: top, y1: h - bottom };
}

function roundUpAxis(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 3 ? 3 : m <= 4 ? 4 : m <= 5 ? 5 : 10;
  return n * p;
}

function yAxis(area, lo, hi, format, steps = 4) {
  const group = svg("g", { class: "axis" });
  for (let i = 0; i <= steps; i++) {
    const v = lo + ((hi - lo) * i) / steps;
    const y = area.y1 - ((area.y1 - area.y0) * i) / steps;
    group.append(svg("line", { x1: area.x0, x2: area.x1, y1: y, y2: y, class: Math.abs(v) < 1e-9 && lo < 0 ? "zero" : "" }));
    group.append(svg("text", { x: area.x0 - 6, y: y + 4, "text-anchor": "end" }, format(v)));
  }
  return group;
}

// lines over the same x labels. series: [{label, color, dash, values: [number]}]
function lineChart(labels, series, { format, h = 240 } = {}) {
  const area = frame(h, { left: 52, w: 960 });
  const all = series.flatMap((s) => s.values);
  const hi = roundUpAxis(Math.max(...all));
  const lowest = Math.min(...all);
  const lo = lowest < 0 ? -roundUpAxis(-lowest) : 0;
  const xAt = (i) => area.x0 + ((area.x1 - area.x0) * i) / (labels.length - 1);
  const yAt = (v) => area.y1 - ((area.y1 - area.y0) * (v - lo)) / (hi - lo);
  area.root.append(yAxis(area, lo, hi, format));
  const axis = svg("g", { class: "axis" });
  const every = labels.length > 12 ? 12 : 1;
  labels.forEach((label, i) => {
    if (i % every === 0) {
      axis.append(svg("text", { x: xAt(i), y: area.y1 + 18, "text-anchor": "middle" }, label));
      axis.append(svg("line", { x1: xAt(i), x2: xAt(i), y1: area.y1, y2: area.y1 + 4 }));
    }
  });
  area.root.append(axis);
  for (const s of series) {
    const d = s.values.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
    area.root.append(svg("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-dasharray": s.dash || "none" }));
    const last = s.values[s.values.length - 1];
    area.root.append(svg("circle", { cx: xAt(labels.length - 1), cy: yAt(last), r: 4, fill: s.color, stroke: "#fff", "stroke-width": 2 }));
  }
  return area.root;
}

// horizontal bars, with an optional second part drawn in grey at the right end
function barChart(rows, { left = 150, right = 80 } = {}) {
  const rowH = 26;
  const area = frame(rows.length * rowH + 20, { left, right, bottom: 8, top: 8 });
  const top = Math.max(...rows.map((r) => r.total));
  const widthOf = (v) => ((area.x1 - area.x0) * v) / top;
  rows.forEach((r, i) => {
    const y = area.y0 + i * rowH;
    area.root.append(svg("text", { x: area.x0 - 8, y: y + 16, "text-anchor": "end", class: "label" }, r.label));
    area.root.append(svg("rect", { x: area.x0, y: y + 4, width: widthOf(r.total), height: 16, rx: 3, fill: COLOR.blue }));
    if (r.part > 0) {
      area.root.append(svg("rect", { x: area.x0 + widthOf(r.total - r.part) + 1, y: y + 4, width: Math.max(0, widthOf(r.part) - 1), height: 16, rx: 3, fill: COLOR.grey }));
    }
    const text = svg("text", { x: area.x0 + widthOf(r.total) + 8, y: y + 16, class: "value" }, r.text);
    if (r.red) text.setAttribute("fill", COLOR.red);
    area.root.append(text);
  });
  return area.root;
}

// full width horizontal bars from a zero line. negative values go left and are red
function signedBarChart(rows, { marker } = {}) {
  const rowH = 22;
  const area = frame(rows.length * rowH + 20, { left: 200, right: 90, bottom: 8, top: 8, w: 960 });
  const neg = Math.min(0, ...rows.map((r) => r.value));
  const pos = Math.max(0, ...rows.map((r) => r.value));
  const xAt = (v) => area.x0 + ((area.x1 - area.x0) * (v - neg)) / (pos - neg);
  area.root.append(svg("line", { x1: xAt(0), x2: xAt(0), y1: area.y0, y2: area.y1, class: "zero" }));
  rows.forEach((r, i) => {
    const y = area.y0 + i * rowH;
    area.root.append(svg("text", { x: area.x0 - 8, y: y + 15, "text-anchor": "end", class: "label" }, r.label));
    area.root.append(svg("rect", { x: Math.min(xAt(0), xAt(r.value)), y: y + 4, width: Math.abs(xAt(r.value) - xAt(0)), height: 14, rx: 2, fill: r.value < 0 ? COLOR.red : COLOR.blue }));
    area.root.append(svg("text", { x: (r.value < 0 ? xAt(0) : xAt(r.value)) + 6, y: y + 15, class: "value" }, usd(r.value)));
    if (marker !== undefined && r.key === marker) {
      area.root.append(svg("text", { x: 4, y: y + 15, class: "label", fill: COLOR.orange, "font-weight": 700 }, "cap ▸"));
    }
  });
  return area.root;
}

function legend(items) {
  const ul = document.createElement("ul");
  ul.className = "legend";
  for (const it of items) {
    const li = document.createElement("li");
    const key = document.createElement("span");
    key.className = "key" + (it.line ? " line" : "");
    key.style.background = it.color;
    li.append(key, it.label);
    ul.append(li);
  }
  return ul;
}

// ---------- state ----------

let DATA = null;
let year = "all";

function selectedYears() {
  return year === "all" ? YEARS : [Number(year)];
}

function sum(rows, key) {
  return rows.reduce((a, r) => a + r[key], 0);
}

// add up rows from the picked years that share a label
function combine(rows, keys = ["sales", "profit", "orders", "customers", "lines", "returned_orders"]) {
  const out = new Map();
  for (const r of rows) {
    if (!selectedYears().includes(r.year)) continue;
    const cur = out.get(r.label) || Object.fromEntries(keys.map((k) => [k, 0]));
    for (const k of keys) cur[k] += r[k] || 0;
    out.set(r.label, cur);
  }
  return [...out].map(([label, v]) => ({ label, ...v }));
}

// ---------- part 1 ----------

function drawTiles() {
  const years = DATA.summary.years.filter((y) => selectedYears().includes(y.year));
  const one = years.length === 1 ? years[0] : null;
  const sales = sum(years, "sales");
  const profit = sum(years, "profit");
  const orders = sum(years, "orders");
  const customers = one ? one.customers : DATA.summary.totals.customers;
  const yoy = (key) => (one && one[key] !== null ? [signed(one[key]) + " vs " + (one.year - 1), one[key] >= 0 ? "up" : "down"] : ["", ""]);
  const tiles = [
    ["Sales", usdShort(sales), ...yoy("sales_yoy")],
    ["Profit", usdShort(profit), ...yoy("profit_yoy")],
    ["Profit ratio", pct(profit / sales), one ? "profit divided by sales" : "all four years", ""],
    ["Orders", num(orders), ...yoy("orders_yoy")],
    ["Customers", num(customers), ...yoy("customers_yoy")],
  ];
  const box = document.getElementById("tiles");
  box.replaceChildren(...tiles.map(([label, value, sub, dir]) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<span class="label"></span><span class="value"></span><span class="sub"></span>`;
    tile.children[0].textContent = label;
    tile.children[1].textContent = value;
    tile.children[2].textContent = sub;
    if (dir) tile.children[2].classList.add(dir);
    return tile;
  }));
  document.getElementById("tiles-note").textContent = one
    ? `${one.new_customers} of the ${one.customers} customers were new in ${one.year}.`
    : `${num(DATA.summary.totals.customers)} customers placed ${num(DATA.summary.totals.orders)} orders over four years.`;
}

function monthlyLines(key, format) {
  const rows = DATA.monthly;
  if (year === "all") {
    const labels = rows.map((m) => m.year_month.slice(0, 4));
    return lineChart(labels, [{ color: COLOR.blue, values: rows.map((m) => m[key]) }], { format });
  }
  const y = Number(year);
  const pick = (yy) => rows.filter((m) => m.year === yy).map((m) => m[key]);
  const series = [{ label: String(y), color: COLOR.blue, values: pick(y) }];
  if (y > YEARS[0]) series.push({ label: String(y - 1), color: COLOR.grey, dash: "5 4", values: pick(y - 1) });
  return lineChart(MONTHS, series, { format });
}

function drawCharts() {
  mount("chart-sales", monthlyLines("sales", (v) => "$" + Math.round(v / 1000) + "k"));
  document.getElementById("sales-caption").textContent = year === "all"
    ? "Monthly sales from 2023 to 2026. Sales are generally higher towards the end of each year."
    : `Monthly sales in ${year}. A dashed line shows the previous year when data is available.`;
  mount("chart-ratio", monthlyLines("profit_ratio", (v) => pct(v, 0)));

  const seg = combine(DATA.breakdowns.segment).sort((a, b) => b.sales - a.sales);
  mount("chart-segment", barChart(seg.map((r) => ({ label: r.label, total: r.sales, part: r.profit, text: usdShort(r.sales) })), { left: 100 }));
  const reg = combine(DATA.breakdowns.region).sort((a, b) => b.sales - a.sales);
  mount("chart-region", barChart(reg.map((r) => ({ label: r.label, total: r.sales, part: r.profit, text: usdShort(r.sales) + ", " + pct(r.profit / r.sales, 0) })), { left: 70, right: 100 }));
}

// ---------- part 2 ----------

function drawCustomers() {
  const rows = DATA.breakdowns.customer_type.filter((r) => selectedYears().includes(r.year));
  const byYear = YEARS.filter((y) => selectedYears().includes(y)).map((y) => {
    const fresh = rows.find((r) => r.year === y && r.label === "New")?.customers || 0;
    const back = rows.find((r) => r.year === y && r.label === "Returning")?.customers || 0;
    return { label: String(y), total: fresh + back, part: back, text: `${fresh} new, ${back} returning` };
  });
  mount("chart-customers", barChart(byYear, { left: 50, right: 160 }));
  document.getElementById("chart-customers").append(legend([{ label: "new", color: COLOR.blue }, { label: "returning", color: COLOR.grey }]));

  const products = combine(DATA.breakdowns.products, ["sales", "profit"]).sort((a, b) => b.sales - a.sales).slice(0, 10);
  mount("chart-products", barChart(products.map((r) => ({
    label: r.label.length > 24 ? r.label.slice(0, 23) + "…" : r.label,
    total: r.sales, part: Math.max(0, r.profit), text: usdShort(r.sales) + (r.profit < 0 ? ", loss" : ""), red: r.profit < 0,
  })), { left: 175, right: 90 }));
  document.getElementById("chart-products").append(legend([{ label: "sales", color: COLOR.blue }, { label: "of which profit", color: COLOR.grey }]));
}

// ---------- part 3 ----------

function cap() {
  return Number(document.querySelector("[data-cap]").value) / 100;
}

function drawDiscount() {
  const sub = combine(DATA.breakdowns.sub_category).sort((a, b) => b.profit - a.profit);
  mount("chart-subcategory", signedBarChart(sub.map((r) => ({ label: r.label, value: r.profit }))));

  const levels = new Map();
  for (const r of DATA.discount) {
    if (!selectedYears().includes(r.year)) continue;
    const cur = levels.get(r.discount) || { lines: 0, sales: 0, profit: 0, list_sales: 0 };
    for (const k of ["lines", "sales", "profit", "list_sales"]) cur[k] += r[k];
    levels.set(r.discount, cur);
  }
  const rows = [...levels].sort((a, b) => a[0] - b[0]);
  const c = cap();
  const capKey = rows.reduce((best, [d]) => (d <= c + 1e-9 ? d : best), rows[0][0]);
  mount("chart-discount", signedBarChart(rows.map(([d, v]) => ({
    key: d, label: `${Math.round(d * 100)}% (${num(v.lines)} lines)`, value: v.profit,
  })), { marker: c > 0 ? capKey : undefined }));

  // every line above the cap is sold at the capped discount instead
  let profit = 0, lines = 0, extra = 0, cappedLines = 0;
  for (const [d, v] of rows) {
    profit += v.profit;
    lines += v.lines;
    if (d > c + 1e-9) {
      extra += v.list_sales * (1 - c) - v.sales;
      cappedLines += v.lines;
    }
  }
  const box = document.getElementById("cap-answer");
  box.innerHTML = `<div class="big"></div><div class="row"></div><div class="row"></div>`;
  box.children[0].textContent = cappedLines === 0
    ? "No order lines exceed this discount limit"
    : `Profit under this assumption: ${usd(profit + extra)}`;
  box.children[1].textContent = cappedLines === 0
    ? `The highest discount in ${year === "all" ? "the data" : year} is ${pct(rows[rows.length - 1][0], 0)}.`
    : `Recorded profit was ${usd(profit)}. The calculated change is ${signed(extra / Math.abs(profit))}. ${num(cappedLines)} of ${num(lines)} order lines (${pct(cappedLines / lines, 0)}) had a discount above ${pct(c, 0)}.`;
  box.children[2].textContent = cappedLines === 0 ? "" :
    `Sales would increase by ${usd(extra)} if customers bought the same quantities with a maximum discount of ${pct(c, 0)}. This does not account for changes in demand.`;
}

// ---------- tableau ----------

function showTableau() {
  if (!TABLEAU_URL) return;
  const section = document.getElementById("tableau");
  section.hidden = false;
  const viz = document.createElement("tableau-viz");
  viz.setAttribute("src", TABLEAU_URL);
  viz.setAttribute("toolbar", "bottom");
  document.getElementById("viz").replaceChildren(viz);
  document.getElementById("viz-link").href = TABLEAU_URL;
  for (const id of ["shot-overview", "shot-customers", "shot-products"]) document.getElementById(id).href = TABLEAU_URL;
}

// ---------- wiring ----------

function drawAll() {
  drawTiles();
  drawCharts();
  drawCustomers();
  drawDiscount();
}

async function main() {
  const [summary, monthly, breakdowns, discount] = await Promise.all(
    ["summary", "monthly", "breakdowns", "discount"].map((n) => fetch(`data/${n}.json`).then((r) => r.json())),
  );
  DATA = { summary, monthly, breakdowns, discount };
  showTableau();

  document.querySelectorAll(".switch button").forEach((b) =>
    b.addEventListener("click", () => {
      year = b.dataset.year;
      document.querySelectorAll(".switch button").forEach((x) => x.classList.toggle("is-on", x === b));
      drawAll();
    }));
  document.querySelector("[data-cap]").addEventListener("input", (e) => {
    document.getElementById("cap-value").textContent = e.target.value + "%";
    drawDiscount();
  });
  drawAll();
}

main();

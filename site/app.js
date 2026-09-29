// reads the json the build wrote, draws the charts, runs the growth split

// the published Tableau Public link goes here. empty hides the Tableau section
const TABLEAU_URL = "";

const COLOR = { blue: "#2a78d6", orange: "#eb6834", grey: "#c3c2b7", red: "#c8553d" };
const SVG_NS = "http://www.w3.org/2000/svg";
const YEARS = [2020, 2021, 2022, 2023];
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

// horizontal bars from a zero line. negative values go left and are red
function signedBarChart(rows, { format = usd, w = 960, left = 200, right = 90 } = {}) {
  const rowH = 22;
  const area = frame(rows.length * rowH + 20, { left, right, bottom: 8, top: 8, w });
  const neg = Math.min(0, ...rows.map((r) => r.value));
  const pos = Math.max(0, ...rows.map((r) => r.value));
  const xAt = (v) => area.x0 + ((area.x1 - area.x0) * (v - neg)) / (pos - neg);
  area.root.append(svg("line", { x1: xAt(0), x2: xAt(0), y1: area.y0, y2: area.y1, class: "zero" }));
  rows.forEach((r, i) => {
    const y = area.y0 + i * rowH;
    area.root.append(svg("text", { x: area.x0 - 8, y: y + 15, "text-anchor": "end", class: "label" }, r.label));
    area.root.append(svg("rect", { x: Math.min(xAt(0), xAt(r.value)), y: y + 4, width: Math.abs(xAt(r.value) - xAt(0)), height: 14, rx: 2, fill: r.value < 0 ? COLOR.red : COLOR.blue }));
    area.root.append(svg("text", { x: (r.value < 0 ? xAt(0) : xAt(r.value)) + 6, y: y + 15, class: "value" }, format(r.value)));
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
function combine(rows, keys = ["sales", "profit", "orders", "customers", "lines"]) {
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
    : `${num(DATA.summary.totals.customers)} customers placed ${num(DATA.summary.totals.orders)} orders in ${DATA.summary.totals.countries} countries over four years.`;
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
  const k = (v) => "$" + Math.round(v / 1000) + "k";
  mount("chart-sales", monthlyLines("sales", k));
  document.getElementById("sales-caption").textContent = year === "all"
    ? "Sales per month over the four years. The second half of each year is stronger than the first."
    : `Sales per month in ${year}. The dashed line is ${Number(year) - 1}.`;
  mount("chart-profit", monthlyLines("profit", k));

  const seg = combine(DATA.breakdowns.segment).sort((a, b) => b.sales - a.sales);
  mount("chart-segment", barChart(seg.map((r) => ({ label: r.label, total: r.sales, part: r.profit, text: usdShort(r.sales) })), { left: 100 }));
  const cat = combine(DATA.breakdowns.category).sort((a, b) => b.sales - a.sales);
  mount("chart-category", barChart(cat.map((r) => ({ label: r.label, total: r.sales, part: r.profit, text: usdShort(r.sales) + ", " + pct(r.profit / r.sales, 0) })), { left: 90, right: 100 }));
}

// ---------- part 2 ----------

function drawPlaces() {
  const countries = combine(DATA.breakdowns.country).sort((a, b) => b.sales - a.sales);
  mount("chart-country", barChart(countries.map((r) => ({
    label: r.label, total: r.sales, part: Math.max(0, r.profit), text: usdShort(r.sales), red: r.profit < 0,
  })), { left: 120, right: 70 }));
  mount("chart-country-ratio", signedBarChart(countries.map((r) => ({ label: r.label, value: r.profit / r.sales })), { format: (v) => pct(v, 0), w: 640, left: 120, right: 60 }));

  const sub = combine(DATA.breakdowns.sub_category).sort((a, b) => b.profit - a.profit);
  mount("chart-subcategory", signedBarChart(sub.map((r) => ({ label: r.label, value: r.profit }))));
}

// ---------- part 3 ----------

function drawCustomers() {
  const rows = DATA.breakdowns.customer_type.filter((r) => selectedYears().includes(r.year));
  const byYear = YEARS.filter((y) => selectedYears().includes(y)).map((y) => {
    const fresh = rows.find((r) => r.year === y && r.label === "New")?.customers || 0;
    const back = rows.find((r) => r.year === y && r.label === "Returning")?.customers || 0;
    return { label: String(y), total: fresh + back, part: back, text: `${fresh} new, ${back} returning` };
  });
  mount("chart-customers", barChart(byYear, { left: 50, right: 160 }));
  document.getElementById("chart-customers").append(legend([{ label: "new", color: COLOR.blue }, { label: "returning", color: COLOR.grey }]));

  const top = combine(DATA.breakdowns.customers, ["sales", "profit"]).sort((a, b) => b.sales - a.sales).slice(0, 10);
  mount("chart-top-customers", barChart(top.map((r) => ({
    label: r.label, total: r.sales, part: Math.max(0, r.profit), text: usdShort(r.sales), red: r.profit < 0,
  })), { left: 150, right: 70 }));
}

const KINDS = [
  ["new", "New customers"],
  ["back", "Came back after a year away"],
  ["up", "Returning, spent more"],
  ["down", "Returning, spent less"],
  ["lost", "Did not order this year"],
];

function drawGrowth() {
  const y = year === "all" ? 2023 : Number(year);
  const segment = document.querySelector("[data-segment]").value;
  const box = document.getElementById("growth-answer");
  if (y === YEARS[0]) {
    box.innerHTML = `<div class="big">2020 is the first year</div><div class="row">There is no year before it to compare with. Pick another year above.</div>`;
    mount("chart-growth", svg("svg", { viewBox: "0 0 960 10" }));
    return;
  }
  const rows = DATA.growth.filter((g) => g.year === y && (segment === "all" || g.segment === segment));
  const parts = KINDS.map(([kind, label]) => {
    const hits = rows.filter((g) => g.kind === kind);
    return { kind, label, customers: sum(hits, "customers"), value: sum(hits, "delta") };
  });
  const change = sum(parts, "value");
  const info = DATA.summary.years.find((r) => r.year === y);
  const base = segment === "all"
    ? info.sales - change
    : sum(DATA.breakdowns.segment.filter((r) => r.year === y - 1 && r.label === segment), "sales");
  const part = (kind) => parts.find((p) => p.kind === kind);
  box.innerHTML = `<div class="big"></div><div class="row"></div><div class="row"></div>`;
  box.children[0].textContent = `Sales ${change >= 0 ? "grew" : "fell"} by ${usd(Math.abs(change))} in ${y}`;
  box.children[1].textContent =
    `That is ${signed(change / base)} against ${y - 1}${segment === "all" ? "" : " for " + segment}. ` +
    `Returning customers who spent more added ${usd(part("up").value)} (${part("up").customers} customers), ` +
    `and ${part("back").customers} who came back after a year away added ${usd(part("back").value)}. ` +
    `Only ${part("new").customers} customer${part("new").customers === 1 ? " was" : "s were"} new.`;
  box.children[2].textContent =
    `Returning customers who spent less took away ${usd(-part("down").value)} (${part("down").customers} customers), ` +
    `and ${part("lost").customers} customers who did not order took away ${usd(-part("lost").value)}.`;
  mount("chart-growth", signedBarChart(parts.map((p) => ({ label: `${p.label} (${p.customers})`, value: p.value })), { left: 260 }));
}

// ---------- tableau ----------

function showTableau() {
  if (!TABLEAU_URL) return;
  document.getElementById("tableau").hidden = false;
  const viz = document.createElement("tableau-viz");
  viz.setAttribute("src", TABLEAU_URL);
  viz.setAttribute("toolbar", "bottom");
  document.getElementById("viz").replaceChildren(viz);
  document.getElementById("viz-link").href = TABLEAU_URL;
  for (const id of ["shot-summary", "shot-customers"]) document.getElementById(id).href = TABLEAU_URL;
}

// ---------- wiring ----------

function drawAll() {
  drawTiles();
  drawCharts();
  drawPlaces();
  drawCustomers();
  drawGrowth();
}

async function main() {
  const [summary, monthly, breakdowns, growth] = await Promise.all(
    ["summary", "monthly", "breakdowns", "growth"].map((n) => fetch(`data/${n}.json`).then((r) => r.json())),
  );
  DATA = { summary, monthly, breakdowns, growth };
  showTableau();

  document.querySelectorAll(".switch button").forEach((b) =>
    b.addEventListener("click", () => {
      year = b.dataset.year;
      document.querySelectorAll(".switch button").forEach((x) => x.classList.toggle("is-on", x === b));
      drawAll();
    }));
  document.querySelector("[data-segment]").addEventListener("change", drawGrowth);
  drawAll();
}

main();

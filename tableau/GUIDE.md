# Building the dashboard in Tableau Public

You need Tableau Public, the free desktop app, signed in with the account
that should own the report. Run `python build.py` first. It writes
`tableau/data/tech_company_sales_clean.csv`, the one flat table the
workbook uses.

The workbook has two dashboards. The first follows
`tableau/original-dashboard.png`, keep that picture open while building.

Names matter. Use the exact field names below, because later fields refer
to earlier ones.

## 1. Connect

1. Open Tableau Public. In the Connect pane on the left, click **Text file**
   and pick `tableau/data/tech_company_sales_clean.csv`.
2. On the Data Source page check the types in the column headers. Order
   Date and First Order Date must be dates (calendar icon). Sales and
   Profit must be numbers (#).
3. Right-click **Country** in the column list, choose **Geographic Role**,
   then **Country/Region**.
4. Click **Sheet 1** at the bottom left.

## 2. Parameters

In the Data pane on the left, click the small arrow at the top right of the
pane and choose **Create Parameter**. Make these two.

| Name | Data type | Allowable values | Current value |
|---|---|---|---|
| Select Year | Integer | List: 2021, 2022, 2023 | 2023 |
| Select Metric | String | List: Sales, Profit, Orders, Customers | Sales |

After each one, right-click it in the Data pane and choose **Show Parameter**.

## 3. Calculated fields

Open the **Analysis** menu and choose **Create Calculated Field**. Type the
name on top and the formula in the box. Click OK. Make all of them before
building the sheets.

| Name | Formula |
|---|---|
| CY Sales | `SUM(IF YEAR([Order Date]) = [Select Year] THEN [Sales] END)` |
| PY Sales | `SUM(IF YEAR([Order Date]) = [Select Year] - 1 THEN [Sales] END)` |
| CY Profit | `SUM(IF YEAR([Order Date]) = [Select Year] THEN [Profit] END)` |
| PY Profit | `SUM(IF YEAR([Order Date]) = [Select Year] - 1 THEN [Profit] END)` |
| CY Orders | `COUNTD(IF YEAR([Order Date]) = [Select Year] THEN [Order ID] END)` |
| PY Orders | `COUNTD(IF YEAR([Order Date]) = [Select Year] - 1 THEN [Order ID] END)` |
| CY Customers | `COUNTD(IF YEAR([Order Date]) = [Select Year] THEN [Customer ID] END)` |
| PY Customers | `COUNTD(IF YEAR([Order Date]) = [Select Year] - 1 THEN [Customer ID] END)` |
| Sales YoY | `([CY Sales] - [PY Sales]) / [PY Sales]` |
| Profit YoY | `([CY Profit] - [PY Profit]) / [PY Profit]` |
| Orders YoY | `([CY Orders] - [PY Orders]) / [PY Orders]` |
| Customers YoY | `([CY Customers] - [PY Customers]) / [PY Customers]` |
| Sales Arrow | `IF [Sales YoY] >= 0 THEN "▲" ELSE "▼" END` |
| Profit Arrow | `IF [Profit YoY] >= 0 THEN "▲" ELSE "▼" END` |
| Orders Arrow | `IF [Orders YoY] >= 0 THEN "▲" ELSE "▼" END` |
| Customers Arrow | `IF [Customers YoY] >= 0 THEN "▲" ELSE "▼" END` |
| Sales Below PY | `[CY Sales] < [PY Sales]` |
| Profit Below PY | `[CY Profit] < [PY Profit]` |
| Orders Below PY | `[CY Orders] < [PY Orders]` |
| Customers Below PY | `[CY Customers] < [PY Customers]` |
| CY Metric | `CASE [Select Metric] WHEN "Sales" THEN [CY Sales] WHEN "Profit" THEN [CY Profit] WHEN "Orders" THEN [CY Orders] ELSE [CY Customers] END` |
| PY Metric | `CASE [Select Metric] WHEN "Sales" THEN [PY Sales] WHEN "Profit" THEN [PY Profit] WHEN "Orders" THEN [PY Orders] ELSE [PY Customers] END` |
| Metric Value | `CASE [Select Metric] WHEN "Sales" THEN SUM([Sales]) WHEN "Profit" THEN SUM([Profit]) WHEN "Orders" THEN COUNTD([Order ID]) ELSE COUNTD([Customer ID]) END` |
| Period | `IF YEAR([Order Date]) = [Select Year] THEN "Current Period" ELSEIF YEAR([Order Date]) = [Select Year] - 1 THEN "Previous Period" END` |
| Is Selected Year | `YEAR([Order Date]) = [Select Year]` |
| Profit Ratio | `SUM([Profit]) / SUM([Sales])` |
| First Order Date LOD | `{FIXED [Customer ID] : MIN([Order Date])}` |
| Customer Type LOD | `IF YEAR([Order Date]) = YEAR([First Order Date LOD]) THEN "New" ELSE "Returning" END` |

Customer Type LOD must give the same answer as the Customer Type column
from the CSV. Check it once: put both on Rows of an empty sheet with
COUNTD(Customer ID) on Text. Every row must have New with New and
Returning with Returning, nothing crossed.

Format the four YoY fields as percent with one decimal: right-click the
field in the Data pane, **Default Properties**, **Number Format**,
**Percentage**, 1 decimal. Format Profit Ratio the same way. Format Sales,
Profit, CY Sales, PY Sales, CY Profit and PY Profit as **Currency (Custom)**
with 1 decimal and Display Units **Thousands (K)**, so they read like
$1,042.2K.

## 4. Sheets for the Executive summary

Rename each sheet by double-clicking its tab at the bottom. Two colours are
used everywhere: light blue `#A6CEE3` for the current period and red
`#E15759` for months below the previous year. The previous period is a
black mark.

**KPI Sales**
- Marks type: Text.
- Drag CY Sales, PY Sales, Sales Arrow and Sales YoY onto Text.
- Click Text on the Marks card, click the three dots, and lay it out as
  three lines: the big CY Sales, then `<PY Sales> PY` smaller, then
  `<Sales Arrow><Sales YoY> vs PY`. Make the last line green.

**Sales by Month**
- Drag Order Date to Columns. Click the pill's arrow and choose the
  discrete **Month** (the one that shows "May", not "May 2023").
- Drag CY Sales to Rows. Drag PY Sales to Rows next to it.
- Right-click the PY Sales pill on Rows and choose **Dual Axis**. Right-click
  the right axis and choose **Synchronize Axis**.
- On the Marks card, set the CY Sales mark to **Bar** and the PY Sales mark
  to **Gantt Bar**. On the Gantt mark, click Size and make it thin, and
  click Color and set it to black.
- On the CY Sales mark, drag Sales Below PY onto Color. Set False to light
  blue and True to red.
- Right-click each axis and untick **Show Header**. Right-click the month
  labels, Format, and use the first letter only if there is room, or keep
  the three-letter month.

Make **KPI Profit**, **KPI Orders**, **KPI Customers** and **Profit by
Month**, **Orders by Month**, **Customers by Month** the same way with the
matching fields. Duplicate a sheet (right-click the tab, Duplicate) and
swap the fields.

**Segment Comparison**
- Drag Segment to Rows. Drag CY Metric to Columns, then PY Metric next to it.
- Right-click PY Metric on Columns, **Dual Axis**, then synchronize the axes.
- CY Metric mark: Bar, light blue. PY Metric mark: Gantt Bar, thin, black.
- Drag CY Metric onto Label of the bar mark. Hide both axis headers.

**Segment Trends**
- Drag Segment to Columns. Drag Order Date to Columns next to it as
  discrete **Month**.
- Drag Metric Value to Rows.
- Drag Period onto Color. Set Current Period to blue `#1F77B4` and
  Previous Period to grey `#BAB0AC`.
- Drag Period to Filters and untick Null, so only the two periods show.
- Marks type: Line. Hide the month labels (right-click, Show Header off)
  and keep the Segment headers on top.

**Category Comparison** and **Category Trends**: same as the two segment
sheets, with Category instead of Segment.

**Country Map**
- Double-click Country. Tableau draws a map of Europe.
- Marks type: Map. Drag Metric Value onto Color. Pick **Blue** sequential.
- Drag Country onto Label.
- Drag Is Selected Year to Filters and tick True.
- Drag Country, Metric Value, CY Sales and PY Sales onto Tooltip.

## 5. Sheets for Customers

**New and Returning Customers**
- Drag Order Date to Columns as discrete **Year**.
- Drag Customer ID to Rows. Click the pill's arrow, Measure, **Count (Distinct)**.
- Drag Customer Type LOD onto Color, CNTD(Customer ID) onto Label.
- No year filter. It shows all four years.

**Top Customers**
- Drag Customer Name to Rows and Sales to Columns. Sort descending.
- Drag Customer Name to Filters, **Top** tab, By field, Top 10 by Sales, Sum.
- Drag Profit Ratio onto Color, Orange-Blue Diverging, centered at 0.
- Drag Is Selected Year to Filters and tick True. Right-click it on the
  Filters card and choose **Add to Context**, so the top 10 is for the
  selected year.

**Profit by Sub-Category**
- Drag Sub-Category to Rows and Profit to Columns. Sort descending.
- Drag Profit onto Color, Orange-Blue Diverging, centered at 0, and onto Label.
- Drag Is Selected Year to Filters and tick True.

## 6. Dashboards

Click the **New Dashboard** button at the bottom (the icon with the plus and
a grid). At the bottom left of the Dashboard pane set **Size** to
**Fixed size**, 1000 wide, 850 high.

**Executive Summary**, laid out like `original-dashboard.png`:
- A **Text** object at the top: `SALES PERFORMANCE - EXECUTIVE SUMMARY`,
  bold, centered.
- Under it a small text line for the legend: a light blue square, then
  `Current Period`, a black bar, then `Previous Period`.
- One row of four tiles. Each tile is a **Vertical** container holding the
  KPI text sheet on top and its monthly sheet below, for Sales, Profit,
  Orders, Customers. Give each tile a title in capitals (SALES, PROFIT,
  ORDERS, CUSTOMERS) and a thin grey border.
- Under the tiles, a row with the Select Year and Select Metric parameters.
  Show them: click any sheet on the dashboard, click its small arrow,
  **Parameters**, and tick both. Show Select Metric as a single value list
  and lay it out horizontally.
- Bottom left, two blocks: `SALES COMPARISON BY SEGMENT` with Segment
  Comparison on the left and Segment Trends on the right, then
  `SALES COMPARISON BY CATEGORY` with the two category sheets. Add a small
  italic text line under each block title: `Comparison period December
  <year> vs. December PY` is what the original said, `Current year vs.
  previous year` is plainer.
- Bottom right: the Country Map with the title `SALES COMPARISON BY
  COUNTRY` and an italic line `Click on the country to filter the whole view`.
- Click the map sheet and click the funnel icon at its top right
  (**Use as Filter**). Now clicking a country filters every sheet.
- Hide the sheet titles that would repeat the block titles.

**Customers**
- New dashboard, same fixed size.
- Title text `Customers`, with the Select Year parameter inserted through
  the Insert button of the text editor.
- Top row: New and Returning Customers on the left, Top Customers on the right.
- Bottom: Profit by Sub-Category, full width.
- Show the Select Year parameter.

Then hide the worksheets so only the two dashboards show as tabs:
right-click each worksheet tab at the bottom and choose **Hide Sheet**.
Rename the dashboards to Executive Summary and Customers.

## 7. Publish

1. Make sure the app is signed in with the account that should own the
   report. If not, open the **Server** menu and sign out, then sign in again.
2. Open the **File** menu and choose **Save to Tableau Public As**.
3. Name the workbook `Executive Sales Performance Dashboard`. Click Save.
4. The browser opens the published report. Click **Edit Details** and turn
   on **Show Sheets**, so the two tabs are visible. Save.
5. Copy the link from the address bar. It looks like
   `https://public.tableau.com/views/ExecutiveSalesPerformanceDashboard/ExecutiveSummary`.
   Cut off anything after the dashboard name, from `?` on.

## 8. Put it on the web page

1. Open `site/app.js` and set `TABLEAU_URL` to the link.
2. In Tableau Public, open each dashboard, open the **Dashboard** menu, and
   choose **Export Image**. Save them as `site/tableau/summary.png` and
   `site/tableau/customers.png`.
3. Add a short line to the README under "The Tableau dashboard" with the
   link. Commit and push.

```bash
git add site/app.js site/tableau README.md && git commit -m "Add the Tableau dashboard" && git push
```

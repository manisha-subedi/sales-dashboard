# Building the dashboard in Tableau Public

You need Tableau Public, the free desktop app, and a Tableau Public account.
Run `python build.py` first. It writes `tableau/data/superstore_clean.csv`,
the one flat table the workbook uses.

The workbook has three dashboards: Overview, Customers, and Products. Build
the sheets first, then put them on the dashboards, then publish.

Names matter. Use the exact field names below, because later fields refer
to earlier ones.

## 1. Connect

1. Open Tableau Public. In the Connect pane on the left, click **Text file**
   and pick `tableau/data/superstore_clean.csv`.
2. On the Data Source page check the types in the column headers. Order Date,
   Ship Date, and First Order Date must be dates (calendar icon). Sales,
   Profit, Quantity, Discount, List Sales, and Ship Days must be numbers (#).
   Postal Code must be a string (Abc). If it shows as a number, click the
   type icon above the column and choose **String**.
3. Right-click **State** in the column list, choose **Geographic Role**,
   then **State/Province**. Do the same for **Country** with the role
   **Country/Region**.
4. Click **Sheet 1** at the bottom left.

## 2. Parameters

In the Data pane on the left, click the small arrow at the top right of the
pane and choose **Create Parameter**. Make these three.

| Name | Data type | Allowable values | Current value |
|---|---|---|---|
| Selected Year | Integer | List: 2023, 2024, 2025, 2026 | 2026 |
| Metric | String | List: Sales, Profit, Orders, Customers | Sales |
| Top N | Integer | Range from 5 to 20, step 5 | 10 |

After each one, right-click it in the Data pane and choose **Show Parameter**.

## 3. Calculated fields

Open the **Analysis** menu and choose **Create Calculated Field**. Type the
name on top and the formula in the box. Click OK. Make all of them before
building the sheets.

| Name | Formula |
|---|---|
| Profit Ratio | `SUM([Profit]) / SUM([Sales])` |
| Is Selected Year | `YEAR([Order Date]) = [Selected Year]` |
| Sales CY | `SUM(IF YEAR([Order Date]) = [Selected Year] THEN [Sales] END)` |
| Sales PY | `SUM(IF YEAR([Order Date]) = [Selected Year] - 1 THEN [Sales] END)` |
| Sales YoY | `([Sales CY] - [Sales PY]) / [Sales PY]` |
| Profit CY | `SUM(IF YEAR([Order Date]) = [Selected Year] THEN [Profit] END)` |
| Profit PY | `SUM(IF YEAR([Order Date]) = [Selected Year] - 1 THEN [Profit] END)` |
| Profit YoY | `([Profit CY] - [Profit PY]) / [Profit PY]` |
| Orders CY | `COUNTD(IF YEAR([Order Date]) = [Selected Year] THEN [Order ID] END)` |
| Orders PY | `COUNTD(IF YEAR([Order Date]) = [Selected Year] - 1 THEN [Order ID] END)` |
| Orders YoY | `([Orders CY] - [Orders PY]) / [Orders PY]` |
| Customers CY | `COUNTD(IF YEAR([Order Date]) = [Selected Year] THEN [Customer ID] END)` |
| Customers PY | `COUNTD(IF YEAR([Order Date]) = [Selected Year] - 1 THEN [Customer ID] END)` |
| Customers YoY | `([Customers CY] - [Customers PY]) / [Customers PY]` |
| Selected Metric | `CASE [Metric] WHEN "Sales" THEN SUM([Sales]) WHEN "Profit" THEN SUM([Profit]) WHEN "Orders" THEN COUNTD([Order ID]) ELSE COUNTD([Customer ID]) END` |
| Sales per Customer | `SUM([Sales]) / COUNTD([Customer ID])` |
| Return Rate | `COUNTD(IF [Returned] = "Yes" THEN [Order ID] END) / COUNTD([Order ID])` |
| First Order Date LOD | `{FIXED [Customer ID] : MIN([First Order Date])}` |
| Customer Type LOD | `IF YEAR([Order Date]) = YEAR([First Order Date LOD]) THEN "New" ELSE "Returning" END` |

Customer Type LOD must give the same answer as the Customer Type column
from the CSV. Check it once: put both on Rows of an empty sheet with
COUNTD(Customer ID) on Text. Every row must have New with New and
Returning with Returning, nothing crossed.

Use the CSV's **First Order Date** in the calculation above. It was
calculated from the full dataset. Using Order Date instead would let
context filters change a customer's first-order year.

Format the four YoY fields as percent with one decimal: right-click the
field in the Data pane, **Default Properties**, **Number Format**,
**Percentage**, 1 decimal. Format Profit Ratio and Return Rate the same way.
Format Sales and Profit as **Currency (Custom)** with 0 decimals.

## 4. Sheets for the Overview

Rename each sheet by double-clicking its tab at the bottom.

**KPI Sales**
- Marks type: Text.
- Drag Sales CY onto Text. Drag Sales YoY onto Text too.
- Click Text on the Marks card, click the three dots, and lay it out as
  the big number on the first line and `<Sales YoY> vs last year` on the
  second line in a smaller size.
- Right-click Sales CY on the Marks card, Format, and set Display Units to
  Thousands (K) so it reads like $746K.

Make **KPI Profit**, **KPI Orders**, and **KPI Customers** the same way
with the matching CY and YoY fields. Duplicate the sheet (right-click the
tab, Duplicate) and swap the fields.

**Monthly sales and profit ratio**
- Drag Order Date to Columns. Click the pill's arrow and choose the
  discrete **Month** (the one that shows "May", not "May 2026").
- Drag Sales to Rows. Drag Profit Ratio to Rows next to it.
- Right-click the Profit Ratio pill on Rows and choose **Dual Axis**.
- On the Marks card, set the SUM(Sales) mark to **Bar** and the Profit
  Ratio mark to **Line**.
- Drag Is Selected Year to Filters and tick **True**.
- Right-click the right axis, Format, Numbers, Percentage, 0 decimals.

**Profit by state**
- Double-click State. Tableau draws a map.
- Marks type: Map. Drag Profit onto Color.
- Click Color, Edit Colors, pick **Orange-Blue Diverging**, tick
  **Use full color range**, and click Advanced to set the center to 0.
- Drag Sales, Profit, and Profit Ratio onto Tooltip.
- Drag Is Selected Year to Filters and tick True.

**Sales by segment and category**
- Drag Segment to Rows and Category to Columns.
- Marks type: Square. Drag Selected Metric onto Color and again onto Label.
- Drag Is Selected Year to Filters and tick True.
- Color: pick **Blue** sequential.

**Top products**
- Drag Product Name to Rows and Sales to Columns.
- Click the sort button on the toolbar so the biggest is on top.
- Drag Product Name to Filters. Open the **Top** tab, choose **By field**,
  Top, and pick the **Top N** parameter from the dropdown, by Sales, Sum.
- Drag Profit onto Color, Orange-Blue Diverging, centered at 0.
- Drag Is Selected Year to Filters and tick True.
- Right-click Is Selected Year on Filters and choose **Add to Context**,
  so the ranking uses the selected year's sales.

## 5. Sheets for Customers

**New and returning customers**
- Drag Order Date to Columns as discrete **Year**.
- Drag Customer ID to Rows. Click the pill's arrow, Measure, **Count (Distinct)**.
- Drag Customer Type LOD onto Color. Drag CNTD(Customer ID) onto Label.
- No year filter on this one. It shows all four years.

**Sales per customer by segment**
- Drag Segment to Rows and Sales per Customer to Columns.
- Drag Sales per Customer onto Label. Sort descending.
- Drag Is Selected Year to Filters and tick True.

**Top customers**
- Drag Customer Name to Rows and Sales to Columns. Sort descending.
- Drag Customer Name to Filters, Top tab, By field, Top, the Top N
  parameter, by Sales, Sum.
- Drag Profit Ratio onto Color, Orange-Blue Diverging, centered at 0.
- Drag Is Selected Year to Filters and tick True.
- Add Is Selected Year to context so the ranking uses the selected year.

**Sales and profit per customer**
- Drag Sales to Columns and Profit to Rows.
- Drag Customer ID onto Detail. Marks type: Circle. Drag Segment onto Color.
- Click Size and make the circles small. Click Color and set Opacity to 70%.
- Drag Customer Name onto Tooltip.
- Drag Is Selected Year to Filters and tick True.
- From the Analytics pane on the left, drag a **Constant Line** onto the
  Profit axis and set it to 0.

## 6. Sheets for Products

**Sub-category sales and profit**
- Drag Sub-Category to Rows and Sales to Columns. Sort descending.
- Drag Profit onto Color, Orange-Blue Diverging, centered at 0.
- Drag Profit onto Label.
- Drag Is Selected Year to Filters and tick True.

**Profit by discount level**
- Right-click Discount in the Data pane and choose **Convert to Dimension**.
- Drag Discount to Columns and Profit to Rows. Marks type: Bar.
- Drag Profit onto Color, Orange-Blue Diverging, centered at 0. Drag Profit
  onto Label.
- Drag Is Selected Year to Filters and tick True.
- Right-click the Discount axis, Format, Numbers, Percentage, 0 decimals.

**Return rate by sub-category**
- Drag Sub-Category to Rows and Return Rate to Columns. Sort descending.
- Drag Return Rate onto Label.
- Drag Is Selected Year to Filters and tick True.

**Category share by quarter**
- Drag Order Date to Columns as continuous **Quarter** (the one that shows
  "Q2 2026"). Drag Sales to Rows. Drag Category onto Color.
- Marks type: Area.
- No year filter. It shows all four years.

## 7. Dashboards

Click the **New Dashboard** button at the bottom (the icon with the plus and
a grid). At the bottom left of the Dashboard pane set **Size** to
**Fixed size**, 940 wide, 800 high, so it fits on the web page.

**Overview**
- Drag a **Text** object to the top and type `Superstore sales`. Click the
  Insert button in the text editor and add the Selected Year parameter, so
  the title reads `Superstore sales 2026` and changes with the picker.
- Drag the four KPI sheets in one row under the title.
- Under them, put Monthly sales and profit ratio on the left, two thirds
  wide, and Profit by state on the right.
- At the bottom, Sales by segment and category on the left and Top products
  on the right.
- Show the parameters: click the Monthly sheet on the dashboard, click its
  small arrow, **Parameters**, and tick Selected Year, Metric, and Top N.
  Tableau puts them on the right. Move them into one row under the title if
  there is room.
- Add filters the same way: sheet arrow, **Filters**, Region and Segment.
  Click each filter's arrow and choose **Apply to Worksheets**,
  **All Using This Data Source**.
- Click the Sales by segment and category sheet and click the funnel icon
  at its top right (**Use as Filter**). Now clicking a cell filters the page.
- Open the Top products and Top customers worksheets. Add Region and
  Segment to context on both, so the rankings use the filtered data.
  On Top products, also add the generated Action (Category, Segment)
  filter to context. If it is not visible yet, select a heatmap cell first.
  Check that Top N 10 still shows ten results when enough products or
  customers are available, then clear the selection.
- Right-click the sheet titles you do not need and hide them, and give each
  sheet a plain title, for example "Top products by sales".

**Customers**
- New dashboard, same fixed size.
- Title text `Customers`, with the Selected Year parameter inserted.
- Top row: New and returning customers on the left, Sales per customer by
  segment on the right.
- Bottom row: Top customers on the left, Sales and profit per customer on
  the right.
- Show the Selected Year and Top N parameters.

**Products**
- New dashboard, same fixed size.
- Title text `Products`, with the Selected Year parameter inserted.
- Top row: Sub-category sales and profit on the left, Profit by discount
  level on the right.
- Bottom row: Return rate by sub-category on the left, Category share by
  quarter on the right.
- Show the Selected Year parameter.

Then hide the worksheets so only the three dashboards show as tabs:
right-click each worksheet tab at the bottom and choose **Hide Sheet**.
Rename the dashboards to Overview, Customers, and Products.

## 8. Publish

1. Open the **File** menu and choose **Save to Tableau Public As**.
2. Sign in with the Tableau Public account.
3. Name the workbook `Superstore Sales Performance`. Click Save.
4. The browser opens the published report. Open **Settings** (the gear
   icon) and turn on **Show Sheets**, so the three tabs are visible.
5. Copy the link from the address bar. It looks like
   `https://public.tableau.com/views/SuperstoreSalesPerformance/Overview`.
   Cut off anything after the dashboard name, from `?` on.

## 9. Put it on the web page

1. Open `site/app.js` and set `TABLEAU_URL` to the link.
2. In Tableau Public, open each dashboard, open the **Dashboard** menu, and
   choose **Export Image**. Save them as `site/tableau/overview.png`,
   `site/tableau/customers.png`, and `site/tableau/products.png`.
3. Commit and push. The page shows the dashboard and the three images.

```bash
git add site/app.js site/tableau && git commit -m "Add the Tableau dashboard" && git push
```

# Four years of Superstore sales

[View the project](https://manisha-subedi.github.io/sales-dashboard/)

Superstore is a made-up office supplies company that ships with Tableau as
sample data. It has 10,194 order lines, 5,111 orders, and 804 customers,
from January 2023 to December 2026.

I built a Tableau dashboard on it, and a web page that shows the same
numbers as plain charts and lets you try a cap on discounts.

```
Order lines: 10,194
Orders: 5,111
Customers: 804
2025 vs 2024: sales +29.8%, profit +33.3%, customers +13.2%
2026 vs 2025: sales +21.4%, profit +16.0%, customers +7.8%
Profit ratio with no discount: 29.6%
Profit ratio with a discount over 40%: -77.4%
```

## The Tableau dashboard

Three pages, built in Tableau Public from one flat CSV that the build writes.

1. Overview: four KPI tiles with growth against the year before, monthly
   sales with the profit ratio on a second axis, a map of profit by state,
   sales by segment and category, and the top N products.
2. Customers: new and returning customers by year, sales per customer by
   segment, the top N customers coloured by profit ratio, and sales
   against profit for every customer.
3. Products: sub-category sales coloured by profit, profit by discount
   level, return rate by sub-category, and category share by quarter.

The pages share a year parameter, a metric parameter, a top N parameter,
and filters for region and segment. Clicking a segment filters the page.

`tableau/GUIDE.md` lists every parameter and calculated field, and the
steps to build the workbook.

## Run the project

```bash
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
python build.py
pytest
python -m http.server --directory site
```

`build.py` downloads the Excel file from Tableau, writes the three sheets
as CSV, builds the tables in `sales.duckdb`, and writes four JSON files to
`site/data/` and one CSV to `tableau/data/`.

## Data model

| Table | Rows | What it is |
|---|---|---|
| `dim_date` | 1,464 | every day from the first order to the last shipment |
| `dim_customer` | 804 | name, segment, and the date of the first order |
| `dim_product` | 1,862 | name, category, sub-category |
| `fact_sales` | 10,194 | one row per order line |
| `kpi_year` | 4 | sales, profit, orders, customers, and growth per year |
| `kpi_month` | 48 | sales, profit, and profit ratio per month |

Returns and regional managers are joined onto the fact table.

Two things in the source needed care. 32 product ids carry two different
names, so `dim_product` keeps the name that appears most often and counts
the names. The returns sheet lists some orders twice, so it is
deduplicated before the join.

A customer is new in the year of their first order and returning after
that. Tableau computes the same thing with a fixed level of detail
expression, so the two can be checked against each other.

## The discount cap

Every order line has a discount between 0 and 80 percent. `list_sales` is
what the line would have cost with no discount. The page lets you pick a
cap, and every line above it is recomputed as if it had the capped discount.
Cost stays the same, so the extra revenue goes to profit.

This assumes the customers would still have bought at the smaller discount,
which is not certain. It shows how much the big discounts cost, not what a
new policy would earn.

## Tests

```bash
pytest
```

The tests cover row counts, keys, date gaps, the product name issue, the
returns join, the new customer rule, list sales, the growth numbers, and
that big discounts lose money.

## Data source

Sample - Superstore, the sample dataset that ships with Tableau. The build
downloads it from public.tableau.com.

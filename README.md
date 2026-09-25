# Four years of Superstore sales

[View the project](https://manisha-subedi.github.io/sales-dashboard/)

This project uses Tableau's Superstore sample data, which represents a
fictional retailer. It covers 10,194 order lines, 5,111 orders and 804
customers from January 2023 to December 2026.

I used DuckDB and SQL to prepare the data and built a three-page Tableau
report. The project website includes the report, charts and a calculator
for comparing different discount limits.

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

[Open the report in Tableau Public](https://public.tableau.com/views/SuperstoreSalesPerformance_17903055112520/Overview)

The report uses a CSV exported by the build script and has three pages.

1. Overview shows sales, profit, orders and customers with year-on-year
   changes. Charts compare monthly results, states, segments and products.
2. Customers compares new and returning customers, sales per customer and
   the highest-spending customers.
3. Products compares sales, profit and return rates by product group,
   profit at each discount level and category sales over time.

The year selection applies across the report. Region and segment filters
on Overview also apply to the other pages. The Top N control sets how many
products or customers appear in the rankings. Clicking a cell in the
segment and category chart filters the other charts on Overview.

[The Tableau guide](tableau/GUIDE.md) lists the calculations, filters and
steps used to build the report. `tableau/Superstore Sales Performance.twbx`
is the packaged workbook, and `site/tableau/` holds an image of each page.

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

The source has 32 product IDs with more than one name. `dim_product` keeps
the most common name for each ID and records how many names appeared.
Duplicate return records are removed before joining them to sales.

A customer is new in the year of their first recorded order and returning
in later years. Tableau uses the first-order date calculated from the full
dataset, so changing a region filter does not change that classification.

## The discount cap

Every order line has a discount between 0 and 80 percent. `list_sales` is
its value before the discount. The calculator applies a chosen maximum to
order lines with a higher discount and recalculates sales and profit.
Costs and quantities stay unchanged.

This assumes customers would buy the same quantities at a higher price.
Some might buy less or not buy at all. The result is a comparison under
these assumptions, not a profit forecast.

## Tests

```bash
pytest
```

The tests check row counts, keys, date coverage, product names, return
records, customer classification, prices before discounts and growth
figures. They also check the total loss on heavily discounted order lines.

## Data source

Sample - Superstore, the sample dataset that ships with Tableau. The build
downloads it from public.tableau.com.

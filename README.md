# Sales performance dashboard

[View the project](https://manisha-subedi.github.io/sales-dashboard/)

This project uses a practice sales dataset for a technology company. It has
10,000 order lines, 4,596 orders, and 795 customers across 15 European
countries from January 2020 to December 2023.

I used the data to build a two-page Tableau dashboard and a simple web report.
Both show sales, profit, orders, customers, and the parts of the business that
changed sales from one year to the next.

```
Order lines: 10,000
Orders: 4,596
Customers: 795
2023 vs 2022: sales +36.2%, profit +30.9%, orders +26.7%, customers +6.0%
Biggest segment: Consumer, $1.53M of $2.94M
Biggest countries: France, Germany, United Kingdom
Countries with negative profit: Netherlands, Sweden, Ireland, Portugal, Denmark
```

## The Tableau dashboard

The Tableau Public report has two pages and reads one flat CSV made by the
build script.

[Open the dashboard in Tableau Public](https://public.tableau.com/views/ExecutiveSalesPerformanceDashboard_17906958124760/ExecutiveSummary?:showVizHome=no)

1. The executive summary compares sales, profit, orders, and customers with
   the previous year. It also shows monthly results, segment and category
   comparisons, and a map of Europe. The year and metric controls update the
   page. Selecting a country filters the report.
2. The customer page shows new and returning customers, the top customers,
   and profit by sub-category.

`tableau/GUIDE.md` lists the parameters and calculated fields, and the
steps to build the workbook. `tableau/original-dashboard.png` is the first
version of the dashboard, which this one follows.

## Run the project

```bash
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
python build.py
pytest
python -m http.server --directory site
```

`build.py` builds the tables in `sales.duckdb`, writes four JSON files to
`site/data/`, and one CSV to `tableau/data/`.

## Data model

| Table | Rows | What it is |
|---|---|---|
| `dim_date` | 1,461 | every day from the first order to the last |
| `dim_customer` | 795 | name, segment, and the date of the first order |
| `dim_geo` | 127 | state, country, and the company's sales region |
| `fact_sales` | 10,000 | one row per order line |
| `kpi_year` | 4 | sales, profit, orders, customers, and growth per year |
| `kpi_month` | 48 | sales, profit, orders, and customers per month |
| `customer_year` | 2,503 | sales per customer per year |

The source needed a few checks. Dates use day-month-year format. Two manual
year markers were removed because the year can be taken from the order date.
Some order IDs appear with more than one customer or date, so orders are
counted as distinct IDs, as they were in the original dashboard.

A customer is new in the year of their first order and returning after that.
Tableau calculates the same result with a fixed level of detail expression,
which gives a second way to check the classification.

## What changed sales

Sales grew every year while the number of customers changed very little. For
each year, customers are grouped as new, back after a year away, returning
and spending more, returning and spending less, or not ordering. The changes
from the five groups add up to the total change in sales. A test checks this.

In 2023, returning customers who spent more added $497k. Customers who came
back after a year away added another $185k. Only five customers were new.

## Tests

```bash
pytest
```

The tests check row counts, keys, the country mapping, missing dates, the new
customer rule, the main growth numbers, and whether the customer groups add
up to the change in sales.

## Data source

A practice dataset used in Tableau training. Both files are in `data/`.

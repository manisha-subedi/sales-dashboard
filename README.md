# Four years of sales at a tech company

[View the project](https://manisha-subedi.github.io/sales-dashboard/)

The data is 10,000 order lines from a practice dataset about a tech company
that sells hardware, software, and services in 15 European countries, from
January 2020 to December 2023. It has 4,596 orders and 795 customers.

I built a Tableau dashboard on it for an executive audience, and a web page
that shows the same numbers as plain charts and splits each year's growth
by who caused it.

```
Order lines: 10,000
Orders: 4,596
Customers: 795
2023 vs 2022: sales +36.2%, profit +30.9%, orders +26.7%, customers +6.0%
Biggest segment: Consumer, $1.53M of $2.94M
Biggest countries: France, Germany, United Kingdom
Countries that lose money: Netherlands, Sweden, Ireland, Portugal, Denmark
```

## The Tableau dashboard

Two pages, built in Tableau Public from one flat CSV that the build writes.

1. Executive summary: sales, profit, orders, and customers for the picked
   year, each with the year before and the change in percent, and a bar
   per month with the previous year as a mark. A metric picker drives the
   segment and category comparisons, each with small trend lines for the
   current and previous year, and a map of Europe. Clicking a country
   filters the page.
2. Customers: new and returning customers by year, the top customers, and
   profit by sub-category.

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

Three things in the source needed care. Dates are written day first. The
file has two columns that mark the current and last year by hand, and they
are dropped, the year comes from the order date. Some order ids appear with
more than one customer or date, so orders are counted as distinct ids, the
same way the original dashboard did.

A customer is new in the year of their first order and returning after
that. Tableau can compute the same thing with a fixed level of detail
expression, so the two can be checked against each other.

## Where the growth came from

Sales grew every year while the customer count barely moved. For each year,
every customer goes in one of five groups by comparing their sales with the
year before: new, came back after a year away, returning and spent more,
returning and spent less, or did not order. The sales change of each group
adds up to the total change, and a test checks that.

In 2023, returning customers who spent more added $497k and customers who
came back after a year away added $185k. Only 5 customers were new.

## Tests

```bash
pytest
```

The tests cover row counts, keys, the country mapping, date gaps, the new
customer rule, the headline growth numbers, and that the growth groups add
up to the change in sales.

## Data source

A practice dataset used in Tableau training. Both files are in `data/`.

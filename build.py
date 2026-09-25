"""Build the tables and the numbers the page reads. Run: python build.py"""

import csv
import json
import urllib.request
from pathlib import Path

import duckdb
import xlrd

URL = "https://public.tableau.com/app/sample-data/sample_-_superstore.xls"
XLS = Path("data/superstore.xls")
DB = "sales.duckdb"
OUT = Path("site/data")
TABLEAU = Path("tableau/data/superstore_clean.csv")


def fetch():
    if XLS.exists():
        return
    XLS.parent.mkdir(exist_ok=True)
    print(f"downloading {XLS.name}")
    urllib.request.urlretrieve(URL, XLS)


def sheets_to_csv():
    """The xls has three sheets. Write one csv each, with dates as YYYY-MM-DD."""
    book = xlrd.open_workbook(XLS)
    for sheet in book.sheets():
        header = [str(c.value) for c in sheet.row(0)]
        path = XLS.parent / (sheet.name.lower() + ".csv")
        with open(path, "w", newline="") as f:
            out = csv.writer(f)
            out.writerow(header)
            for r in range(1, sheet.nrows):
                row = []
                for name, cell in zip(header, sheet.row(r)):
                    if cell.ctype == xlrd.XL_CELL_EMPTY:
                        row.append("")
                    elif name.endswith("Date"):
                        row.append(xlrd.xldate_as_datetime(cell.value, book.datemode).date().isoformat())
                    elif cell.ctype == xlrd.XL_CELL_NUMBER and cell.value == int(cell.value):
                        row.append(int(cell.value))
                    else:
                        row.append(cell.value)
                out.writerow(row)
        print(f"wrote {path} ({sheet.nrows - 1} rows)")


def build(con):
    for path in sorted(Path("sql").glob("*.sql")):
        con.execute(path.read_text())
        print(f"ran {path.name}")


def rows(con, sql):
    result = con.execute(sql)
    cols = [d[0] for d in result.description]
    return [dict(zip(cols, r)) for r in result.fetchall()]


def export(con):
    OUT.mkdir(parents=True, exist_ok=True)

    totals = rows(con, """
        select count(*) as lines, count(distinct order_id) as orders,
               count(distinct customer_id) as customers, count(distinct product_id) as products,
               min(order_date) as first_order, max(order_date) as last_order,
               sum(sales) as sales, sum(profit) as profit
        from fact_sales
    """)[0]
    years = rows(con, "select * from kpi_year")
    monthly = rows(con, "select * from kpi_month")

    def grouped(col, join=""):
        return rows(con, f"""
            select year(f.order_date) as year, {col} as label,
                   sum(f.sales) as sales, sum(f.profit) as profit, count(*) as lines,
                   count(distinct f.order_id) as orders, count(distinct f.customer_id) as customers,
                   count(distinct case when f.returned then f.order_id end) as returned_orders
            from fact_sales f {join}
            group by 1, 2 order by 1, 3 desc
        """)

    breakdowns = {
        "segment": grouped("c.segment", "join dim_customer c using (customer_id)"),
        "category": grouped("p.category", "join dim_product p using (product_id)"),
        "sub_category": grouped("p.sub_category", "join dim_product p using (product_id)"),
        "region": grouped("f.region"),
        "discount_band": grouped("f.discount_band"),
        "customer_type": grouped("f.customer_type"),
        "products": rows(con, """
            select year(f.order_date) as year, p.product_name as label,
                   sum(f.sales) as sales, sum(f.profit) as profit
            from fact_sales f join dim_product p using (product_id)
            group by 1, 2
        """),
    }

    # per discount level, so the page can try a cap on discounts
    discount = rows(con, """
        select year(order_date) as year, discount,
               count(*) as lines, sum(sales) as sales, sum(profit) as profit, sum(list_sales) as list_sales
        from fact_sales group by 1, 2 order by 1, 2
    """)

    (OUT / "summary.json").write_text(json.dumps({"totals": totals, "years": years}, indent=1, default=str))
    (OUT / "monthly.json").write_text(json.dumps(monthly, default=str))
    (OUT / "breakdowns.json").write_text(json.dumps(breakdowns, default=str))
    (OUT / "discount.json").write_text(json.dumps(discount, default=str))
    print(f"wrote {len(list(OUT.glob('*.json')))} files to {OUT}")


def export_tableau(con):
    """One flat csv for Tableau, with the column names Tableau users expect."""
    TABLEAU.parent.mkdir(parents=True, exist_ok=True)
    con.execute(f"""
        copy (
            select f.row_id as "Row ID", f.order_id as "Order ID", f.order_date as "Order Date",
                   f.ship_date as "Ship Date", f.ship_days as "Ship Days", f.ship_mode as "Ship Mode",
                   f.customer_id as "Customer ID", c.customer_name as "Customer Name", c.segment as "Segment",
                   f.customer_type as "Customer Type", c.first_order_date as "First Order Date",
                   f.region as "Region", f.manager as "Regional Manager", 'United States' as "Country",
                   f.state as "State", f.city as "City", f.postal_code as "Postal Code",
                   f.product_id as "Product ID", p.product_name as "Product Name",
                   p.category as "Category", p.sub_category as "Sub-Category",
                   f.sales as "Sales", f.quantity as "Quantity", f.discount as "Discount",
                   f.discount_band as "Discount Band", f.profit as "Profit", f.list_sales as "List Sales",
                   case when f.returned then 'Yes' else 'No' end as "Returned"
            from fact_sales f
            join dim_customer c using (customer_id)
            join dim_product p using (product_id)
            order by f.row_id
        ) to '{TABLEAU}' (header, delimiter ',')
    """)
    print(f"wrote {TABLEAU}")


def report(con):
    def value(sql):
        return con.execute(sql).fetchone()[0]

    print()
    print("order lines:", value("select count(*) from fact_sales"))
    print("orders:", value("select count(distinct order_id) from fact_sales"))
    print("customers:", value("select count(*) from dim_customer"))
    print("product ids with two names:", value("select count(*) from dim_product where names > 1"))
    print("returned orders:", value("select count(distinct order_id) from fact_sales where returned"))
    for r in con.execute("select year, round(sales), round(profit), round(100 * sales_yoy, 1), round(100 * profit_yoy, 1), round(100 * customers_yoy, 1) from kpi_year").fetchall():
        print(f"{r[0]}: sales {r[1]:,.0f}, profit {r[2]:,.0f}, sales yoy {r[3]}%, profit yoy {r[4]}%, customers yoy {r[5]}%")
    for band, ratio in con.execute("select discount_band, round(100 * sum(profit) / sum(sales), 1) from fact_sales group by 1 order by min(discount)").fetchall():
        print(f"discount {band}: profit ratio {ratio}%")


def main():
    fetch()
    sheets_to_csv()
    con = duckdb.connect(DB)
    build(con)
    export(con)
    export_tableau(con)
    report(con)


if __name__ == "__main__":
    main()

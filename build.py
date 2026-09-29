"""Build the tables and the numbers the page reads. Run: python build.py"""

import json
from pathlib import Path

import duckdb

DB = "sales.duckdb"
OUT = Path("site/data")
TABLEAU = Path("tableau/data/tech_company_sales_clean.csv")


def build(con):
    for path in sorted(Path("sql").glob("*.sql")):
        con.execute(path.read_text())
        print(f"ran {path.name}")


def rows(con, sql, params=()):
    result = con.execute(sql, params)
    cols = [d[0] for d in result.description]
    return [dict(zip(cols, r)) for r in result.fetchall()]


def export(con):
    OUT.mkdir(parents=True, exist_ok=True)

    totals = rows(con, """
        select count(*) as lines, count(distinct order_id) as orders,
               count(distinct customer_id) as customers, count(distinct country) as countries,
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
                   count(distinct f.order_id) as orders, count(distinct f.customer_id) as customers
            from fact_sales f {join}
            group by 1, 2 order by 1, 3 desc
        """)

    breakdowns = {
        "segment": grouped("c.segment", "join dim_customer c using (customer_id)"),
        "category": grouped("f.category"),
        "sub_category": grouped("f.sub_category"),
        "country": grouped("f.country"),
        "ship_mode": grouped("f.ship_mode"),
        "customer_type": grouped("f.customer_type"),
        "customers": rows(con, """
            select year(f.order_date) as year, c.customer_name as label, c.segment,
                   sum(f.sales) as sales, sum(f.profit) as profit
            from fact_sales f join dim_customer c using (customer_id)
            group by 1, 2, 3
        """),
    }

    # who caused each year's change in sales: new customers, customers who came
    # back after a gap, returning customers who spent more or less, and lost ones
    growth = []
    for year in [y["year"] for y in years][1:]:
        growth += rows(con, """
            with cy as (select customer_id, sales from customer_year where year = ?),
                 py as (select customer_id, sales from customer_year where year = ?)
            select ? as year, c.segment,
                   case when py.customer_id is null and year(c.first_order_date) = ? then 'new'
                        when py.customer_id is null then 'back'
                        when cy.customer_id is null then 'lost'
                        when cy.sales >= py.sales then 'up'
                        else 'down' end as kind,
                   count(*) as customers,
                   sum(coalesce(cy.sales, 0) - coalesce(py.sales, 0)) as delta
            from cy full outer join py using (customer_id)
            join dim_customer c using (customer_id)
            group by 1, 2, 3 order by 1, 2, 3
        """, [year, year - 1, year, year])

    (OUT / "summary.json").write_text(json.dumps({"totals": totals, "years": years}, indent=1, default=str))
    (OUT / "monthly.json").write_text(json.dumps(monthly, default=str))
    (OUT / "breakdowns.json").write_text(json.dumps(breakdowns, default=str))
    (OUT / "growth.json").write_text(json.dumps(growth, default=str))
    print(f"wrote {len(list(OUT.glob('*.json')))} files to {OUT}")


def export_tableau(con):
    """One flat csv for Tableau, with the column names Tableau users expect."""
    TABLEAU.parent.mkdir(parents=True, exist_ok=True)
    con.execute(f"""
        copy (
            select f.order_id as "Order ID", f.order_date as "Order Date",
                   f.customer_id as "Customer ID", c.customer_name as "Customer Name", c.segment as "Segment",
                   f.customer_type as "Customer Type", c.first_order_date as "First Order Date",
                   f.category as "Category", f.sub_category as "Sub-Category", f.ship_mode as "Ship Mode",
                   f.state as "State", f.country as "Country", f.region as "Region",
                   f.sales as "Sales", f.profit as "Profit"
            from fact_sales f
            join dim_customer c using (customer_id)
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
    print("countries:", value("select count(distinct country) from dim_geo"))
    for r in con.execute("""
        select year, round(sales), round(profit), orders, customers,
               round(100 * sales_yoy, 1), round(100 * profit_yoy, 1), round(100 * orders_yoy, 1), round(100 * customers_yoy, 1)
        from kpi_year
    """).fetchall():
        print(f"{r[0]}: sales {r[1]:,.0f}, profit {r[2]:,.0f}, orders {r[3]}, customers {r[4]}, "
              f"yoy sales {r[5]}%, profit {r[6]}%, orders {r[7]}%, customers {r[8]}%")


def main():
    con = duckdb.connect(DB)
    build(con)
    export(con)
    export_tableau(con)
    report(con)


if __name__ == "__main__":
    main()

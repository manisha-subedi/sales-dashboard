import json

import duckdb
import pytest


@pytest.fixture(scope="module")
def con():
    return duckdb.connect("sales.duckdb", read_only=True)


def value(con, sql):
    return con.execute(sql).fetchone()[0]


def test_every_order_line_is_in_the_fact_table(con):
    assert value(con, "select count(*) from fact_sales") == value(con, "select count(*) from stg_sales")
    assert value(con, "select count(*) - count(distinct row_id) from fact_sales") == 0


def test_every_key_resolves(con):
    for col, dim, key in [("customer_id", "dim_customer", "customer_id"),
                          ("state", "dim_geo", "state"),
                          ("order_date", "dim_date", "date")]:
        missing = value(con, f"select count(*) from fact_sales f left join {dim} d on d.{key} = f.{col} where d.{key} is null")
        assert missing == 0, f"{col} has {missing} rows with no match in {dim}"


def test_every_state_has_a_country(con):
    assert value(con, "select count(*) from dim_geo where country is null") == 0
    assert value(con, "select count(*) - count(distinct state) from dim_geo") == 0


def test_dates_have_no_gaps(con):
    lo, hi, n = con.execute("select min(date), max(date), count(*) from dim_date").fetchone()
    assert (hi - lo).days + 1 == n


def test_each_customer_is_new_in_exactly_one_year(con):
    bad = value(con, """
        select count(*) from (
            select customer_id, count(distinct year(order_date)) as years
            from fact_sales where customer_type = 'New' group by 1
        ) where years <> 1
    """)
    assert bad == 0


def test_headline_numbers(con):
    assert value(con, "select count(*) from fact_sales") == 10000
    assert value(con, "select count(distinct order_id) from fact_sales") == 4596
    assert value(con, "select count(*) from dim_customer") == 795
    row = con.execute("select sales_yoy, profit_yoy, orders_yoy, customers_yoy from kpi_year where year = 2023").fetchone()
    assert [round(100 * v, 1) for v in row] == [36.2, 30.9, 26.7, 6.0]


def test_growth_pieces_add_up_to_the_change_in_sales(con):
    growth = json.loads(open("site/data/growth.json").read())
    for year in (2021, 2022, 2023):
        pieces = sum(g["delta"] for g in growth if g["year"] == year)
        change = value(con, f"select sales - lag(sales) over (order by year) from kpi_year qualify year = {year}")
        assert abs(pieces - change) < 1e-6

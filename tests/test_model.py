import duckdb
import pytest


@pytest.fixture(scope="module")
def con():
    return duckdb.connect("sales.duckdb", read_only=True)


def value(con, sql):
    return con.execute(sql).fetchone()[0]


def test_every_order_line_is_in_the_fact_table(con):
    assert value(con, "select count(*) from fact_sales") == value(con, "select count(*) from stg_orders")
    assert value(con, "select count(*) - count(distinct row_id) from fact_sales") == 0


def test_every_key_resolves(con):
    for col, dim, key in [("customer_id", "dim_customer", "customer_id"),
                          ("product_id", "dim_product", "product_id"),
                          ("order_date", "dim_date", "date")]:
        missing = value(con, f"select count(*) from fact_sales f left join {dim} d on d.{key} = f.{col} where d.{key} is null")
        assert missing == 0, f"{col} has {missing} rows with no match in {dim}"


def test_dates_have_no_gaps(con):
    lo, hi, n = con.execute("select min(date), max(date), count(*) from dim_date").fetchone()
    assert (hi - lo).days + 1 == n


def test_one_row_per_product_id(con):
    assert value(con, "select count(*) - count(distinct product_id) from dim_product") == 0
    # the source really has ids with two names. the build must notice, not hide it
    assert value(con, "select count(*) from dim_product where names > 1") > 0


def test_returns_match_the_returns_sheet(con):
    in_fact = value(con, "select count(distinct order_id) from fact_sales where returned")
    in_sheet = value(con, "select count(*) from stg_returns r where exists (select 1 from stg_orders o where o.order_id = r.order_id)")
    assert in_fact == in_sheet


def test_each_customer_is_new_in_exactly_one_year(con):
    bad = value(con, """
        select count(*) from (
            select customer_id, count(distinct year(order_date)) as years
            from fact_sales where customer_type = 'New' group by 1
        ) where years <> 1
    """)
    assert bad == 0


def test_list_sales_is_never_below_sales(con):
    assert value(con, "select count(*) from fact_sales where list_sales < sales - 1e-9") == 0
    assert value(con, "select max(abs(list_sales - sales)) from fact_sales where discount = 0") < 1e-9


def test_headline_numbers(con):
    assert value(con, "select count(*) from fact_sales") == 10194
    assert value(con, "select count(distinct order_id) from fact_sales") == 5111
    assert value(con, "select count(*) from dim_customer") == 804
    assert round(100 * value(con, "select sales_yoy from kpi_year where year = 2025"), 1) == 29.8
    assert round(100 * value(con, "select profit_yoy from kpi_year where year = 2025"), 1) == 33.3


def test_big_discounts_lose_money(con):
    assert value(con, "select sum(profit) from fact_sales where discount = 0") > 0
    assert value(con, "select sum(profit) from fact_sales where discount >= 0.4") < 0

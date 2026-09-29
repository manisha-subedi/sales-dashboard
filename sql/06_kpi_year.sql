-- one row per year with growth against the year before
create or replace table kpi_year as
with y as (
    select year(order_date) as year,
           sum(sales) as sales,
           sum(profit) as profit,
           count(distinct order_id) as orders,
           count(distinct customer_id) as customers,
           count(distinct case when customer_type = 'New' then customer_id end) as new_customers
    from fact_sales
    group by 1
)
select *,
       profit / sales as profit_ratio,
       sales / lag(sales) over (order by year) - 1 as sales_yoy,
       profit / lag(profit) over (order by year) - 1 as profit_yoy,
       orders::double / lag(orders) over (order by year) - 1 as orders_yoy,
       customers::double / lag(customers) over (order by year) - 1 as customers_yoy
from y
order by year;

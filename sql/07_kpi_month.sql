-- one row per month
create or replace table kpi_month as
select d.year, d.month, d.year_month,
       sum(f.sales) as sales,
       sum(f.profit) as profit,
       sum(f.profit) / sum(f.sales) as profit_ratio,
       count(distinct f.order_id) as orders,
       count(distinct f.customer_id) as customers
from fact_sales f
join dim_date d on d.date = f.order_date
group by 1, 2, 3
order by 3;

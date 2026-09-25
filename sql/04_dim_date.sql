-- every day from the first order to the last, no gaps
create or replace table dim_date as
select d::date as date,
       year(d) as year,
       quarter(d) as quarter,
       month(d) as month,
       strftime(d, '%Y-%m') as year_month,
       strftime(d, '%b') as month_name
from generate_series(
    (select min(order_date) from stg_sales),
    (select max(order_date) from stg_sales),
    interval 1 day
) t(d);

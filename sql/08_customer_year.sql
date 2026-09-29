-- sales per customer per year, so the growth can be split by who caused it
create or replace table customer_year as
select customer_id, year(order_date) as year, sum(sales) as sales
from fact_sales
group by 1, 2;

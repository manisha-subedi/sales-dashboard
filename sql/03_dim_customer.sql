-- one row per customer, with the date of their first order
create or replace table dim_customer as
select customer_id,
       any_value(customer_name) as customer_name,
       any_value(segment) as segment,
       min(order_date) as first_order_date,
       count(distinct order_id) as orders
from stg_sales
group by 1;

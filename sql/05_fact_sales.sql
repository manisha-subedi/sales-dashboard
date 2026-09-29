-- one row per order line. a customer is new in the year of their first order
create or replace table fact_sales as
select s.row_id, s.order_id, s.order_date, s.customer_id,
       s.category, s.sub_category, s.ship_mode,
       s.state, g.country, g.region,
       s.sales, s.profit,
       case when year(s.order_date) = year(c.first_order_date) then 'New' else 'Returning' end as customer_type
from stg_sales s
join dim_customer c using (customer_id)
join dim_geo g using (state);

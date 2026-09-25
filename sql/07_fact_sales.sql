-- one row per order line. list_sales is what the line would have cost
-- with no discount, so the page can try other discount rules on it
create or replace table fact_sales as
select o.row_id, o.order_id, o.order_date, o.ship_date,
       date_diff('day', o.order_date, o.ship_date) as ship_days,
       o.ship_mode, o.customer_id, o.product_id,
       o.region, p.manager, o.state, o.city, o.postal_code,
       o.sales, o.quantity, o.discount,
       case when o.discount = 0 then 'none'
            when o.discount <= 0.2 then 'up to 20%'
            when o.discount <= 0.4 then '21 to 40%'
            else 'over 40%' end as discount_band,
       o.profit,
       o.sales / (1 - o.discount) as list_sales,
       r.order_id is not null as returned,
       case when year(o.order_date) = year(c.first_order_date) then 'New' else 'Returning' end as customer_type
from stg_orders o
join dim_customer c using (customer_id)
left join stg_returns r using (order_id)
left join stg_people p using (region);

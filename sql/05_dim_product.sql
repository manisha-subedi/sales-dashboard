-- one row per product id. some ids carry two names in the source,
-- so we keep the name that appears most often and count the names
create or replace table dim_product as
select product_id, product_name, category, sub_category, names
from (
    select product_id, product_name,
           any_value(category) as category,
           any_value(sub_category) as sub_category,
           count(*) over (partition by product_id) as names,
           row_number() over (partition by product_id order by count(*) desc, product_name) as rank
    from stg_orders
    group by 1, 2
)
where rank = 1;

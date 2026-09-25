-- one row per order line, with short names and proper types
create or replace table stg_orders as
select
    "Row ID"::integer as row_id,
    "Order ID" as order_id,
    "Order Date"::date as order_date,
    "Ship Date"::date as ship_date,
    "Ship Mode" as ship_mode,
    "Customer ID" as customer_id,
    trim("Customer Name") as customer_name,
    "Segment" as segment,
    "Country/Region" as country,
    "City" as city,
    "State/Province" as state,
    case when "Postal Code" is null then null else lpad("Postal Code"::varchar, 5, '0') end as postal_code,
    "Region" as region,
    "Product ID" as product_id,
    "Category" as category,
    "Sub-Category" as sub_category,
    trim("Product Name") as product_name,
    "Sales"::double as sales,
    "Quantity"::integer as quantity,
    "Discount"::double as discount,
    "Profit"::double as profit
from read_csv('data/orders.csv', header = true);

-- one row per order line, with short names and proper types.
-- the two Filter columns are dropped, they hard-code 2023 as the current year
create or replace table stg_sales as
select
    row_number() over (order by "Order Date", "Order ID", "Customer ID", "Sub-Category") as row_id,
    "Order ID" as order_id,
    "Order Date"::date as order_date,
    "Customer ID" as customer_id,
    trim("Customer Name") as customer_name,
    "Segment" as segment,
    "Category" as category,
    "Sub-Category" as sub_category,
    "Ship Mode" as ship_mode,
    trim("State") as state,
    "Region" as region,
    "Sales"::double as sales,
    "Profit"::double as profit
from read_csv('data/tech_company_sales.csv', header = true, dateformat = '%d/%m/%Y');

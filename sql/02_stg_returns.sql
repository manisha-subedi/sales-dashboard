-- orders that came back. the sheet lists some order ids more than once
create or replace table stg_returns as
select distinct "Order ID" as order_id
from read_csv('data/returns.csv', header = true)
where "Returned" = 'Yes';

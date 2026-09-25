-- one row per state, with its country from the mapping file
-- and the company's own sales region
create or replace table dim_geo as
select s.state,
       m."Correct State" as country,
       any_value(s.region) as region
from (select distinct state, region from stg_sales) s
left join read_csv('data/state_mapping.csv', header = true) m on m."State" = s.state
group by 1, 2;

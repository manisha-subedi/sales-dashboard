-- one manager per region
create or replace table stg_people as
select "Regional Manager" as manager, "Region" as region
from read_csv('data/people.csv', header = true);

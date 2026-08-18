update products set category = 'Vitaminas'    where category = 'Vitamins';
update products set category = 'Proteinas'    where category = 'Protein';
update products set category = 'Amino Acidos' where category = 'Amino Acids';
select category, count(*) from products where is_active group by 1 order by 2 desc;
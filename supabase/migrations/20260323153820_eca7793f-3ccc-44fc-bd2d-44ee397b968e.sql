INSERT INTO chart_of_accounts (sort_order, row_type, label, nr, grp)
VALUES (9, 'acct', 'Mellemregning med andre banker', 1950, 'grp2');

-- Bump existing sort_orders >= 9 to make room (except the one we just inserted)
UPDATE chart_of_accounts SET sort_order = sort_order + 1 
WHERE sort_order >= 9 AND nr IS DISTINCT FROM 1950;
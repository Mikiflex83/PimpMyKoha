-- KohaTools V3.42 · Cartographie adhérents · MODÈLE SELECT-ONLY
-- Adapter uniquement les champs d'adresse à votre politique de minimisation / DPO.
SELECT borrowernumber AS Patron_ID, branchcode AS Library, city AS City, zipcode AS Zipcode
FROM borrowers
WHERE borrowernumber > <<Après ID>>
ORDER BY borrowernumber
LIMIT 1000;

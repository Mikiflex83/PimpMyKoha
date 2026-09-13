-- QUALITÉ KOHA V1 · SIGNATURES BIBLIOGRAPHIQUES
-- Rapport READ-ONLY. Aucun UPDATE/DELETE/INSERT.
-- Paramètre demandé par Koha : <<Après ID>>
-- Le module appelle ce rapport par clé croissante et envoie 0 au premier lot.

SELECT
    b.biblionumber AS Biblio_ID,
    b.title AS Title,
    b.author AS Author,
    bi.isbn AS ISBN,
    bi.issn AS ISSN,
    COALESCE(NULLIF(bi.publicationyear, ''), b.copyrightdate) AS Publication_Year,
    b.frameworkcode AS Framework,
    b.timestamp AS Modified
FROM biblio b
LEFT JOIN biblioitems bi
    ON bi.biblionumber = b.biblionumber
WHERE b.biblionumber > <<Après ID>>
ORDER BY b.biblionumber
LIMIT 1000;

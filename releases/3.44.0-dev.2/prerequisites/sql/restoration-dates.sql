-- KohaTools V3.42 · Restauration · plage de dates · SELECT-ONLY
SELECT i.itemnumber AS Item_ID, i.barcode AS Barcode, i.biblionumber AS Biblio_ID, b.title AS Title, i.dateaccessioned AS Date_Accession
FROM items i LEFT JOIN biblio b ON b.biblionumber=i.biblionumber
WHERE i.dateaccessioned BETWEEN <<Date début|date>> AND <<Date fin|date>>
ORDER BY i.dateaccessioned, i.itemnumber;

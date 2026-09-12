-- KohaTools V3.42 · Restauration · recherche par code-barres · SELECT-ONLY
SELECT i.itemnumber AS Item_ID, i.barcode AS Barcode, i.biblionumber AS Biblio_ID, b.title AS Title, i.homebranch AS Home_Library, i.holdingbranch AS Holding_Library
FROM items i LEFT JOIN biblio b ON b.biblionumber=i.biblionumber
WHERE i.barcode = <<Code-barres>>;

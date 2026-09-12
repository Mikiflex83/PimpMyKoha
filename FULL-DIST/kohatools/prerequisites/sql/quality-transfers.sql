-- Qualité Koha — Module 04 Transferts
-- Rapport read-only, à enregistrer dans Koha puis renseigner son ID dans le module.
-- Paramètre unique : <<Après ID>>
-- Le module appelle ce rapport en pagination keyset.

SELECT
    bt.branchtransfer_id AS Transfer_ID,
    bt.itemnumber AS Item_ID,
    i.biblionumber AS Biblio_ID,
    i.barcode AS Barcode,
    b.title AS Title,
    bt.frombranch AS From_Site,
    bt.tobranch AS To_Site,
    bt.daterequested AS Requested,
    bt.datesent AS Sent,
    bt.datearrived AS Arrived,
    bt.datecancelled AS Cancelled,
    bt.reason AS Reason,
    bt.cancellation_reason AS Cancellation_reason,
    i.homebranch AS Home_Library,
    i.holdingbranch AS Holding_Library,
    i.datelastseen AS Last_Seen,
    COALESCE(i.itemlost,0) AS Lost_Status,
    COALESCE(i.damaged,0) AS Damaged_Status,
    COALESCE(i.withdrawn,0) AS Withdrawn,
    COALESCE(i.notforloan,0) AS Not_For_Loan,
    CASE WHEN iss.issue_id IS NULL THEN 0 ELSE 1 END AS Checkout_Active,
    (
      SELECT COUNT(*)
      FROM reserves r
      WHERE r.itemnumber = bt.itemnumber
         OR (r.itemnumber IS NULL AND r.biblionumber = i.biblionumber)
    ) AS Active_Hold_Count
FROM branchtransfers bt
JOIN items i ON i.itemnumber = bt.itemnumber
LEFT JOIN biblio b ON b.biblionumber = i.biblionumber
LEFT JOIN issues iss ON iss.itemnumber = bt.itemnumber
WHERE bt.branchtransfer_id > <<Après ID>>
  AND bt.datearrived IS NULL
  AND bt.datecancelled IS NULL
ORDER BY bt.branchtransfer_id
LIMIT 1000;

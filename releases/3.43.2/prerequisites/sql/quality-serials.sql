-- Qualité Koha · Module 07 Périodiques
-- Rapport READ-ONLY, paginé par subscriptionid.
-- Paramètre Koha attendu : <<Après ID>>
-- Optimisation : on isole d'abord 500 abonnements, puis on agrège leurs fascicules.

SELECT
    s.subscriptionid AS Subscription_ID,
    s.biblionumber AS Biblio_ID,
    b.title AS Title,
    s.branchcode AS Library,
    s.startdate AS Start_Date,
    s.enddate AS End_Date,
    s.status AS Subscription_Status,
    COALESCE(s.closed,0) AS Closed,
    COALESCE(s.graceperiod,0) AS Grace_Days,
    s.reneweddate AS Renewed_Date,
    s.itemtype AS Item_Type,
    s.ccode AS Collection_Code,
    COUNT(se.serialid) AS Serial_Count,
    SUM(CASE WHEN se.status = 1 THEN 1 ELSE 0 END) AS Expected_Count,
    SUM(CASE
        WHEN se.status = 1
         AND se.planneddate IS NOT NULL
         AND se.planneddate < DATE_SUB(CURDATE(), INTERVAL COALESCE(s.graceperiod,0) DAY)
        THEN 1 ELSE 0 END) AS Overdue_Expected_Count,
    SUM(CASE WHEN se.status = 3 THEN 1 ELSE 0 END) AS Late_Count,
    SUM(CASE WHEN se.status = 7 THEN 1 ELSE 0 END) AS Claimed_Count,
    SUM(CASE WHEN se.status IN (4,41,42,43,44) THEN 1 ELSE 0 END) AS Missing_Count,
    MAX(CASE WHEN se.status = 2 THEN COALESCE(se.publisheddate,se.planneddate) END) AS Last_Arrived,
    MIN(CASE WHEN se.status = 1 THEN se.planneddate END) AS Oldest_Expected,
    MIN(CASE WHEN se.status = 7 THEN COALESCE(se.claimdate,se.planneddate) END) AS Oldest_Claimed,
    MAX(se.planneddate) AS Last_Planned
FROM (
    SELECT
        subscriptionid, biblionumber, branchcode, startdate, enddate, status,
        closed, graceperiod, reneweddate, itemtype, ccode
    FROM subscription
    WHERE subscriptionid > <<Après ID>>
    ORDER BY subscriptionid
    LIMIT 500
) s
LEFT JOIN biblio b ON b.biblionumber = s.biblionumber
LEFT JOIN serial se ON se.subscriptionid = s.subscriptionid
GROUP BY
    s.subscriptionid, s.biblionumber, b.title, s.branchcode, s.startdate, s.enddate,
    s.status, s.closed, s.graceperiod, s.reneweddate, s.itemtype, s.ccode
ORDER BY s.subscriptionid;

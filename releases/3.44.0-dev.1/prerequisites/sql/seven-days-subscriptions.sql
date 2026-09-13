-- KohaTools V3.42 · Ces 7 derniers jours · abonnements · SELECT-ONLY
SELECT branchcode AS Site, DATE(timestamp) AS Date, COUNT(*) AS Subscriptions
FROM borrowers
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY branchcode, DATE(timestamp)
ORDER BY Date, Site;

-- KohaTools V3.42 · Ces 7 derniers jours · circulation · SELECT-ONLY
-- Modèle générique : vérifier les événements disponibles dans statistics sur votre Koha.
SELECT branch AS Site, DATE(datetime) AS Date,
 SUM(type='issue') AS Issues, SUM(type='renew') AS Renews, SUM(type='return') AS Returns
FROM statistics
WHERE datetime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY branch, DATE(datetime)
ORDER BY Date, Site;

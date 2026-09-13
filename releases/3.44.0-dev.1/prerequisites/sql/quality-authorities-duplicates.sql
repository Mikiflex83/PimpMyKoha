-- KohaTools V3.42 · Autorités · doublons exacts
-- Paramètre : <<Après AuthID>> (0 au premier appel)
SELECT ah.authid AS AuthID, ah.authtypecode AS Type, ah.heading AS Vedette, ah.datecreated AS `Créée le`, ah.modification_time AS `Modifiée le`
FROM auth_header ah
JOIN (SELECT authtypecode, heading FROM auth_header GROUP BY authtypecode, heading HAVING COUNT(*) > 1) d
  ON d.authtypecode = ah.authtypecode AND d.heading = ah.heading
WHERE ah.authid > <<Après AuthID>>
ORDER BY ah.authid ASC
LIMIT 1000;

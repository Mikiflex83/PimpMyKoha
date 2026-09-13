/* Source de repli uniquement si GET /api/v1/authorities n'est pas exploitable.
   Paramètre : <<Après AuthID>> (0 au premier appel). */
SELECT authid AS AuthID,authtypecode AS Type,heading AS Vedette,datecreated AS `Créée le`,modification_time AS `Modifiée le`
FROM auth_header
WHERE authid > <<Après AuthID>>
ORDER BY authid ASC;

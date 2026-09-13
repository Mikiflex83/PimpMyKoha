# Dépendances et services externes — V3.42

Le FULL-DIST ne contient pas de dossier `vendor` : les dépendances ci-dessous sont chargées à la demande par les seuls modules qui les utilisent. Elles doivent être autorisées par la CSP de l'installation lorsque le module correspondant est activé.

| Origine / service | Usage principal | Modules concernés |
|---|---|---|
| `www.gstatic.com` | Firebase Web SDK | modules Firebase (Qualité, RDV, Arborescence, Fréquentation, Assistance, Journal, listes, etc.) |
| `cdn.jsdelivr.net` | Chart.js, date-fns, EmailJS, Select2, Quagga2, QR Code Styling | 7 derniers jours, RDV, catalogage 6xx, scanner mobile, QR code |
| `cdnjs.cloudflare.com` | html2pdf.js | Journal de suivi |
| `unpkg.com` | Leaflet + Supercluster | Cartographie adhérents |
| `fonts.googleapis.com` / `fonts.gstatic.com` | polices Web | Inventaire, Journal de suivi |
| `api-adresse.data.gouv.fr` | autocomplétion/géocodage d'adresses | Autocomplétion adresse, Cartographie |
| `geo.api.gouv.fr` | contours géographiques | Cartographie adhérents |
| `www.googleapis.com` | Google Books API | enrichissement/recherche externe |
| `query.wikidata.org` / `www.wikidata.org` | Wikidata SPARQL/liens | Qualité Autorités |
| `catalogue.bnf.fr` | SRU BnF | Qualité Notices |
| sites de recherche externes (Google, Wikipédia, Allociné, Amazon...) | liens sortants déclenchés par l'utilisateur | panneau de recherche externe |

## Règles de diffusion

- Les scripts distants ne sont chargés que par les modules qui en ont besoin ; ils ne doivent pas devenir des dépendances du core.
- Pour une diffusion institutionnelle avec CSP stricte, autoriser uniquement les origines réellement utilisées ou auto-héberger la bibliothèque concernée.
- Les versions explicitement épinglées dans le code doivent le rester lors d'une mise à jour. Les rares URL non épinglées (notamment Chart.js / adaptateur) sont à figer lors d'un futur chantier de supply-chain, sans modifier le fonctionnement métier.
- Les clés Firebase Web ne sont pas des secrets d'administration. La sécurité repose sur Firebase Authentication et les Security Rules fournies dans `prerequisites/firebase/`.
- La redistribution publique de KohaTools reste soumise à la validation de la licence du projet et des licences de ces dépendances.

# Jardin Génétique

Une simulation de nature contemplative en 3D : un hectare de pré où les plantes
poussent, fleurissent, se croisent, sèment et meurent — toutes décrites par un ADN.

Ouvrez `index.html` dans un navigateur récent (WebGL 2). Aucune dépendance, aucun
serveur, aucun fichier externe : tout tient dans un seul fichier.

---

## Le principe

Chaque plante porte un **génome de 48 gènes** en unités physiques réelles : hauteur
adulte, épaisseur de tige, conicité, nombre de tronçons par axe, courbure, torsion,
angle de branche, phyllotaxie, taille et découpe des feuilles, nombre de pétales,
enroulement, torsade, forme de pointe, teintes, longévité, dispersion, besoin d'eau…

Rien n'est modélisé à la main : **la forme est entièrement calculée depuis l'ADN**.
Les tiges sont des cylindres généralisés courbés et vrillés, les limbes des feuilles
sont profilés puis pliés et arqués, les pétales sont des nervures enroulées à section
creusée. Deux graines différentes donnent deux plantes différentes.

### Le détail important : l'ADN par tronçon

Un **tronçon** est la portion de tige entre deux embranchements. Chacun porte sa
**propre copie de l'ADN** — 14 gènes somatiques (longueur, rayon, angle de départ,
envie de brancher, courbure, torsion, vigueur, teinte du feuillage, taille des
feuilles, teinte et nombre de pétales, phyllotaxie, branches au nœud, clarté des
fleurs).

Cette copie est **recopiée du tronçon précédent au moment où il naît**, avec un risque
de mutation par gène égal au taux de mutation de la plante. Les écarts s'accumulent le
long d'une branche : plus on s'éloigne de la souche, plus le rameau peut diverger. Un
arbre peut ainsi porter une branche aux feuilles plus claires, une autre aux fleurs
d'une autre teinte — visibles à l'œil, et lisibles à la loupe.

Visez n'importe quel rameau avec la loupe : la fiche affiche l'ordre de ramure, le
nombre de recopies depuis la base, les mutations cumulées, la divergence somatique en
pourcentage, et le détail des gènes qui ont dérivé.

### La reproduction

Deux plantes de la même lignée en fleur et assez proches se pollinisent. La graine est
produite par une **méiose** : le chromosome (le tableau de gènes, dont l'ordre compte)
est coupé en 1 à 3 points, et l'enfant reçoit alternativement des segments de chaque
parent — les gènes voisins sont donc liés. Un quart des gènes se mélangent par
codominance. Puis viennent les mutations germinales, dont de rares grands sauts.

S'y ajoute une **hérédité somatique** : le rameau maternel qui a porté la fleur
transmet 30 % de sa dérive, le rameau paternel qui a fourni le pollen 15 %. L'ADN
accumulé par une branche particulière peut donc passer à la descendance.

La fiche d'une plante née dans le pré indique sa mère, son père, les points de
coupure méiotique, les gènes mutés à la conception, et colore chaque barre de gène
selon son origine : ♀ mère, ♂ père, × codominance.

---

## Le monde

- **Un hectare** exactement (100 m × 100 m), clos d'une barrière, dans un vallon.
- **Un sol vivant** : 4096 cellules d'humidité et de nutriments, avec rétention selon
  le relief (le creux au nord-ouest reste humide), évaporation, pluie, nappe,
  drainage, ombre portée, prélèvement par les racines et enrichissement par la
  décomposition des plantes mortes.
- **Quatre saisons** de 10 jours, un cycle jour/nuit complet, une météo en chaîne de
  Markov (clair, nuageux, couvert, pluie, orage), la neige quand il gèle.
- **Neuf lignées** : coquelicot, marguerite, campanule, épi d'or, trèfle, buisson
  argenté, chêne, bouleau, saule — chacune avec son calendrier de floraison.
- Les plantes meurent de vieillesse, de soif, de noyade, d'ombre, de gel ou de sol
  épuisé. Les corolles se referment la nuit et sous la pluie.

## Les outils

| | Outil | Usage |
|---|---|---|
| 0 | **Main vide** | ne rien tenir : le clic gauche ne fait plus rien |
| 1 | **Loupe génétique** | lire le génome complet et l'ADN du tronçon visé ; clic pour épingler la fiche |
| 2 | **Arrosoir** | verser de l'eau sur le sol (clic maintenu) |
| 3 | **Arrosoir de sève** | croissance ×50 sur les pieds sous le jet, uniquement tant qu'on verse |
| 4 | **Arrosoir mutagène** | plus on verse, plus les rameaux à venir recopieront l'ADN de travers |
| 5 | **Pinceau à pollen** | prélever le pollen d'un rameau précis, puis le déposer sur une autre plante pour forcer un croisement |
| 6 | **Semoir** | semer le génome conservé dans le flacon, ou une graine sauvage |
| 7 | **Sécateur** | couper le tronçon visé et toute sa descendance |
| 8 | **Flacon** | conserver le génome d'une plante |
| 9 | **Table d'édition génétique** | réécrire au curseur l'ADN **du tronçon visé et de sa descendance** : la branche diverge, se reconstruit aussitôt et repasse ses gènes à ses nouveaux rameaux. Dix gènes font exception — l'horloge, les besoins, les graines — et restent communs à tout le pied ; le génome germinal transmis aux graines, lui, ne bouge pas |

## Commandes

`ZQSD` / `WASD` se déplacer · `Souris` regarder · `Maj` courir · `Ctrl` s'accroupir ·
`Espace` sauter · `0`–`9` ou molette : outil · `Clic gauche` utiliser ·
`Clic droit` épingler · `Alt` maintenu : rendre la souris (pour faire défiler les
fiches) · `P` suspendre le temps · `T` accélérer (jusqu'à ×256) · `H` masquer
l'interface · `N` couper le son · `?` aide.

---

## Sous le capot

Écrit à la main, sans bibliothèque : moteur **WebGL 2** complet (compilation des
shaders, VAO, instanciation, carte d'ombre 2048² avec PCF matériel, brouillard,
tonemapping ACES), maths vectorielles et matricielles, bruit de valeur et fBm,
générateur pseudo-aléatoire déterministe, audio procédural (vent filtré, pluie,
oiseaux, grillons).

Quelques points techniques :

- **Sélection au tronçon** — plutôt que de lancer un rayon sur les maillages, la scène
  est rendue une seconde fois dans un tampon de 20×20 pixels avec une projection
  zoomée sur les 44 pixels autour du réticule. Chaque fragment écrit l'identifiant de
  la plante (16 bits) et celui du tronçon (16 bits). Un balayage en spirale depuis le
  centre trouve la tige la plus proche de la visée, au pixel près.
- **Modèle du tuyau** — le rayon d'un tronçon dérive du nombre de ses descendants,
  ce qui donne des troncs correctement effilés sans les décrire.
- **Trois niveaux de détail** régénèrent le maillage selon la distance ; au-delà de
  22 m une feuille ne coûte que 8 triangles, ce qui permet de garder les 700 feuilles
  d'une couronne au lieu de les décimer.
- **Qualité adaptative** : si la fluidité baisse, la portée de l'herbe et des
  herbacées se resserre automatiquement.
- Les maillages ne sont reconstruits que lorsqu'une signature (croissance, floraison,
  saison, niveau de détail, sénescence) change, et au plus quatre par image.

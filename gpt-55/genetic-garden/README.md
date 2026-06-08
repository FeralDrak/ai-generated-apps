# Genetic Garden

Une simulation contemplative en 3D d'un pre d'un hectare ou fleurs et arbres poussent, se reproduisent, mutent et meurent.

## Lancer

Option simple: lancer un serveur local depuis ce dossier:

```bash
node dev-server.mjs
```

Puis ouvrir `http://127.0.0.1:5177/`.

La page charge Three.js via CDN.

## Controles

- Cliquer dans la scene pour capturer la souris.
- `WASD` pour se deplacer, souris pour regarder, `Shift` pour courir.
- `1` a `5` pour choisir un outil.
- Clic gauche pour utiliser l'outil actif.

## Outils

- **ADN** inspecte la plante visee et affiche son genotype.
- **H2O** donne un bonus temporaire de croissance.
- **Seed** plante une graine issue du croisement de deux plantes proches, ou d'une mutation aleatoire.
- **Cut** retire la plante visee et rend de la matiere au sol.
- **Lab** stocke l'ADN de la plante visee comme reference pour de futurs semis.

Chaque plante porte un ADN global. Les arbres ont aussi un ADN par troncon entre embranchements, copie depuis le parent avec une chance de mutation locale.

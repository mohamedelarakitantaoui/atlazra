# Ajouter une réalisation

Les projets vivent dans Git, sans base de données. Chaque dossier contient
`index.md` et ses propres photos. Seuls les projets `published` apparaissent
sur le site, dans le teaser d'accueil et dans le sitemap. Un brouillon n'a
aucune URL publique, même si l'on connaît son slug.

1. Copier **le dossier entier** `src/content/projects/_template/` vers
   `src/content/projects/mon-projet/`. Utiliser un slug stable, en minuscules,
   sans espaces ni accents. Les dossiers commençant par `_` sont ignorés.
2. Remplacer les aplats par de vraies photos et rendus autorisés par le client.
   Garder les fichiers à côté de `index.md`; ne pas les placer dans `public/`.
   Préférer des originaux de 1600–2400 px, sans métadonnées personnelles.
   Astro produit les tailles responsives en AVIF et WebP, avec dimensions
   explicites et chargement différé sous le premier écran.
3. Remplir le frontmatter entre les deux lignes `---`. Le modèle utilise du
   JSON (également du YAML valide) pour faciliter les textes multilingues.
   Le YAML ordinaire fonctionne aussi. Conserver `status: draft` pendant la
   rédaction. Remplacer **tous** les textes d'exemple et `TODO(client)` par des
   informations confirmées; ne rien inventer.
4. Renseigner les champs obligatoires :
   - `status`: `draft` ou `published`.
   - `type`: `villa`, `riad`, `terrasse`, `pro` ou `3d`.
   - `city`, `year` (entier), `sort_order` (entier, les plus petits d'abord).
   - `surface_m2`: nombre positif, facultatif; supprimer si inconnu.
   - `title` et `summary`: chacun avec `fr`, `ar`, `en`, non vides.
   - `cover`: chemin relatif, par exemple `./jardin.jpg`. Cette image doit
     aussi figurer dans `images`, afin de fournir ses textes alternatifs.
   - `images`: liste de `src`, `kind` et `alt: { fr, ar, en }`. Chaque texte
     alternatif est obligatoire et décrit ce qui est visible. Il sert aussi
     de légende dans le récit et l'album. `kind` accepte `before`, `render_3d`,
     `plan`, `photo` ou `after`.
5. Écrire le récit dans **un seul fichier** `index.md`, selon cette structure :

   ```markdown
   ## fr
   ### before
   Une à trois phrases sur le terrain avant les travaux.
   ### design
   Une à trois phrases sur le plan et les choix validés.
   ### photo
   Une à trois phrases sur le chantier.
   ### after
   Une à trois phrases sur le jardin livré.

   ## ar
   ### before
   وصف الأرض قبل الأشغال في جملة إلى ثلاث جمل.
   ### design
   وصف المخطط والاختيارات المعتمدة.
   ### photo
   وصف مراحل الأشغال.
   ### after
   وصف الحديقة بعد انتهاء الأشغال.

   ## en
   ### before
   One to three sentences about the original site.
   ### design
   One to three sentences about the approved design.
   ### photo
   One to three sentences about the work.
   ### after
   One to three sentences about the finished garden.
   ```

   Garder les clés techniques `before/design/photo/after` et `fr/ar/en`
   exactement ainsi. Les titres visibles sont traduits dans `src/i18n/*.json`.
   Les paragraphes acceptent le Markdown, par exemple `**texte en gras**`.
   Chaque chapitre représenté par une image exige du texte dans les trois
   langues; un texte manquant fait échouer le build. Omettre les chapitres
   sans image. Garder les liens et le contenu éditorial dignes de confiance.

   Ordre du récit : terrain → plan 3D → chantier → jardin. La première image
   de chaque catégorie illustre son chapitre; `render_3d` et `plan` partagent
   le chapitre `design`. Mettre le rendu avant le plan pour choisir le rendu
   comme grande image de chapitre. Le comparateur apparaît juste avant le
   chapitre jardin si les deux images `before` et `after` existent. Les images
   restantes, hors couverture, chapitres et plan interactif, forment l'album.
   L'ordre de la liste détermine l'ordre des images de l'album.
6. Facultatif : ajouter `hotspots` si une image `kind: plan` existe. La
   première image `plan` est utilisée. `x` et `y` sont des pourcentages de
   0 à 100, mesurés depuis le bord **gauche et supérieur de l'image**, même en
   arabe (on ne retourne pas le dessin du plan). Exemple YAML :

   ```yaml
   hotspots:
     - x: 28
       y: 38
       label: { fr: "Terrasse", ar: "الشرفة", en: "Terrace" }
       image: ./terrasse.jpg
       text:
         fr: "Description confirmée de cet élément."
         ar: "وصف معتمد لهذا العنصر."
         en: "Confirmed description of this element."
   ```

   `image` est facultative. Le libellé localisé sert d'alternative à la photo.
   Sans hotspots, la section interactive ne s'affiche pas.
7. Pour prévisualiser localement, changer le statut du **vrai** projet en
   `published`, puis lancer `pnpm build` et les tests. Le teaser affiche au
   plus trois projets, par année décroissante puis `sort_order`; la liste
   complète suit `sort_order`, puis l'année décroissante. Les filtres utilisent
   les fragments `#villa`, `#riad`, `#terrasse`, `#pro`, `#3d`, `#all`.
8. Vérifier FR/AR/EN, les petits écrans, l'ordre du récit, les descriptions,
   le comparateur, les hotspots et l'album. Lancer `pnpm lint`, `pnpm check`,
   `pnpm build`, `pnpm test`. Sur Windows, utiliser `pnpm.cmd` si PowerShell
   bloque le script `pnpm.ps1`.
9. Avec l'accord éditorial du client et les vraies images, conserver
   `status: published`, committer et faire `git push` vers la branche reliée
   à Vercel : Vercel reconstruit le site. Le domaine et le projet Vercel doivent
   déjà être configurés. Ne jamais publier un exemple pour remplir le site.

## Exemples réservés à la validation locale

`exemple-villa` et `exemple-terrasse` portent le titre « EXEMPLE — à supprimer ».
Ce sont uniquement des aplats légendés, avec formats portrait et paysage,
jamais des photos de chantiers. Garder les deux statuts à `draft`. Les dossiers
`exemple-*` sont exclus du chargeur lors des builds CI/Vercel, quel que soit
leur statut. Ne jamais renommer ces dossiers pour contourner cette protection.

`node scripts/verify-project-examples.mjs` passe temporairement ces deux
exemples en `published`, construit le site, teste les pages dans les trois
langues et capture les écrans et Lighthouse. Un `finally` restaure les sources
et reconstruit le site sans exemples. Cette commande refuse CI/Vercel. Si le
processus est tué brutalement, remettre immédiatement les deux statuts à
`draft` puis relancer `pnpm build`. Les captures et rapports locaux sont dans
`artifacts/phase-6/` (ignorés par Git).

Les sources et images de brouillons sont privées uniquement dans un dépôt
privé : ne pas committer de données confidentielles, même avec `draft`.

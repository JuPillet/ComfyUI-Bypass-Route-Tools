# Bypass Route Tools - Custom Nodes for ComfyUI

## Introduction
ENGLISH :
- This repository contains a set of custom nodes made to make ComfyUI more accessible, especially for people just getting started.
- The **Bypass Route Controller** gives you a simple, centralized interface to manage the bypass state of multiple nodes at once, organizing them into named groups (branches) and letting you switch which branch is active with a single click — without touching each node individually.
- The **Bypass Route Switcher** completes it by routing the data of the currently active branch to a single output.
- **UNet Names** lets you pick a model by name without loading anything.
- These nodes were built with one idea in mind: anyone should be able to build and switch between complex multi-branch workflows with a single click, without needing to know what "bypass mode" even means under the hood.

FRANÇAIS :
- Ce dépôt contient un ensemble de nœuds personnalisés conçus pour rendre ComfyUI plus accessible, en particulier pour les personnes qui débutent.
- Le **Bypass Route Controller** vous offre une interface centralisée et simple pour gérer l'état de bypass de plusieurs nœuds à la fois, en les organisant en groupes nommés (branches) et en vous permettant de basculer la branche active d'un simple clic — sans avoir à modifier chaque nœud un par un.
- Le **Bypass Route Switcher** complète ce système en routant les données de la branche actuellement active vers une sortie unique.
- **UNet Names** permet de choisir un modèle par son nom sans rien charger en mémoire.
- Ces nœuds ont été créés avec une seule idée en tête : que n'importe qui puisse construire et basculer entre des workflows multi-branches d'un seul clic, sans avoir besoin de savoir ce que signifie le "mode bypass" dans les rouages de ComfyUI.

---

## 1. Bypass Route Controller

### Overview / Vue d'ensemble
ENGLISH :
- The **Bypass Route Controller** is a visual control panel that lets you organize canvas nodes into named **groups** (one group = one branch of your workflow, e.g. "SD1.5", "SDXL", "Flux") and switch which group is active from one single place. Only one group is active at a time; every node belonging to the other groups gets bypassed automatically.
- It is especially handy if you work with workflows that offer several alternative branches without having to hunt down each node and change its mode by hand — and unlike a single flat list, a group can bundle as many nodes as a branch needs (samplers, loaders, conditioning, etc.) so they all switch together as one unit.

FRANÇAIS :
- Le **Bypass Route Controller** est un panneau de contrôle visuel qui vous permet d'organiser les nœuds du canevas en **groupes** nommés (un groupe = une branche de votre workflow, par ex. "SD1.5", "SDXL", "Flux") et de basculer le groupe actif depuis un seul endroit. Un seul groupe est actif à la fois ; tous les nœuds appartenant aux autres groupes sont automatiquement bypassés.
- Il est particulièrement pratique si vous travaillez avec des workflows proposant plusieurs branches alternatives, sans avoir à retrouver chaque nœud pour changer son mode à la main — et contrairement à une simple liste plate, un groupe peut regrouper autant de nœuds que nécessaire pour une branche (samplers, loaders, conditionnement, etc.) afin qu'ils basculent tous ensemble comme une seule unité.

### Features / Fonctionnalités
ENGLISH :
- **Named Groups, Multiple Nodes Each**: Create as many groups as you need (**"➕ New Group"**) and attach any number of canvas nodes to each one via the per-group **"➕ Add Node"** searchable picker. All nodes in a group are bypassed/activated together as a single unit.
- **One Click to Switch, Inline Rename**: Click the right side of a group's row (the "Bypass"/"Active" label) to make it the active branch. Click the left side (the name) or right-click → **Rename**, to edit the group's name directly in place — no popup dialogs.
- **Live Title Sync**: The controller watches the canvas titles of every node it manages and keeps each group's node list up to date automatically (checked continuously, and instantly on rename), so labels never go stale.
- **Conflict-Safe Bypassing**: If the same node is added to more than one group, it is flagged everywhere with a **⚠** warning icon. Whenever that node belongs to the currently active group, it is always kept Active — even in Inverted mode — so a node shared between branches never gets bypassed out from under the branch that needs it.
- **Reordering & Safe Removal**: Right-click a group row for **Move Up**, **Move Down**, and **Remove group**. Reordering rebuilds the list so the on-screen top-to-bottom order always matches the internal group order, meaning the `selected_index` output always corresponds exactly to a group's visual row position. Removing a group restores its nodes to native "Always Active" mode, unless they're still referenced by another remaining group.
- **Inverted Mode Support**: A built-in toggle lets you flip the selection logic. In normal mode, the active group's nodes stay Active while every other group is Bypassed. In Inverted mode, the active group is Bypassed while all other managed nodes stay Active.
- **Native ComfyUI Bypass**: The controller applies the native ComfyUI bypass mechanism (`node.mode = 4`) to target nodes, producing the exact same visual and execution behavior as manually right-clicking a node and selecting "Bypass" on the canvas.

FRANÇAIS :
- **Groupes nommés, plusieurs nœuds chacun** : Créez autant de groupes que nécessaire (**"➕ New Group"**) et rattachez-y n'importe quel nombre de nœuds du canevas via le sélecteur **"➕ Add Node"** propre à chaque groupe. Tous les nœuds d'un même groupe basculent ensemble comme une seule unité.
- **Un clic pour basculer, renommage inline** : Cliquez sur la partie droite de la ligne d'un groupe (le libellé "Bypass"/"Active") pour en faire la branche active. Cliquez sur la partie gauche (le nom) ou faites un clic droit → **Rename**, pour modifier le nom du groupe directement sur place — sans fenêtre popup.
- **Synchronisation des titres en direct** : Le contrôleur surveille les titres du canevas de chaque nœud qu'il gère et tient à jour la liste de chaque groupe automatiquement (vérifié en continu, et instantanément lors d'un renommage), pour que les libellés ne soient jamais obsolètes.
- **Bypass à l'épreuve des conflits** : Si le même nœud est ajouté à plusieurs groupes, il est signalé partout par une icône d'avertissement **⚠**. Tant que ce nœud appartient au groupe actuellement actif, il reste toujours Actif — même en mode Inversé — afin qu'un nœud partagé entre branches ne soit jamais bypassé alors que la branche active en a besoin.
- **Réorganisation et suppression sûre** : Faites un clic droit sur une ligne de groupe pour **Move Up**, **Move Down**, et **Remove group**. Réorganiser reconstruit la liste pour que l'ordre visuel de haut en bas corresponde toujours à l'ordre interne des groupes, ce qui garantit que la sortie `selected_index` correspond toujours exactement à la position visuelle d'un groupe. Supprimer un groupe restaure ses nœuds dans leur mode natif "Always Active", sauf s'ils sont encore référencés par un autre groupe restant.
- **Support du mode inversé** : Un interrupteur intégré permet d'inverser la logique de sélection. En mode normal, les nœuds du groupe actif restent Actifs tandis que tous les autres groupes sont Bypassés. En mode Inversé, le groupe actif est Bypassé tandis que tous les autres nœuds gérés restent Actifs.
- **Bypass natif ComfyUI** : Le contrôleur applique le mécanisme de bypass natif de ComfyUI (`node.mode = 4`) aux nœuds cibles, produisant exactement le même comportement visuel et d'exécution que faire un clic droit sur un nœud et sélectionner "Bypass" manuellement sur le canevas.

### Inputs & Outputs / Entrées & Sorties
ENGLISH :
- **Inputs (Hidden)**: `active_index` tracks the 1-based position of the currently active group. `inverted` toggles the routing logic behavior described above. Both are handled seamlessly through the custom UI interface and saved with the workflow.
- **Outputs**: `selected_index` (INT) returns the 1-based index (1 to N) of the currently active group, top to bottom. You can pipe this integer into other switches or logic gates in your workflow, including directly into a Bypass Route Switcher.

FRANÇAIS :
- **Entrées (Masquées)** : `active_index` suit la position basée sur 1 du groupe actuellement actif. `inverted` bascule le comportement de la logique de routage décrite ci-dessus. Les deux sont gérés de manière fluide via l'interface utilisateur personnalisée et sauvegardés avec le workflow.
- **Sorties** : `selected_index` (INT) renvoie l'index basé sur 1 (1 à N) du groupe actuellement actif, de haut en bas. Vous pouvez relier cet entier à d'autres commutateurs ou portes logiques dans votre workflow, y compris directement dans un Bypass Route Switcher.

---

## 2. Bypass Route Switcher

### Overview / Vue d'ensemble
ENGLISH :
- The **Bypass Route Switcher** is the data-routing companion to the Bypass Route Controller. While the Controller manages which groups of nodes are bypassed or active on the canvas, the Switcher provides the logical data path by forwarding the content of the input slot matching the active group to a single unified output.
- It is designed to be used alongside a Controller, sharing the same index/group logic, so that bypass switching and data routing happen together without any extra setup.

FRANÇAIS :
- Le **Bypass Route Switcher** est le nœud de routage de données complémentaire au Bypass Route Controller. Tandis que le Controller gère quels groupes de nœuds sont bypassés ou actifs sur le canevas, le Switcher fournit le chemin de données logique en transmettant le contenu du slot d'entrée correspondant au groupe actif vers une sortie unifiée unique.
- Il est conçu pour être utilisé conjointement à un Controller, en partageant la même logique d'index/groupe, afin que la commutation de bypass et le routage de données se fassent ensemble sans configuration supplémentaire.

### Features / Fonctionnalités
ENGLISH :
- **Live Controller List**: The dropdown of available controllers refreshes automatically whenever a Bypass Route Controller is added or removed from the canvas. No manual reload or restart is needed to keep the list current.
- **Dynamic Input Generation**: When a Controller is selected, the Switcher automatically creates or removes `input_N` slots to match the number of **groups** defined on that Controller, each labeled with the matching group's name. Both nodes are kept in sync without any manual intervention, including when groups are renamed, reordered, added, or removed.
- **Flexible Index Control**: The `index` input is a standard ComfyUI INT that accepts both manual widget entry and live connections from any integer output in your graph. Wire it directly to the Controller's `selected_index` output to achieve fully automated branch routing.
- **Single Unified Output**: Regardless of how many branches are configured, the Switcher always exposes a single `output` slot of type `ANY`, making it straightforward to integrate into any downstream workflow without restructuring your existing connections.

FRANÇAIS :
- **Liste de contrôleurs en direct** : La liste déroulante des contrôleurs disponibles se rafraîchit automatiquement chaque fois qu'un Bypass Route Controller est ajouté ou supprimé du canevas. Aucun rechargement ou redémarrage manuel n'est nécessaire pour maintenir la liste à jour.
- **Génération dynamique des entrées** : Lorsqu'un Controller est sélectionné, le Switcher crée ou supprime automatiquement des slots `input_N` pour correspondre au nombre de **groupes** définis sur ce Controller, chacun étiqueté avec le nom du groupe correspondant. Les deux nœuds sont maintenus en synchronisation sans aucune intervention manuelle, y compris lorsque des groupes sont renommés, réordonnés, ajoutés ou supprimés.
- **Contrôle d'index flexible** : L'entrée `index` est un INT ComfyUI standard qui accepte à la fois la saisie manuelle dans le widget et les connexions en direct depuis n'importe quelle sortie entière de votre graphe. Connectez-le directement à la sortie `selected_index` du Controller pour obtenir un routage de branche entièrement automatisé.
- **Sortie unique unifiée** : Quel que soit le nombre de branches configurées, le Switcher expose toujours un seul slot `output` de type `ANY`, ce qui facilite son intégration dans n'importe quel workflow en aval sans avoir à restructurer vos connexions existantes.

### Inputs & Outputs / Entrées & Sorties
ENGLISH :
- **Inputs**: `controller` (COMBO) a dropdown to select the linked Bypass Route Controller; the list auto-refreshes when controllers are added or removed from the canvas. `index` (INT) the 1-based index of the group/branch to forward to the output; connectable from any INT source, including the Controller's `selected_index` output. `input_1` to `input_N` (*) dynamically generated connectable slots, one per group defined on the selected Controller.
- **Outputs**: `output` (ANY) the data value forwarded from the active `input_N` slot corresponding to the current index.

FRANÇAIS :
- **Entrées** : `controller` (COMBO) un menu déroulant pour sélectionner le Bypass Route Controller lié ; la liste se rafraîchit automatiquement lorsque des contrôleurs sont ajoutés ou supprimés du canevas. `index` (INT) l'index basé sur 1 du groupe/branche à transmettre en sortie ; connectable depuis n'importe quelle source INT, y compris la sortie `selected_index` du Controller. `input_1` à `input_N` (*) slots connectables générés dynamiquement, un par groupe défini sur le Controller sélectionné.
- **Sorties** : `output` (ANY) la valeur de données transmise depuis le slot `input_N` actif correspondant à l'index courant.

---

## 3. UNet Names

### Overview / Vue d'ensemble
ENGLISH :
- **UNet Names** is a small utility that lists all available UNet model files from your ComfyUI directories and lets you pick one by name. The selected name is output as a plain string, ready to be plugged into any loader node that expects a model file name.
- Honestly, this node was built to fill a specific gap in an earlier version of the workflow. That gap no longer really exists now that the **Bypass Route Controller** and **Bypass Route Switcher** take care of the routing side — but it is still here in case you ever need to grab a model name without loading the model itself.

FRANÇAIS :
- **UNet Names** est un petit utilitaire qui liste tous les fichiers de modèles UNet disponibles dans vos répertoires ComfyUI et vous permet d'en choisir un par son nom. Le nom sélectionné est renvoyé sous forme de chaîne de caractères, prêt à être connecté à n'importe quel nœud de chargement qui attend un nom de fichier modèle.
- Pour être honnête, ce nœud a été créé pour répondre à un besoin spécifique dans une version antérieure du workflow. Ce besoin n'a plus vraiment lieu d'être depuis que le **Bypass Route Controller** et le **Bypass Route Switcher** gèrent le côté routage — mais il reste là au cas où vous auriez besoin de récupérer un nom de modèle sans le charger.

### Inputs & Outputs / Entrées & Sorties
ENGLISH :
- **Inputs**: `unet_name` (COMBO) a dropdown listing all UNet model files found across the standard model directories.
- **Outputs**: `unet_name` (STRING) the file name of the selected model, ready to connect to a loader node.

FRANÇAIS :
- **Entrées** : `unet_name` (COMBO) un menu déroulant listant tous les fichiers de modèles UNet trouvés dans les répertoires de modèles standards.
- **Sorties** : `unet_name` (STRING) le nom de fichier du modèle sélectionné, prêt à être connecté à un nœud de chargement.

---

## 4. Installation & Setup / Installation & Configuration

### Directory Structure / Structure des répertoires
ENGLISH :
- To install these nodes, place the entire package into a dedicated subdirectory inside your ComfyUI `custom_nodes` directory. Python node definitions must reside inside a `nodes` subfolder, and the JavaScript front-end extensions inside a `js` folder. The `__init__.py` at the root automatically discovers and loads all Python files present in `nodes/`.
- The recommended file layout should look like this:
```
custom_nodes/ComfyUI-BypassRouteController/
├── __init__.py
├── nodes/
│   ├── BypassRouteController.py
│   ├── BypassRouteSwitcher.py
│   └── UnetName.py
└── js/
    ├── BypassRouteController.js
    └── BypassRouteSwitcher.js
```

FRANÇAIS :
- Pour installer ces nœuds, placez l'ensemble du package dans un sous-répertoire dédié à l'intérieur de votre dossier `custom_nodes` de ComfyUI. Les définitions Python des nœuds doivent se trouver dans un sous-dossier `nodes`, et les extensions front-end JavaScript dans un dossier `js`. Le fichier `__init__.py` à la racine découvre et charge automatiquement tous les fichiers Python présents dans `nodes/`.
- La disposition recommandée des fichiers doit ressembler à ceci :
```
custom_nodes/ComfyUI-BypassRouteController/
├── __init__.py
├── nodes/
│   ├── BypassRouteController.py
│   ├── BypassRouteSwitcher.py
│   └── UnetName.py
└── js/
    ├── BypassRouteController.js
    └── BypassRouteSwitcher.js
```

### Usage Tips / Conseils d'utilisation
ENGLISH :
- After restarting ComfyUI, right-click anywhere on the canvas and search for **Bypass Route Controller**, **Bypass Route Switcher**, or **UNet Names** under the `Bypass Route Tools` category menu.
- Click **"➕ New Group"** on the Controller to create a new branch, then click **"➕ Add Node"** under that group to attach any canvas node to it (a searchable picker lets you filter by node title or ID). A group's row shows **Bypass** or **Active** depending on whether it's the currently selected branch.
- To rename a group, click its name on the left side of the row, double-click anywhere on the row, or right-click it and choose **Rename** — the name becomes an editable field directly on the canvas. Press **Enter** to confirm or **Escape** to cancel.
- Right-click any group's row to open the context menu, which provides four actions: **Rename**, **Move Up** and **Move Down** to reorder the branches, and **Remove group** to safely detach all its nodes and restore them to their active state (unless they're still used by another group). To remove a single node from a group instead, click the **×** next to its name in that group's node list.
- To route data with the Switcher, select a Controller from its dropdown, then connect each `input_N` slot (one per group) to the matching data source for that branch. For fully automated routing, wire the Controller's `selected_index` output directly into the Switcher's `index` input.

FRANÇAIS :
- Après avoir redémarré ComfyUI, faites un clic droit n'importe où sur le canevas et recherchez **Bypass Route Controller**, **Bypass Route Switcher** ou **UNet Names** sous le menu de la catégorie `Bypass Route Tools`.
- Cliquez sur **"➕ New Group"** sur le Controller pour créer une nouvelle branche, puis cliquez sur **"➕ Add Node"** sous ce groupe pour y rattacher n'importe quel nœud du canevas (un sélecteur avec recherche permet de filtrer par titre ou ID de nœud). La ligne d'un groupe affiche **Bypass** ou **Active** selon qu'il s'agit ou non de la branche actuellement sélectionnée.
- Pour renommer un groupe, cliquez sur son nom sur la partie gauche de la ligne, double-cliquez n'importe où sur la ligne, ou faites un clic droit dessus et choisissez **Rename** — le nom devient un champ éditable directement sur le canevas. Appuyez sur **Entrée** pour valider ou sur **Échap** pour annuler.
- Faites un clic droit sur la ligne d'un groupe pour ouvrir le menu contextuel, qui propose quatre actions : **Rename**, **Move Up** et **Move Down** pour réordonner les branches, et **Remove group** pour détacher en toute sécurité tous ses nœuds et les restaurer dans leur état actif (sauf s'ils sont encore utilisés par un autre groupe). Pour retirer un seul nœud d'un groupe, cliquez sur le **×** à côté de son nom dans la liste de ce groupe.
- Pour router des données avec le Switcher, sélectionnez un Controller dans son menu déroulant, puis connectez chaque slot `input_N` (un par groupe) à la source de données correspondante pour cette branche. Pour un routage entièrement automatisé, connectez la sortie `selected_index` du Controller directement à l'entrée `index` du Switcher.

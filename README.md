# Bypass Route Tools - Custom Nodes for ComfyUI

## Introduction
ENGLISH :
     - This repository contains a set of custom nodes made to make ComfyUI more accessible, especially for people just getting started.
     - The **Bypass Route Controller** gives you a simple, centralized interface to manage the bypass state of multiple nodes at once, without touching each one individually.
     - The **Bypass Route Switcher** completes it by routing the right data branch to a single output.
     - **UNet Names** lets you pick a model by name without loading anything.
     - These nodes were built with one idea in mind: anyone should be able to build and switch between complex multi-branch workflows with a single click, without needing to know what "bypass mode" even means under the hood.

FRANÇAIS :
     - Ce dépôt contient un ensemble de nœuds personnalisés conçus pour rendre ComfyUI plus accessible, en particulier pour les personnes qui débutent.
     - Le **Bypass Route Controller** vous offre une interface centralisée et simple pour gérer l'état de bypass de plusieurs nœuds à la fois, sans avoir à les modifier un par un.
     - Le **Bypass Route Switcher** complète ce système en routant la bonne branche de données vers une sortie unique.
     - **UNet Names** permet de choisir un modèle par son nom sans rien charger en mémoire.
     - Ces nœuds ont été créés avec une seule idée en tête : que n'importe qui puisse construire et basculer entre des workflows multi-branches sans avoir besoin de savoir ce que signifie le "mode bypass" dans les rouages de ComfyUI.

---

## 1. Bypass Route Controller

### Overview / Vue d'ensemble
ENGLISH :
     - The **Bypass Route Controller** is a visual control panel that lets you manage the Activation or Bypass state of several nodes on your canvas from one single place. Just add the nodes you want to control, and toggle them with a click — no right-clicking around the canvas.
     - It is especially handy if you work with workflows that offer several alternative branches (e.g., switching between SD1.5, SDXL, or Flux setups) without having to hunt down each node and change its mode by hand.

FRANÇAIS :
     - Le **Bypass Route Controller** est un panneau de contrôle visuel qui vous permet de gérer l'état d'activation ou de bypass de plusieurs nœuds depuis un seul endroit. Ajoutez simplement les nœuds que vous souhaitez contrôler et basculez-les d'un clic — fini le clic droit sur chaque nœud à travers tout le canevas.
     - Il est particulièrement pratique si vous travaillez avec des workflows qui proposent plusieurs branches alternatives (par exemple, basculer entre des configurations SD1.5, SDXL ou Flux) sans avoir à retrouver chaque nœud et à changer son mode à la main.

### Features / Fonctionnalités
ENGLISH :
     - **Dynamic Node Binding**: You can add any node from your canvas into the controller using a dedicated context menu. The controller monitors the custom titles of your target nodes and automatically syncs their labels in real-time.
     - **Strict Physical Indexing**: Reordering nodes using the "Move Up" or "Move Down" context actions completely rebuilds the widgets sequentially. This ensures that the physical top-to-bottom layout on the UI always matches the internal array indexing, and the selected index output dynamically corresponds to the visual row position.
     - **Safety Active Restore**: When a target node is removed from the controller via the right-click "Remove" menu, the node is automatically restored to its native "Always Active" mode. This prevents nodes from getting stuck in a bypassed state on your canvas.
     - **Inverted Mode Support**: A built-in toggle allows you to invert the selection behavior. In normal mode, the selected line is bypassed while others remain active. In inverted mode, only the selected line is active while all other managed nodes are bypassed.
     - **Native ComfyUI Bypass**: The controller applies the native ComfyUI bypass mechanism (`node.mode = 4`) to target nodes, producing the exact same visual and execution behavior as manually right-clicking a node and selecting "Bypass" on the canvas.

FRANÇAIS :
     - **Liaison dynamique de nœuds** : Vous pouvez ajouter n'importe quel nœud de votre canevas dans le contrôleur via un menu contextuel dédié. Le contrôleur surveille les titres personnalisés de vos nœuds cibles et synchronise automatiquement leurs libellés en temps réel.
     - **Réindexation physique stricte** : Réorganiser les nœuds à l'aide des actions "Move Up" ou "Move Down" reconstruit entièrement les widgets de manière séquentielle. Cela garantit que la disposition physique de haut en bas sur l'interface utilisateur correspond toujours à l'index de tableau interne, et que la sortie de l'index sélectionné correspond dynamiquement à la position de la ligne visuelle.
     - **Restauration de sécurité active** : Lorsqu'un nœud cible est retiré du contrôleur via le menu "Remove" (clic droit), le nœud est automatiquement restauré dans son mode natif "Always Active". Cela évite que des nœuds ne restent bloqués dans un état bypassé sur votre canevas.
     - **Support du mode inversé** : Un interrupteur intégré vous permet d'inverser le comportement de sélection. En mode normal, la ligne sélectionnée est bypassée tandis que les autres restent actives. En mode inversé, seule la ligne sélectionnée est active tandis que tous les autres nœuds gérés sont bypassés.
     - **Bypass natif ComfyUI** : Le contrôleur applique le mécanisme de bypass natif de ComfyUI (`node.mode = 4`) aux nœuds cibles, produisant exactement le même comportement visuel et d'exécution que faire un clic droit sur un nœud et sélectionner "Bypass" manuellement sur le canevas.

### Inputs & Outputs / Entrées & Sorties
ENGLISH :
     - **Inputs (Hidden)**: `active_index` tracks the selected route row position. `inverted` toggles the routing logic behavior. Both are handled seamlessly through the custom UI interface.
     - **Outputs**: `selected_index` (INT) returns the 1-based index (1 to N) representing the currently active position from top to bottom. You can pipe this integer into other switches or logic gates in your workflow, including directly into a Bypass Route Switcher.

FRANÇAIS :
     - **Entrées (Masquées)** : `active_index` suit la position de la ligne de la route sélectionnée. `inverted` bascule le comportement de la logique de routage. Les deux sont gérés de manière fluide via l'interface utilisateur personnalisée.
     - **Sorties** : `selected_index` (INT) renvoie l'index basé sur 1 (1 à N) représentant la position actuellement active de haut en bas. Vous pouvez relier cet entier à d'autres commutateurs ou portes logiques dans votre workflow, y compris directement dans un Bypass Route Switcher.

---

## 2. Bypass Route Switcher

### Overview / Vue d'ensemble
ENGLISH :
     - The **Bypass Route Switcher** is the data-routing companion to the Bypass Route Controller. While the Controller manages which nodes are bypassed or active on the canvas, the Switcher provides the logical data path by forwarding the content of the selected input slot to a single unified output.
     - It is designed to be used alongside a Controller, sharing the same target index logic, so that bypass switching and data routing happen together without any extra setup.

FRANÇAIS :
     - Le **Bypass Route Switcher** est le nœud de routage de données complémentaire au Bypass Route Controller. Tandis que le Controller gère quels nœuds sont bypassés ou actifs sur le canevas, le Switcher fournit le chemin de données logique en transmettant le contenu du slot d'entrée sélectionné vers une sortie unifiée unique.
     - Il est conçu pour être utilisé conjointement à un Controller, partageant la même logique d'index, afin que la commutation de bypass et le routage de données se fassent ensemble sans configuration supplémentaire.

### Features / Fonctionnalités
ENGLISH :
     - **Live Controller List**: The dropdown of available controllers refreshes automatically whenever a Bypass Route Controller is added or removed from the canvas. No manual reload or restart is needed to keep the list current.
     - **Dynamic Input Generation**: When a Controller is selected, the Switcher automatically creates or removes `input_N` slots to match the number of target nodes managed by that Controller. Both nodes are kept in sync without any manual intervention.
     - **Flexible Index Control**: The `index` input is a standard ComfyUI INT that accepts both manual widget entry and live connections from any integer output in your graph. Wire it directly to the Controller's `selected_index` output to achieve fully automated branch routing.
     - **Single Unified Output**: Regardless of how many branches are configured, the Switcher always exposes a single `output` slot of type `ANY`, making it straightforward to integrate into any downstream workflow without restructuring your existing connections.

FRANÇAIS :
     - **Liste de contrôleurs en direct** : La liste déroulante des contrôleurs disponibles se rafraîchit automatiquement chaque fois qu'un Bypass Route Controller est ajouté ou supprimé du canevas. Aucun rechargement ou redémarrage manuel n'est nécessaire pour maintenir la liste à jour.
     - **Génération dynamique des entrées** : Lorsqu'un Controller est sélectionné, le Switcher crée ou supprime automatiquement des slots `input_N` pour correspondre au nombre de nœuds cibles gérés par ce Controller. Les deux nœuds sont maintenus en synchronisation sans aucune intervention manuelle.
     - **Contrôle d'index flexible** : L'entrée `index` est un INT ComfyUI standard qui accepte à la fois la saisie manuelle dans le widget et les connexions en direct depuis n'importe quelle sortie entière de votre graphe. Connectez-le directement à la sortie `selected_index` du Controller pour obtenir un routage de branche entièrement automatisé.
     - **Sortie unique unifiée** : Quel que soit le nombre de branches configurées, le Switcher expose toujours un seul slot `output` de type `ANY`, ce qui facilite son intégration dans n'importe quel workflow en aval sans avoir à restructurer vos connexions existantes.

### Inputs & Outputs / Entrées & Sorties
ENGLISH :
     - **Inputs**: `controller` (COMBO) a dropdown to select the linked Bypass Route Controller; the list auto-refreshes when controllers are added or removed from the canvas. `index` (INT) the 1-based row index of the branch to forward to the output; connectable from any INT source, including the Controller's `selected_index` output. `input_1` to `input_N` (*) dynamically generated connectable slots, one per target node managed by the selected Controller.
     - **Outputs**: `output` (ANY) the data value forwarded from the active `input_N` slot corresponding to the current index.

FRANÇAIS :
     - **Entrées** : `controller` (COMBO) un menu déroulant pour sélectionner le Bypass Route Controller lié ; la liste se rafraîchit automatiquement lorsque des contrôleurs sont ajoutés ou supprimés du canevas. `index` (INT) l'index de ligne basé sur 1 de la branche à transmettre en sortie ; connectable depuis n'importe quelle source INT, y compris la sortie `selected_index` du Controller. `input_1` à `input_N` (*) slots connectables générés dynamiquement, un par nœud cible géré par le Controller sélectionné.
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
     - To control a node with the Controller, click the **"➕ Add Node"** button in its interface. Each controlled node appears as a toggle row labeled with its canvas title, showing **Bypass** or **Active** as its current state.
     - Right-click any toggle row on the Controller to open the context menu, which provides four actions: **Toggle → Bypass / Active** to switch the state of that specific row, **Move Up** and **Move Down** to reorder the rows, and **Remove** to safely detach the node and restore it to its active state.
     - To route data with the Switcher, select a Controller from its dropdown, then connect each `input_N` slot to the matching data source for that branch. For fully automated routing, wire the Controller's `selected_index` output directly into the Switcher's `index` input.

FRANÇAIS :
     - Après avoir redémarré ComfyUI, faites un clic droit n'importe où sur le canevas et recherchez **Bypass Route Controller**, **Bypass Route Switcher** ou **UNet Names** sous le menu de la catégorie `Bypass Route Tools`.
     - Pour contrôler un nœud avec le Controller, cliquez sur le bouton **"➕ Add Node"** dans son interface. Chaque nœud contrôlé apparaît sous forme d'une ligne interrupteur étiquetée avec son titre sur le canevas, affichant **Bypass** ou **Active** comme état actuel.
     - Faites un clic droit sur n'importe quelle ligne d'interrupteur du Controller pour ouvrir le menu contextuel, qui propose quatre actions : **Toggle → Bypass / Active** pour basculer l'état de cette ligne spécifique, **Move Up** et **Move Down** pour réordonner les lignes, et **Remove** pour détacher le nœud en toute sécurité et le restaurer dans son état actif.
     - Pour router des données avec le Switcher, sélectionnez un Controller dans son menu déroulant, puis connectez chaque slot `input_N` à la source de données correspondante pour cette branche. Pour un routage entièrement automatisé, connectez la sortie `selected_index` du Controller directement à l'entrée `index` du Switcher.
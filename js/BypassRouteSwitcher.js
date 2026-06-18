import { app } from "../../scripts/app.js";

const NODE_NAME       = "BypassRouteSwitcher";
const CONTROLLER_TYPE = "BypassRouteController";

// ─── Helpers au niveau module ─────────────────────────────────────────────────

/** Retourne la liste des contrôleurs présents dans le graphe. */
function buildControllerList() {
    const nodes = app.graph?._nodes || [];
    const list  = nodes
        .filter(n => n.type === CONTROLLER_TYPE)
        .map(n => `${n.title || "Controller"} (id:${n.id})`);
    return list.length ? list : ["No BypassRouteController found"];
}

/**
 * Met à jour le dropdown de TOUS les BypassRouteSwitcher présents dans le graphe.
 * Appelé automatiquement à chaque ajout / suppression / renommage de contrôleur.
 */
function refreshAllSwitchers() {
    const list = buildControllerList();

    (app.graph?._nodes || [])
        .filter(n => n.type === NODE_NAME)
        .forEach(n => {
            if (!n.controllerWidget) return;

            n.controllerWidget.options.values = list;

            // Si la valeur sélectionnée n'est plus dans la liste (contrôleur supprimé
            // ou renommé) → on repointe sur la première entrée disponible
            if (!list.includes(n.controllerWidget.value)) {
                n.controllerWidget.value = list[0];
            }

            n.setDirtyCanvas?.(true, false);
        });
}

// ─── Extension ComfyUI ────────────────────────────────────────────────────────

app.registerExtension({
    name: `BypassRouteTools.${NODE_NAME}`,

    // ── setup() ───────────────────────────────────────────────────────────────
    // S'exécute UNE SEULE FOIS après l'initialisation complète de l'app.
    // C'est ici qu'on accroche les événements du graphe LiteGraph.
    setup() {

        // ① Nœud ajouté au graphe
        const _onNodeAdded = app.graph.onNodeAdded;
        app.graph.onNodeAdded = function (node) {
            _onNodeAdded?.call(this, node);
            if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
        };

        // ② Nœud supprimé du graphe
        const _onNodeRemoved = app.graph.onNodeRemoved;
        app.graph.onNodeRemoved = function (node) {
            _onNodeRemoved?.call(this, node);
            if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
        };

        // ③ Titre d'un nœud modifié (renommage d'un contrôleur)
        //    LiteGraph expose onNodeTitleChanged sur le graphe dans certaines versions ;
        //    on le patche proprement si disponible, sinon le onMouseDown suffit.
        if ("onNodeTitleChanged" in app.graph) {
            const _onTitleChanged = app.graph.onNodeTitleChanged;
            app.graph.onNodeTitleChanged = function (node) {
                _onTitleChanged?.call(this, node);
                if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
            };
        }
    },

    // ── beforeRegisterNodeDef ─────────────────────────────────────────────────
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        // ── onNodeCreated ─────────────────────────────────────────────────────
        // Les widgets Python (controller combo + index INT) sont déjà créés
        // par ComfyUI avant onNodeCreated. On les enrichit, on ne les recrée PAS.
        const _onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            _onNodeCreated?.apply(this, arguments);
            const node = this;

            node.controllerWidget = node.widgets?.find(w => w.name === "controller");
            node.indexWidget      = node.widgets?.find(w => w.name === "index");

            if (node.indexWidget) {
                node.indexWidget.options.precision = 0;
            }

            if (node.controllerWidget) {
                // Liste initiale
                node.controllerWidget.options.values = buildControllerList();
                // Callback sélection
                node.controllerWidget.callback = () => node.updateFromController();
                // Rafraîchir la liste à chaque ouverture du dropdown
                // (couvre les renommages de contrôleurs non détectés par l'event graphe)
                node.controllerWidget.onMouseDown = () => {
                    node.controllerWidget.options.values = buildControllerList();
                };
            }

            // Ordre des widgets dans le nœud : controller → index
            if (node.controllerWidget && node.indexWidget) {
                const rest = (node.widgets || []).filter(
                    w => w !== node.controllerWidget && w !== node.indexWidget
                );
                node.widgets = [node.controllerWidget, node.indexWidget, ...rest];
            }

            setTimeout(() => node.updateFromController(), 100);
        };

        // ── updateFromController ──────────────────────────────────────────────
        nodeType.prototype.updateFromController = function () {
            const val = this.controllerWidget?.value;
            if (!val || val.startsWith("No ") || val.startsWith("Select")) return;

            const match = val.match(/id:(\d+)/);
            if (!match) return;

            const controllerNode = app.graph.getNodeById(parseInt(match[1]));
            if (!controllerNode?.__state) return;

            const targets = (controllerNode.__state.targets || []).map(String);
            this.syncInputsWithTargets(targets);
        };

        // ── syncInputsWithTargets ─────────────────────────────────────────────
        // Ne touche QUE les inputs dynamiques (input_1, input_2, …).
        // Les inputs Python (controller + index) restent intacts → pas de double index.
        nodeType.prototype.syncInputsWithTargets = function (newTargets) {
            // Supprimer les anciens inputs dynamiques (de la fin vers le début)
            for (let i = (this.inputs || []).length - 1; i >= 0; i--) {
                if (/^input_\d+$/.test(this.inputs[i].name)) {
                    this.removeInput(i);
                }
            }

            // Recréer les inputs dynamiques
            newTargets.forEach((_, i) => {
                this.addInput(`input_${i + 1}`, "*");
            });

            this.updateIndexWidgetLimit(newTargets.length);
            this.__prevTargets = [...newTargets];
            this.setSize(this.computeSize());
            this.setDirtyCanvas(true, true);
        };

        // ── updateIndexWidgetLimit ────────────────────────────────────────────
        nodeType.prototype.updateIndexWidgetLimit = function (count) {
            if (!this.indexWidget) return;
            this.indexWidget.options.max = Math.max(1, count);
            if (this.indexWidget.value > count || this.indexWidget.value < 1) {
                this.indexWidget.value = 1;
            }
        };

        // ── onConfigure (chargement de workflow) ──────────────────────────────
        const _onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            _onConfigure?.apply(this, arguments);
            setTimeout(() => this.updateFromController(), 150);
        };
    },
});
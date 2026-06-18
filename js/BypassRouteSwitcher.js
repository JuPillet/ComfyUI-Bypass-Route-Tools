import { app } from "../../scripts/app.js";

const NODE_NAME	   = "BypassRouteSwitcher";
const CONTROLLER_TYPE = "BypassRouteController";

// ─── Module-Level Helpers ─────────────────────────────────────────────────

/** Returns the list of controllers present in the graph. */
function buildControllerList() {
	const nodes = app.graph?._nodes || [];
	const list  = nodes
		.filter(n => n.type === CONTROLLER_TYPE)
		.map(n => `${n.title || "Controller"} (id:${n.id})`);
	return list.length ? list : ["No BypassRouteController found"];
}

/**
 * Updates the dropdown of ALL BypassRouteSwitchers present in the graph.
 * Called automatically on every controller addition / removal / renaming.
 */
function refreshAllSwitchers() {
	const list = buildControllerList();

	(app.graph?._nodes || [])
		.filter(n => n.type === NODE_NAME)
		.forEach(n => {
			if (!n.controllerWidget) return;

			n.controllerWidget.options.values = list;

			// If the selected value is no longer in the list (controller deleted
			// or renamed) → fallback to the first available entry
			if (!list.includes(n.controllerWidget.value)) {
				n.controllerWidget.value = list[0];
			}

			n.setDirtyCanvas?.(true, false);
		});
}

// ─── ComfyUI Extension ────────────────────────────────────────────────────────

app.registerExtension({
	name: `BypassRouteTools.${NODE_NAME}`,

	// ③ Node title modified (controller renaming)
	//	LiteGraph exposes onNodeTitleChanged on the graph in certain versions;
	//	we patch it cleanly if available, otherwise onMouseDown is sufficient.
	setup() {

		// ① Node added to the graph
		const _onNodeAdded = app.graph.onNodeAdded;
		app.graph.onNodeAdded = function (node) {
			_onNodeAdded?.call(this, node);
			if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
		};

		// ② Node removed from the graph
		const _onNodeRemoved = app.graph.onNodeRemoved;
		app.graph.onNodeRemoved = function (node) {
			_onNodeRemoved?.call(this, node);
			if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
		};

		// ③ Titre d'un nœud modifié (renommage d'un contrôleur)
		//	LiteGraph expose onNodeTitleChanged sur le graphe dans certaines versions ;
		//	on le patche proprement si disponible, sinon le onMouseDown suffit.
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

		// ── onNodeCreated ─────────────────────────────────────────────────────		// Python widgets (controller combo + index INT) are already created
		// by ComfyUI before onNodeCreated. We enrich them, we do NOT recreate them.
		const _onNodeCreated = nodeType.prototype.onNodeCreated;
		nodeType.prototype.onNodeCreated = function () {
			_onNodeCreated?.apply(this, arguments);
			const node = this;

			node.controllerWidget = node.widgets?.find(w => w.name === "controller");
			node.indexWidget	  = node.widgets?.find(w => w.name === "index");

			if (node.indexWidget) {
				node.indexWidget.options.precision = 0;
			}

			if (node.controllerWidget) {
				// Initial list
				node.controllerWidget.options.values = buildControllerList();
				// selection Callback
				node.controllerWidget.callback = () => node.updateFromController();
				// Refresh the list every time the dropdown opens
				// (covers controller renamings not detected by the graph event)
				node.controllerWidget.onMouseDown = () => {
					node.controllerWidget.options.values = buildControllerList();
				};
			}

			// Widget order in the node: controller → index
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
		// ONLY touches dynamic inputs (input_1, input_2, …).
		// Python inputs (controller + index) remain intact → no double index.
		nodeType.prototype.syncInputsWithTargets = function (newTargets) {
			// Remove old dynamic inputs (from end to start)
			for (let i = (this.inputs || []).length - 1; i >= 0; i--) {
				if (/^input_\d+$/.test(this.inputs[i].name)) {
					this.removeInput(i);
				}
			}

			// Recreate dynamic inputs
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

		// ── onConfigure (workflow loading) ──────────────────────────────
		const _onConfigure = nodeType.prototype.onConfigure;
		nodeType.prototype.onConfigure = function (data) {
			_onConfigure?.apply(this, arguments);
			setTimeout(() => this.updateFromController(), 150);
		};
	},
});
import { app } from "../../scripts/app.js";

const NODE_NAME       = "BypassRouteSwitcher";
const CONTROLLER_TYPE = "BypassRouteController";

// Must match the identical string literal in BypassRouteController.js.
const CONTROLLER_RENAMED_EVENT = "bypass-route-tools:controller-renamed";

// ─── Module-Level Helpers ─────────────────────────────────────────────────

/** Returns the list of controllers present in the graph. */
function buildControllerList() {
    const nodes = app.graph?._nodes || [];
    const list  = nodes
        .filter(n => n.type === CONTROLLER_TYPE)
        .map(n => `${n.title || "Controller"} (id:${n.id})`);
    return list.length ? list : ["No BypassRouteController found"];
}

/** Updates the dropdown of ALL BypassRouteSwitchers present in the graph. */
function refreshAllSwitchers() {
    const list = buildControllerList();

    (app.graph?._nodes || [])
        .filter(n => n.type === NODE_NAME)
        .forEach(n => {
            if (!n.controllerWidget) return;

            n.controllerWidget.options.values = list;

            if (!list.includes(n.controllerWidget.value)) {
                // The exact display string (it embeds the controller's title)
                // can go stale right after a rename even though the same
                // controller still exists — re-match it by id before falling
                // back to the first entry, so renaming a controller doesn't
                // silently switch the Switcher to a different one.
                const match = n.controllerWidget.value?.match(/id:(\d+)/);
                const stillThere = match && list.find(v => v.endsWith(`(id:${match[1]})`));
                n.controllerWidget.value = stillThere || list[0];
            }

            n.setDirtyCanvas?.(true, false);
        });
}

/**
 * Keeps the node's size in sync with its content after every change:
 * width is preserved (or grown if it no longer fits, but never shrunk back
 * down — so a width the user picked by dragging survives), while height is
 * always recomputed to exactly match the current content, so it shrinks
 * immediately on any removal (input slot, etc.) instead of leaving empty
 * space, and grows immediately when content is added.
 */
function resizeToFitContent(node) {
    const natural = node.computeSize();
    const current = node.size;
    node.setSize([
        Math.max(current[0], natural[0]),
        natural[1],
    ]);
}

// ─── ComfyUI Extension ────────────────────────────────────────────────────────

app.registerExtension({
    name: `MultiRouteTools.${NODE_NAME}`,

    setup() {
        // The Controller broadcasts this event the instant its own title
        // changes (see the `Object.defineProperty` on `node.title` in
        // BypassRouteController.js) — no interval, no polling.
        window.addEventListener(CONTROLLER_RENAMED_EVENT, refreshAllSwitchers);

        const _onNodeAdded = app.graph.onNodeAdded;
        app.graph.onNodeAdded = function (node) {
            _onNodeAdded?.call(this, node);
            if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
        };

        const _onNodeRemoved = app.graph.onNodeRemoved;
        app.graph.onNodeRemoved = function (node) {
            _onNodeRemoved?.call(this, node);
            if (node.type === CONTROLLER_TYPE) refreshAllSwitchers();
        };
    },

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        // ── onNodeCreated ─────────────────────────────────────────────────────
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
                node.controllerWidget.options.values = buildControllerList();
                
                // Normal callback
                node.controllerWidget.callback = () => node.updateFromController();
                
                // Long-standing hack that still works: refreshes the list right when the click happens
                node.controllerWidget.onMouseDown = () => {
                    node.controllerWidget.options.values = buildControllerList();
                };
            }

            // Display order
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

            // Extract only the group names from the targeted Controller
            const groupNames = (controllerNode.__state.groups || []).map(g => g.name);
            this.syncInputsWithTargets(groupNames);
        };

        // ── syncInputsWithTargets (THE FIX IS HERE) ─────────────────────
        nodeType.prototype.syncInputsWithTargets = function (groupNames) {
            let changed = false;

            // 1. Isolate ONLY the dynamic inputs we created
            const dynamicInputs = (this.inputs || []).filter(inp => /^input_\d+$/.test(inp.name));

            // 2. Remove ONLY the extra inputs (working backwards from the end so nothing shifts)
            for (let i = dynamicInputs.length - 1; i >= groupNames.length; i--) {
                const inputToRemove = dynamicInputs[i];
                const indexToRemove = this.inputs.indexOf(inputToRemove);
                if (indexToRemove !== -1) {
                    this.removeInput(indexToRemove);
                    changed = true;
                }
            }

            // 3. Update existing labels or cleanly create the missing ones
            groupNames.forEach((groupName, i) => {
                const internalName = `input_${i + 1}`; // What Python expects to receive ("input_1", etc.)
                
                // Check whether this specific input already exists
                const existingInput = (this.inputs || []).find(inp => inp.name === internalName);

                if (existingInput) {
                    // It exists: just update its label (the display)
                    if (existingInput.label !== groupName) {
                        existingInput.label = groupName;
                        changed = true;
                    }
                } else {
                    // It doesn't exist: add it
                    this.addInput(internalName, "*");
                    // LiteGraph always appends to the end of the this.inputs array
                    this.inputs[this.inputs.length - 1].label = groupName;
                    changed = true;
                }
            });

            if (changed) {
                this.updateIndexWidgetLimit(groupNames.length);
                resizeToFitContent(this);
                this.setDirtyCanvas(true, true);
            }
        };

        // ── updateIndexWidgetLimit ────────────────────────────────────────────
        nodeType.prototype.updateIndexWidgetLimit = function (count) {
            if (!this.indexWidget) return;
            this.indexWidget.options.max = Math.max(1, count);
            if (this.indexWidget.value > count || this.indexWidget.value < 1) {
                this.indexWidget.value = 1;
            }
        };

        // ── onConfigure (workflow loading) ────────────────────────────────────
        const _onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            _onConfigure?.apply(this, arguments);
            setTimeout(() => this.updateFromController(), 150);
        };
    },
});
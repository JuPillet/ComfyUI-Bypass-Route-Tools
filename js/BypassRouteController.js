import { app } from "../../scripts/app.js";

// ============================================================================
// CONSTANTS & UTILS
// ============================================================================

const NODE_NAME = "BypassRouteController";
const MAX_LABEL_LENGTH = 35;

/**
 * Capture right-click events to accurately position the context menu.
 * LiteGraph does not natively pass this event down to `getSlotMenuOptions`.
 */
let _lastMouseEvent = null;
document.addEventListener("mousedown", (e) => { if (e.button === 2) _lastMouseEvent = e; }, true);
document.addEventListener("contextmenu", (e) => { _lastMouseEvent = e; }, true);

/**
 * Truncates a string and appends an ellipsis if it exceeds the maximum length.
 * @param {string} title - The original title.
 * @returns {string} The formatted title.
 */
function formatNodeTitle(title) {
  if (!title) return "Unknown Node";
  return title.length > MAX_LABEL_LENGTH 
    ? `${title.substring(0, MAX_LABEL_LENGTH)}...` 
    : title;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Initializes or retrieves the internal state of the controller node.
 * @param {LiteGraph.LGraphNode} node - The current node instance.
 * @returns {Object} The state object { activeIndex, inverted, targets }.
 */
function getState(node) {
  if (!node.__state) {
    node.__state = { activeIndex: 0, inverted: false, targets: [] };
  }
  return node.__state;
}

// ============================================================================
// CORE LOGIC (BYPASS)
// ============================================================================

/**
 * Applies the ComfyUI native Bypass/Active modes to all target nodes
 * based on the current activeIndex and inverted state.
 * @param {LiteGraph.LGraphNode} node - The controller node.
 */
function applyBypassAndValues(node) {
  const { activeIndex, inverted, targets } = getState(node);
  const widgets = node.widgets || [];

  targets.forEach((targetId, idx) => {
    const isSelected = (idx === activeIndex);
    // If inverted is true, the selected node is Active, others are Bypassed.
    // If inverted is false, the selected node is Bypassed, others are Active.
    const shouldBypass = inverted ? !isSelected : isSelected;

    const targetNode = app.graph.getNodeById(targetId);
    if (targetNode) {
      targetNode.mode = shouldBypass ? 4 : 0; // 4: Bypass, 0: Always (Active)
    }

    // Synchronize toggle widget visual state
    const widget = widgets.find(w => w.__targetId === targetId);
    if (widget) {
      widget.value = shouldBypass;
    }
  });

  // Update the hidden selected_index output value
  const activeIndexWidget = widgets.find(w => w.name === "active_index");
  if (activeIndexWidget) {
    activeIndexWidget.value = activeIndex + 1; // Convert 0-based to 1-based index
  }

  app.graph.setDirtyCanvas(true, true);
}

// ============================================================================
// WIDGET MANAGEMENT
// ============================================================================

/**
 * Dynamically updates the names of the toggle widgets if the target node
 * changes its title on the canvas.
 */
function updateToggleNames(node) {
  const state = getState(node);
  const widgets = node.widgets || [];

  state.targets.forEach((targetId) => {
    const targetNode = app.graph.getNodeById(targetId);
    if (!targetNode) return;

    const newTitle = targetNode.title || targetNode.type || `Node ${targetId}`;
    const widget = widgets.find(w => w.__targetId === targetId);

    if (widget && widget.__targetTitle !== newTitle) {
      widget.__targetTitle = newTitle;
      widget.name = formatNodeTitle(newTitle);
      widget.label = widget.name;
    }
  });

  node.setDirtyCanvas(true, true);
}

/**
 * Destroys and reconstructs all toggle widgets sequentially.
 * This guarantees physical array index perfectly matches canvas position.
 */
function rebuildTogglesFromTargets(node) {
  const state = getState(node);
  
  // Clear existing target toggles
  node.widgets = (node.widgets || []).filter(w => !w.__targetId);

  // Rebuild in exact order
  state.targets.forEach((targetId, idx) => {
    const targetNode = app.graph.getNodeById(targetId);
    const title = targetNode ? (targetNode.title || targetNode.type) : `Node ${targetId}`;
    addTargetToggle(node, targetId, title, idx);
  });

  moveAddButtonToBottom(node);
  applyBypassAndValues(node);
  node.setSize(node.computeSize());
}

/**
 * Adds a new toggle widget to control a specific target node.
 */
function addTargetToggle(node, targetId, targetTitle, index) {
  if (node.widgets.find(w => w.__targetId === targetId)) return;

  const { activeIndex, inverted } = getState(node);
  const isActive = (index === activeIndex);
  const initialValue = inverted ? !isActive : isActive;

  const widget = node.addWidget(
    "toggle",
    formatNodeTitle(targetTitle),
    initialValue,
    () => {
      const state = getState(node);
      
      if (state.targets.length === 1) {
        // Single node case: toggle acts as a direct inverted mode switch
        state.inverted = !state.inverted;
        const invWidget = node.widgets.find(w => w.name === "inverted");
        if (invWidget) invWidget.value = state.inverted;
      } else {
        // Standard case: Select the physical line index
        state.activeIndex = widget.__targetIndex;
      }
      
      applyBypassAndValues(node);
    },
    { on: "Bypass", off: "Active" }
  );

  widget.__targetId = targetId;
  widget.__targetIndex = index;
  widget.__targetTitle = targetTitle;
}

/**
 * Ensures the "Add Node" button always remains at the bottom of the widget list.
 */
function moveAddButtonToBottom(node) {
  const widgets = node.widgets || [];
  const idx = widgets.findIndex(w => w.name === "➕ Add Node");
  if (idx === -1) return;
  const btn = widgets.splice(idx, 1)[0];
  widgets.push(btn);
}

// ============================================================================
// ACTIONS (MOVE, REMOVE, ADD)
// ============================================================================

function removeTarget(node, targetIndex) {
  const state = getState(node);
  const targetIdToRemove = state.targets[targetIndex];

  // Safety feature: Force the removed node back to Active mode
  const targetNode = app.graph.getNodeById(targetIdToRemove);
  if (targetNode) {
    targetNode.mode = 0; 
  }

  state.targets.splice(targetIndex, 1);

  // Keep activeIndex within bounds
  if (state.activeIndex >= state.targets.length) {
    state.activeIndex = Math.max(0, state.targets.length - 1);
  }

  rebuildTogglesFromTargets(node);

  // --- AVERTIR LES SWITCHERS (Suppression) ---
  const switchers = app.graph._nodes.filter(n => n.type === "BypassRouteSwitcher");
  switchers.forEach(switcher => {
      if (switcher.updateFromController) switcher.updateFromController();
  });
}

function moveTarget(node, targetIndex, direction) {
  const state = getState(node);
  const newIndex = targetIndex + direction;

  if (newIndex < 0 || newIndex >= state.targets.length) return;

  // Swap array positions (activeIndex remains at its physical line number)
  [state.targets[targetIndex], state.targets[newIndex]] = 
  [state.targets[newIndex], state.targets[targetIndex]];

  rebuildTogglesFromTargets(node);

  // --- AVERTIR LES SWITCHERS (Déplacement) ---
  const switchers = app.graph._nodes.filter(n => n.type === "BypassRouteSwitcher");
  switchers.forEach(switcher => {
      if (switcher.updateFromController) switcher.updateFromController();
  });
}

function showAddNodeMenu(node, event) {
  const currentTargets = getState(node).targets;
  const selfId = node.id;

  const menuItems = app.graph._nodes
    .filter(n => n.id !== selfId && !currentTargets.includes(n.id))
    .map(n => ({
      content: `${n.title || n.type} (id:${n.id})`,
      callback: () => {
        getState(node).targets.push(n.id);
        rebuildTogglesFromTargets(node);

        // --- AVERTIR LES SWITCHERS (Ajout) ---
        const switchers = app.graph._nodes.filter(n => n.type === "BypassRouteSwitcher");
        switchers.forEach(switcher => {
            if (switcher.updateFromController) switcher.updateFromController();
        });
      }
    }));

  if (!menuItems.length) {
    alert("No available nodes to add.");
    return;
  }
  new LiteGraph.ContextMenu(menuItems, { event, title: "Add a node to control" });
}

// ============================================================================
// COMFYUI EXTENSION REGISTRATION
// ============================================================================

app.registerExtension({
  name: `BypassRouteTools.${NODE_NAME}`,

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    // 1. Hover Detection (Hack to trigger getSlotMenuOptions on widgets)
    const _getSlotInPosition = nodeType.prototype.getSlotInPosition;
    nodeType.prototype.getSlotInPosition = function (canvasX, canvasY) {
      const slot = _getSlotInPosition?.call(this, canvasX, canvasY) ?? null;
      if (slot) return slot;

      let hoveredWidget = null;
      for (const w of (this.widgets || [])) {
        if (w.last_y == null) continue;
        if (canvasY > this.pos[1] + w.last_y) { hoveredWidget = w; continue; }
        break;
      }
      
      if (hoveredWidget?.__targetIndex !== undefined) {
        return { widget: hoveredWidget, output: { type: "TOGGLE WIDGET" } };
      }
      return null;
    };

    // 2. Right-Click Context Menu
    const _getSlotMenuOptions = nodeType.prototype.getSlotMenuOptions;
    nodeType.prototype.getSlotMenuOptions = function (slot) {
      if (slot?.widget?.__targetIndex !== undefined) {
        const widget = slot.widget;
        const node = this;
        const state = getState(node);
        const idx = widget.__targetIndex;
        
        const isFirst = idx === 0;
        const isLast = idx === state.targets.length - 1;
        const isBypassed = widget.value === true;
        const shouldSelect = (isBypassed === state.inverted);
        const menuTitle = widget.name + (state.inverted ? "  [⟲ Inverted]" : "");

        new LiteGraph.ContextMenu(
          [
            {
              content: isBypassed ? "⚫ Toggle → Active" : "🟢 Toggle → Bypass",
              callback: () => {
                if (state.targets.length === 1) {
                  state.inverted = !state.inverted;
                  const invWidget = node.widgets.find(w => w.name === "inverted");
                  if (invWidget) invWidget.value = state.inverted;
                } else {
                  state.activeIndex = shouldSelect ? idx : (idx + 1) % state.targets.length;
                }
                applyBypassAndValues(node);
              },
            },
            null,
            { content: "⬆ Move Up", disabled: isFirst, callback: () => !isFirst && moveTarget(node, idx, -1) },
            { content: "⬇ Move Down", disabled: isLast, callback: () => !isLast && moveTarget(node, idx, 1) },
            null,
            { content: "🗑️ Remove", callback: () => removeTarget(node, idx) },
          ],
          { event: _lastMouseEvent, title: menuTitle },
          app.canvas?.getCanvasWindow?.() ?? window
        );

        return null; // Prevent secondary empty menu
      }

      return _getSlotMenuOptions?.call(this, slot) ?? null;
    };

    // 3. Node Creation
    const _onCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      _onCreated?.apply(this, arguments);
      const node = this;
      node.__state = { activeIndex: 0, inverted: false, targets: [] };

      // Hide internal values
      for (const w of (node.widgets || [])) {
        if (["active_index", "inverted"].includes(w.name)) {
          w.type = "hidden";
          w.computeSize = () => [0, -4];
        }
      }

      node.addWidget("toggle", "inverted", false, (value) => {
        getState(node).inverted = value;
        applyBypassAndValues(node);
      }, { on: "Inverted", off: "Normal" });

      node.addWidget("button", "➕ Add Node", null, (val, canvas, nodeWidget, pos, event) => {
        showAddNodeMenu(node, event);
      });

      // Poll for title updates
      if (!node.__titleUpdateInterval) {
        node.__titleUpdateInterval = setInterval(() => {
          if (node.graph) updateToggleNames(node);
        }, 800);
      }

      applyBypassAndValues(node);
    };

    // 4. Node Serialization / Configuration
    const _onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (data) {
      _onConfigure?.apply(this, arguments);
      const state = getState(this);

      state.activeIndex = data.properties?.__activeIndex ?? 0;
      state.inverted = data.properties?.__inverted ?? false;
      state.targets = data.properties?.__targets ?? [];

      rebuildTogglesFromTargets(this);
    };

    const _onSerialize = nodeType.prototype.onSerialize;
    nodeType.prototype.onSerialize = function (data) {
      _onSerialize?.apply(this, arguments);
      if (!data.properties) data.properties = {};
      const state = getState(this);
      
      data.properties.__activeIndex = state.activeIndex;
      data.properties.__inverted = state.inverted;
      data.properties.__targets = state.targets;
    };

    // 5. Node Resizing
    const _computeSize = nodeType.prototype.computeSize;
    nodeType.prototype.computeSize = function () {
      const size = _computeSize?.apply(this, arguments) ?? [280, 100];
      size[0] = Math.max(size[0], 320);
      const toggleCount = (getState(this).targets || []).length;
      size[1] = Math.max(size[1], 140 + toggleCount * 32);
      return size;
    };
  },
});
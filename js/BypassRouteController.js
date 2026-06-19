import { app } from "../../scripts/app.js";

const NODE_NAME = "BypassRouteController";

// Dispatched on `window` whenever a Controller node's own title changes
// (renamed via the canvas title bar). BypassRouteSwitcher.js listens for
// this to refresh its controller dropdown — no polling involved. Must match
// the identical string literal in BypassRouteSwitcher.js.
const CONTROLLER_RENAMED_EVENT = "bypass-route-tools:controller-renamed";

// Fraction (from the left) of the group widget considered the
// "name zone": a click here opens inline renaming. The rest (on the
// right, where the "Bypass"/"Active" text is shown) toggles the active group.
const RENAME_ZONE_RATIO = 0.6;

let _lastMouseEvent = null;
document.addEventListener("mousedown", (e) => { if (e.button === 2) _lastMouseEvent = e; }, true);
document.addEventListener("contextmenu", (e) => { _lastMouseEvent = e; }, true);

// Keeps a reference to the inline edit currently in progress (DOM input +
// repositioning loop) so it can be cleaned up/committed properly if a new
// edit starts elsewhere before the previous one finishes.
let _activeInlineEdit = null;

function getState(node) {
  if (!node.__state) {
    node.__state = { activeIndex: 0, inverted: false, groups: [] };
  }
  return node.__state;
}

/** Sets `inverted` and keeps the visible "Inverted"/"Normal" toggle widget in sync. */
function setInverted(node, value) {
  getState(node).inverted = value;
  const w = (node.widgets || []).find(w => w.name === "inverted");
  if (w) w.value = value;
}

/**
 * Keeps the node's size in sync with its content after every change:
 * width is preserved (or grown if it no longer fits, but never shrunk back
 * down — so a width the user picked by dragging survives), while height is
 * always recomputed to exactly match the current content, so it shrinks
 * immediately on any removal (group, node, etc.) instead of leaving empty
 * space, and grows immediately when content is added.
 */
function resizeToFitContent(node) {
  const currentWidth = node.size[0];
  // `computeSize()` can return max(current size, natural size) in some
  // LiteGraph versions instead of the true minimum — meaning it never
  // reports a smaller height once the node has been made taller. Shrinking
  // the node first means there's nothing left for it to anchor to, so the
  // recomputed value reflects only the widgets actually present right now.
  node.size = [currentWidth, 1];
  const natural = node.computeSize();
  node.setSize([
    Math.max(currentWidth, natural[0]),
    natural[1],
  ]);
}

function isConflict(nodeId, controllerNode) {
  const { activeIndex, groups } = getState(controllerNode);
  const inActive = (groups[activeIndex]?.nodes || []).includes(nodeId);
  if (!inActive) return false;
  return groups.some((g, i) => i !== activeIndex && g.nodes.includes(nodeId));
}

function applyBypassAndValues(node) {
  const { activeIndex, inverted, groups } = getState(node);
  const allIds = new Set();
  groups.forEach(g => g.nodes.forEach(id => allIds.add(id)));

  allIds.forEach(nodeId => {
    const inActive = (groups[activeIndex]?.nodes || []).includes(nodeId);
    const inOther = groups.some((g, i) => i !== activeIndex && g.nodes.includes(nodeId));
    const bypass = (inActive && inOther) ? false : (inverted ? !inActive : inActive);

    const tn = app.graph.getNodeById(nodeId);
    if (tn) tn.mode = bypass ? 4 : 0;
  });

  (node.widgets || []).forEach(w => {
    if (w.__isGroupWidget) {
      const isSel = w.__groupIndex === activeIndex;
      w.value = inverted ? !isSel : isSel;
    }
  });

  const aiw = (node.widgets || []).find(w => w.name === "active_index");
  if (aiw) aiw.value = activeIndex + 1;

  app.graph.setDirtyCanvas(true, true);
}

function rebuildGroupWidgets(node) {
  const state = getState(node);

  const perm = (node.widgets || []).filter(w =>
    !w.__isGroupWidget && !w.__isNodeWidget && !w.__isAddNodeWidget
  );

  const groupWidgets = [];

  state.groups.forEach((group, idx) => {
    const isSel = idx === state.activeIndex;
    const bypassed = state.inverted ? !isSel : isSel;

    const gw = {
      name: group.name,
      type: "toggle",
      value: bypassed,
      options: { on: "Bypass", off: "Active" },
      __isGroupWidget: true,
      __groupIndex: idx,
    };
    
    // ── Click on the name = inline rename / Click on the toggle = switch active ──
    // NOTE: the previous code compared `pos[0]` (an absolute coordinate in
    // the graph, not local to the node) against `node.size[0] * 0.6`: this
    // test didn't actually depend on where you clicked inside the widget,
    // but on the NODE's position on the canvas, which opened the rename
    // prompt instead of switching the group. `localXFromEvent` recomputes
    // the real click position from `event.clientX`, which is reliable.
    gw.callback = (val, canvas, w, pos, event) => {
      const isDoubleClick = event && event.detail >= 2;
      const localX = localXFromEvent(node, event);
      const clickedNameZone = localX != null && localX < node.size[0] * RENAME_ZONE_RATIO;

      if (isDoubleClick || clickedNameZone) {
        // Cancel the toggle's automatic visual flip and open the inline editor
        applyBypassAndValues(node);
        startInlineRename(node, gw.__groupIndex);
        return;
      }

      const s = getState(node);
      if (s.groups.length === 1) {
        // With a single group there's no "other" group to switch away
        // from, so just re-selecting it would be a no-op and its state
        // would stay stuck. Flip its Bypass/Active state directly instead
        // — equivalent to flipping Inverted, since with one group they're
        // the same thing, but without forcing a trip through that widget.
        setInverted(node, !s.inverted);
      } else {
        // Click on the toggle zone (right side): this group becomes the active group
        s.activeIndex = gw.__groupIndex;
      }
      applyBypassAndValues(node);
      notifySwitchers(node);
    };
    groupWidgets.push(gw);

    group.nodes.forEach((nodeId, ni) => {
      const tn = app.graph.getNodeById(nodeId);
      const baseName = tn?.title || tn?.type || `Node ${nodeId}`;
      const name = baseName.substring(0, 28);
      const conf = isConflict(nodeId, node);
      const label = `  ${conf ? "⚠ " : ""}${name}`;

      const nw = {
        name: label, type: "button", value: null,
        __isNodeWidget: true, __nodeGroupIdx: idx, __nodeIdx: ni,
        __nodeId: nodeId, __lastTitle: baseName
      };
      // Left-click is intentionally inert: right-click → Move Up / Move
      // Down / Remove Node is now the only way to act on a node row, so a
      // stray click no longer silently removes it from the group.
      nw.callback = () => {};
      groupWidgets.push(nw);
    });

    const aw = {
      name: "➕ Add Node", type: "button", value: null,
      __isAddNodeWidget: true, __addToGroupIdx: idx,
    };
    aw.callback = (val, canvas, w, pos, event) => {
      showAddNodeToGroupMenu(node, aw.__addToGroupIdx, event || _lastMouseEvent);
    };
    groupWidgets.push(aw);
  });

  const newGroupIdx = perm.findIndex(w => w.name === "➕ New Group");
  if (newGroupIdx >= 0) perm.splice(newGroupIdx, 0, ...groupWidgets);
  else perm.push(...groupWidgets);

  node.widgets = perm;
  applyBypassAndValues(node);
  resizeToFitContent(node);
}

function syncNodeTitles(node) {
  let changed = false;
  (node.widgets || []).forEach(w => {
    if (w.__isNodeWidget) {
      const tn = app.graph.getNodeById(w.__nodeId);
      if (tn) {
        const currentName = tn.title || tn.type || `Node ${w.__nodeId}`;
        if (w.__lastTitle !== currentName) {
          w.__lastTitle = currentName;
          const conf = isConflict(w.__nodeId, node);
          w.name = `  ${conf ? "⚠ " : ""}${currentName.substring(0, 28)}`;
          changed = true;
        }
      }
    }
  });
  if (changed) node.setDirtyCanvas(true, true);
}

function createNewGroup(controllerNode) {
  const name = prompt("Group name:", "New Group");
  if (name === null) return;
  getState(controllerNode).groups.push({ name: name.trim() || "New Group", nodes: [] });
  rebuildGroupWidgets(controllerNode);
  notifySwitchers(controllerNode);
}

function removeGroup(node, groupIdx) {
  const state = getState(node);
  const removedIds = [...(state.groups[groupIdx]?.nodes || [])];

  state.groups.splice(groupIdx, 1);
  if (state.activeIndex >= state.groups.length) {
    state.activeIndex = Math.max(0, state.groups.length - 1);
  }

  removedIds.forEach(id => {
    if (!state.groups.some(g => g.nodes.includes(id))) {
      const tn = app.graph.getNodeById(id);
      if (tn) tn.mode = 0;
    }
  });

  rebuildGroupWidgets(node);
  notifySwitchers(node);
}

function moveGroup(node, groupIdx, direction) {
  const state  = getState(node);
  const newIdx = groupIdx + direction;
  if (newIdx < 0 || newIdx >= state.groups.length) return;

  [state.groups[groupIdx], state.groups[newIdx]] = [state.groups[newIdx], state.groups[groupIdx]];

  if (state.activeIndex === groupIdx) state.activeIndex = newIdx;
  else if (state.activeIndex === newIdx) state.activeIndex = groupIdx;

  rebuildGroupWidgets(node);
  notifySwitchers(node);
}

function removeNodeFromGroup(node, groupIdx, nodeIdx) {
  const state = getState(node);
  const group = state.groups[groupIdx];
  if (!group) return;
  group.nodes.splice(nodeIdx, 1);
  applyBypassAndValues(node);
  rebuildGroupWidgets(node);
  notifySwitchers(node);
}

function moveNodeInGroup(node, groupIdx, nodeIdx, direction) {
  const state = getState(node);
  const group = state.groups[groupIdx];
  if (!group) return;
  const newIdx = nodeIdx + direction;
  if (newIdx < 0 || newIdx >= group.nodes.length) return;
  [group.nodes[nodeIdx], group.nodes[newIdx]] = [group.nodes[newIdx], group.nodes[nodeIdx]];
  rebuildGroupWidgets(node);
  notifySwitchers(node);
}

function notifySwitchers(controllerNode) {
  (app.graph?._nodes || [])
    .filter(n => n.type === "BypassRouteSwitcher")
    .forEach(s => s.updateFromController?.());
}

// ============================================================================
// INLINE RENAME (DOM input overlaid directly on the widget, no popup)
// ============================================================================

/** Converts a graph-space [x, y] coordinate to page/client pixel coordinates. */
function graphToClient(gx, gy) {
  const canvas = app.canvas;
  const rect = canvas.canvas.getBoundingClientRect();
  const scale = canvas.ds.scale;
  const offset = canvas.ds.offset;
  const px = (gx + offset[0]) * scale;
  const py = (gy + offset[1]) * scale;
  const ratioX = rect.width / canvas.canvas.width;
  const ratioY = rect.height / canvas.canvas.height;
  return [px * ratioX + rect.left, py * ratioY + rect.top, scale * ratioX, scale * ratioY];
}

/**
 * Returns the X position of a click, in local node coordinates (0 = left
 * edge of the node), computed directly from the raw mouse event's
 * `clientX` and the canvas's own pan/zoom transform (`app.canvas.ds`).
 *
 * We deliberately do NOT use the `pos` argument LiteGraph passes to widget
 * callbacks: that value is in graph (canvas) space, not local to the node,
 * which is exactly what caused the original rename/toggle mix-up (comparing
 * an absolute graph coordinate against `node.size[0] * ratio`). Re-deriving
 * the position from the real screen click is unambiguous regardless of
 * where the node sits on the canvas.
 */
function localXFromEvent(node, event) {
  if (!event || event.clientX == null) return null;
  const canvas = app.canvas;
  if (!canvas?.canvas || !canvas?.ds) return null;
  const rect = canvas.canvas.getBoundingClientRect();
  const scale = canvas.ds.scale;
  const offset = canvas.ds.offset;
  const pixelRatio = canvas.canvas.width / rect.width;
  const canvasPixelX = (event.clientX - rect.left) * pixelRatio;
  const graphX = canvasPixelX / scale - offset[0];
  return graphX - node.pos[0];
}

/**
 * Opens an inline text editor directly over a group's toggle widget
 * (a real DOM <input>, positioned/sized to match the widget) so the user
 * types the new name in place, instead of a browser prompt()/popup.
 */
function startInlineRename(node, idx) {
  // If an edit is already in progress (on this node or another one), commit
  // it cleanly before opening a new one.
  _activeInlineEdit?.commit();

  const state = getState(node);
  const group = state.groups[idx];
  if (!group) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = group.name;
  input.spellcheck = false;
  input.style.cssText = `
    position: fixed; z-index: 10000; box-sizing: border-box;
    background: #1c1c1c; color: #fff; border: 1px solid #999;
    border-radius: 3px; font-family: Arial, sans-serif;
    outline: none; padding: 0 6px;
  `;
  document.body.appendChild(input);

  let finished = false;
  let raf = null;

  function reposition() {
    if (finished) return;
    const gw = (node.widgets || []).find(w => w.__isGroupWidget && w.__groupIndex === idx);
    if (!gw || gw.last_y == null || !node.graph) { commit(); return; }

    const widgetHeight = LiteGraph.NODE_WIDGET_HEIGHT || 20;
    const [screenX, screenY, scaleX, scaleY] = graphToClient(node.pos[0], node.pos[1] + gw.last_y);
    const widthScreen = node.size[0] * scaleX;
    const heightScreen = widgetHeight * scaleY;

    input.style.left = `${screenX + 4 * scaleX}px`;
    input.style.top = `${screenY + 2 * scaleY}px`;
    input.style.width = `${Math.max(30, widthScreen - 8 * scaleX)}px`;
    input.style.height = `${Math.max(12, heightScreen - 4 * scaleY)}px`;
    input.style.fontSize = `${Math.max(9, 11 * scaleX)}px`;
    input.style.lineHeight = input.style.height;

    raf = requestAnimationFrame(reposition);
  }

  function cleanup() {
    finished = true;
    if (raf) cancelAnimationFrame(raf);
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("blur", onBlur);
    input.remove();
    if (_activeInlineEdit?.commit === commit) _activeInlineEdit = null;
  }

  function commit() {
    if (finished) return;
    const val = input.value.trim();
    cleanup();
    if (val && val !== group.name) {
      getState(node).groups[idx].name = val;
      rebuildGroupWidgets(node);
      notifySwitchers(node);
    } else {
      applyBypassAndValues(node);
    }
  }

  function cancel() {
    if (finished) return;
    cleanup();
    applyBypassAndValues(node);
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
  }

  function onBlur() { commit(); }

  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", onBlur);
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  input.addEventListener("pointerdown", (e) => e.stopPropagation());

  _activeInlineEdit = { commit };

  reposition();
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

// ============================================================================
// ADD NODE MENU
// ============================================================================
function showSearchableNodePanel(candidates, event, title, onSelect) {
  document.getElementById("__brc_search_panel__")?.remove();

  const panel = document.createElement("div");
  panel.id = "__brc_search_panel__";
  panel.style.cssText = `
    position: fixed; z-index: 9999;
    top: ${event.clientY}px; left: ${event.clientX}px;
    background: #1c1c1c; border: 1px solid #555; border-radius: 5px;
    min-width: 230px; max-width: 360px;
    box-shadow: 4px 4px 14px rgba(0,0,0,0.65);
    font-size: 13px; color: #ccc; font-family: Arial, sans-serif; overflow: hidden;
  `;

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    padding: 6px 10px; background: #2a2a2a; color: #999; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.8px;
    border-bottom: 1px solid #3a3a3a; user-select: none;
  `;

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍  Filter...";
  searchInput.style.cssText = `
    width: 100%; padding: 7px 10px; background: #242424;
    border: none; border-bottom: 1px solid #3a3a3a;
    color: #ddd; font-size: 12px; outline: none; box-sizing: border-box;
  `;

  const list = document.createElement("div");
  list.style.cssText = "max-height: 280px; overflow-y: auto;";

  function renderList(filter = "") {
    list.innerHTML = "";
    const lower = filter.toLowerCase();
    const filtered = candidates.filter(n =>
      !filter || (n.title || n.type || "").toLowerCase().includes(lower) || String(n.id).includes(lower)
    );
    if (!filtered.length) {
      const msg = document.createElement("div");
      msg.textContent = "No results";
      msg.style.cssText = "padding: 8px 12px; color: #555; font-style: italic;";
      list.appendChild(msg);
      return;
    }
    filtered.forEach(n => {
      const item = document.createElement("div");
      item.textContent = `${n.title || n.type} (id:${n.id})`;
      item.style.cssText = "padding: 6px 12px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
      item.addEventListener("mouseenter", () => { item.style.background = "#2e2e2e"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
      item.addEventListener("mousedown",  (e) => { e.stopPropagation(); onSelect(n); closePanel(); });
      list.appendChild(item);
    });
  }

  function closePanel() {
    panel.remove();
    document.removeEventListener("mousedown", outsideHandler, true);
    document.removeEventListener("pointerdown", outsideHandler, true);
  }
  
  function outsideHandler(e) { 
    if (!e.composedPath().includes(panel)) closePanel(); 
  }

  searchInput.addEventListener("input",   () => renderList(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") closePanel();
    if (e.key === "Enter") {
      const first = list.querySelector("div");
      if (first && first.textContent !== "No results")
        first.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }
  });

  panel.addEventListener("mousedown", e => e.stopPropagation());
  panel.addEventListener("pointerdown", e => e.stopPropagation());

  panel.appendChild(titleEl);
  panel.appendChild(searchInput);
  panel.appendChild(list);
  document.body.appendChild(panel);

  requestAnimationFrame(() => {
    const r = panel.getBoundingClientRect();
    if (r.right  > window.innerWidth)  panel.style.left = `${event.clientX - r.width}px`;
    if (r.bottom > window.innerHeight) panel.style.top  = `${event.clientY - r.height}px`;
  });
  
  renderList();
  setTimeout(() => { 
    searchInput.focus(); 
    document.addEventListener("mousedown", outsideHandler, true);
    document.addEventListener("pointerdown", outsideHandler, true);
  }, 10);
}

function showAddNodeToGroupMenu(controllerNode, groupIdx, event) {
  const state = getState(controllerNode);
  const group = state.groups[groupIdx];
  if (!group) return;

  const selfId = controllerNode.id;
  const candidates = (app.graph._nodes || []).filter(n => n.id !== selfId && !group.nodes.includes(n.id));

  if (!candidates.length) {
    alert(`All available nodes are already in "${group.name}".`);
    return;
  }

  showSearchableNodePanel(candidates, event, `Add to: ${group.name}`, (selected) => {
    group.nodes.push(selected.id);
    applyBypassAndValues(controllerNode);
    rebuildGroupWidgets(controllerNode);
    notifySwitchers(controllerNode);
  });
}

// ============================================================================
// COMFYUI EXTENSION
// ============================================================================
app.registerExtension({
  name: `BypassRouteTools.${NODE_NAME}`,

  setup() {
    const _onNodeRemoved = app.graph.onNodeRemoved;
    app.graph.onNodeRemoved = function (node) {
      _onNodeRemoved?.apply(this, arguments);

      (app.graph?._nodes || []).filter(n => n.type === NODE_NAME).forEach(c => {
        let changed = false;
        getState(c).groups.forEach(g => {
          const idx = g.nodes.indexOf(node.id);
          if (idx !== -1) {
            g.nodes.splice(idx, 1);
            changed = true;
          }
        });
        if (changed) {
          applyBypassAndValues(c);
          rebuildGroupWidgets(c);
          notifySwitchers(c);
        }
      });
    };

    const _onNodeTitleChanged = app.graph.onNodeTitleChanged;
    app.graph.onNodeTitleChanged = function (node) {
      _onNodeTitleChanged?.apply(this, arguments);
      (app.graph?._nodes || []).filter(n => n.type === NODE_NAME).forEach(c => {
        if (getState(c).groups.some(g => g.nodes.includes(node.id))) {
          syncNodeTitles(c);
        }
      });
    };
  },

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const _getSlotInPosition = nodeType.prototype.getSlotInPosition;
    nodeType.prototype.getSlotInPosition = function (canvasX, canvasY) {
      const slot = _getSlotInPosition?.call(this, canvasX, canvasY) ?? null;
      if (slot) return slot;

      let hovered = null;
      for (const w of (this.widgets || [])) {
        if (w.last_y == null) continue;
        if (canvasY > this.pos[1] + w.last_y) hovered = w;
        else break;
      }
      if (hovered?.__isGroupWidget) {
        return { widget: hovered, output: { type: "GROUP" } };
      }
      if (hovered?.__isNodeWidget) {
        return { widget: hovered, output: { type: "GROUP_NODE" } };
      }
      return null;
    };

    const _getSlotMenuOptions = nodeType.prototype.getSlotMenuOptions;
    nodeType.prototype.getSlotMenuOptions = function (slot) {
      if (slot?.widget?.__isGroupWidget) {
        const idx = slot.widget.__groupIndex;
        const state = getState(this);
        const isFirst = idx === 0;
        const isLast = idx === state.groups.length - 1;

        new LiteGraph.ContextMenu([
          { content: "✏️ Rename", callback: () => {
            startInlineRename(this, idx);
          }},
          null,
          { content: "⬆ Move Up", disabled: isFirst, callback: () => moveGroup(this, idx, -1) },
          { content: "⬇ Move Down", disabled: isLast, callback: () => moveGroup(this, idx, 1) },
          null,
          { content: "🗑️ Remove group", callback: () => removeGroup(this, idx) }
        ], { event: _lastMouseEvent, title: state.groups[idx]?.name });
        return null;
      }

      if (slot?.widget?.__isNodeWidget) {
        const w = slot.widget;
        const groupIdx = w.__nodeGroupIdx;
        const nodeIdx = w.__nodeIdx;
        const group = getState(this).groups[groupIdx];
        if (!group) return null;
        const isFirst = nodeIdx === 0;
        const isLast = nodeIdx === group.nodes.length - 1;

        new LiteGraph.ContextMenu([
          { content: "⬆ Move Up", disabled: isFirst, callback: () => moveNodeInGroup(this, groupIdx, nodeIdx, -1) },
          { content: "⬇ Move Down", disabled: isLast, callback: () => moveNodeInGroup(this, groupIdx, nodeIdx, 1) },
          null,
          { content: "🗑️ Remove Node", callback: () => removeNodeFromGroup(this, groupIdx, nodeIdx) }
        ], { event: _lastMouseEvent, title: w.__lastTitle });
        return null;
      }
      return _getSlotMenuOptions?.call(this, slot) ?? null;
    };

    const _onCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      _onCreated?.apply(this, arguments);
      const node = this;
      node.__state = { activeIndex: 0, inverted: false, groups: [] };

      // Reacts to renames of the Controller node itself, with no polling:
      // LiteGraph's native title-rename UI ultimately performs a plain
      // `node.title = newValue` assignment (whichever path the user used —
      // double-clicking the title bar, an inline editor, etc.), so shadowing
      // `title` with a getter/setter lets us react to that write the instant
      // it happens and broadcast it for any Switcher to pick up.
      let _title = node.title;
      Object.defineProperty(node, "title", {
        configurable: true,
        enumerable: true,
        get() { return _title; },
        set(value) {
          if (_title === value) return;
          _title = value;
          window.dispatchEvent(new CustomEvent(CONTROLLER_RENAMED_EVENT));
        },
      });

      for (const w of (node.widgets || [])) {
        if (["active_index", "inverted"].includes(w.name)) {
          w.type = "hidden";
          w.computeSize = () => [0, -4];
        }
      }

      node.addWidget("toggle", "inverted", false, () => {
        // Don't trust the value LiteGraph auto-flips internally on this
        // widget — if `inverted` was changed elsewhere (e.g. clicking a
        // single group's row toggles it directly too), LiteGraph's own
        // tracked value can fall out of sync with our actual state, making
        // the next click here look like it does nothing. Always flip from
        // our own state instead, so this always inverts immediately.
        setInverted(node, !getState(node).inverted);
        applyBypassAndValues(node);
      }, { on: "Inverted", off: "Normal" });

      node.addWidget("button", "➕ New Group", null, () => createNewGroup(node));

      if (!this.__titleSyncInterval) {
        this.__titleSyncInterval = setInterval(() => {
          if (this.graph) syncNodeTitles(this);
        }, 1000);
      }
    };

    const _onRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function () {
      _onRemoved?.apply(this, arguments);
      if (this.__titleSyncInterval) {
        clearInterval(this.__titleSyncInterval);
        this.__titleSyncInterval = null;
      }
    };

    const _onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (data) {
      _onConfigure?.apply(this, arguments);
      const state = getState(this);
      state.activeIndex = data.properties?.__activeIndex ?? 0;
      state.inverted = data.properties?.__inverted ?? false;
      state.groups = data.properties?.__groups ?? [];
      rebuildGroupWidgets(this);
    };

    const _onSerialize = nodeType.prototype.onSerialize;
    nodeType.prototype.onSerialize = function (data) {
      _onSerialize?.apply(this, arguments);
      if (!data.properties) data.properties = {};
      const state = getState(this);
      data.properties.__activeIndex = state.activeIndex;
      data.properties.__inverted = state.inverted;
      data.properties.__groups = state.groups;
    };
  }
});
(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function ensureId(id) {
    return id ? String(id) : "kt-action-" + Math.random().toString(36).slice(2);
  }

  const Actions = {
    add(container, spec={}) {
      if (!container) return null;
      const id = ensureId(spec.id);
      const existing = document.getElementById(id);
      if (existing) return existing;

      const tag = spec.href ? "a" : "button";
      const el = document.createElement(tag);
      el.id = id;
      el.className = spec.className || "btn btn-default btn-sm kt-action";
      if (tag === "button") el.type = "button";
      if (spec.href) {
        el.href = spec.href;
        if (spec.target) el.target = spec.target;
      }
      if (spec.icon) {
        const i = document.createElement("i");
        i.className = spec.icon;
        i.setAttribute("aria-hidden","true");
        el.appendChild(i);
        el.appendChild(document.createTextNode(" "));
      }
      el.appendChild(document.createTextNode(spec.label || ""));
      if (spec.title) el.title = spec.title;
      if (typeof spec.onClick === "function") el.addEventListener("click", spec.onClick);
      container.appendChild(el);
      return el;
    },

    move(element, target, position="append") {
      if (!element || !target) return false;
      if (position === "prepend") target.prepend(element);
      else if (position === "before") target.before(element);
      else if (position === "after") target.after(element);
      else target.append(element);
      return true;
    },

    remove(idOrElement) {
      const el = typeof idOrElement === "string" ? document.getElementById(idOrElement) : idOrElement;
      if (el) el.remove();
    },

    toggle(idOrElement, visible) {
      const el = typeof idOrElement === "string" ? document.getElementById(idOrElement) : idOrElement;
      if (!el) return;
      el.hidden = !visible;
    }
  };

  KT.registerService("actions",Actions);
})(window);
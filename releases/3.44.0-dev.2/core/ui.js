(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function toast(message, options={}) {
    const id = options.id || "kt-toast";
    document.getElementById(id)?.remove();
    const el = document.createElement("div");
    el.id = id;
    el.className = "kt-toast";
    el.setAttribute("role","status");
    el.textContent = String(message || "");
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add("is-visible"));
    setTimeout(()=>{
      el.classList.remove("is-visible");
      setTimeout(()=>el.remove(),200);
    }, options.duration ?? 1600);
    return el;
  }

  function tooltip(input, text, options={}) {
    if (!input || !text) return null;
    const wrap = document.createElement("div");
    wrap.className = "kt-tooltip";
    wrap.textContent = text;
    wrap.hidden = true;
    document.body.appendChild(wrap);

    const show = () => {
      const r = input.getBoundingClientRect();
      wrap.hidden = false;
      wrap.style.left = `${Math.max(8, r.left + window.scrollX)}px`;
      wrap.style.top = `${r.bottom + window.scrollY + 6}px`;
      wrap.style.maxWidth = options.maxWidth || "420px";
    };
    const hide = () => { wrap.hidden = true; };

    input.addEventListener("mouseenter",show);
    input.addEventListener("mouseleave",hide);
    input.addEventListener("focus",show);
    input.addEventListener("blur",hide);
    return {element:wrap,destroy(){wrap.remove();}};
  }

  KT.registerService("ui",{toast,tooltip});
})(window);
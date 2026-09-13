(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function enabled() {
    const qs = new URLSearchParams(location.search);
    return qs.get("kt_debug") === "1" || KT.Config?.effective?.diagnostics?.showPanel === true;
  }

  function mount() {
    if (!enabled() || document.getElementById("kt-diagnostics")) return;

    const box = document.createElement("details");
    box.id = "kt-diagnostics";
    box.className = "kt-diagnostics";
    box.innerHTML = `
      <summary>KohaTools · diagnostic</summary>
      <div class="kt-diagnostics-actions">
        <button type="button" data-kt-action="refresh">Actualiser</button>
        <button type="button" data-kt-action="clear-overrides">Réinitialiser mes tests</button>
      </div>
      <pre data-kt-output></pre>
    `;
    document.body.appendChild(box);

    const output = box.querySelector("[data-kt-output]");
    const render = () => {
      output.textContent = JSON.stringify({
        version: KT.version,
        localOverrides: KT.getLocalOverrides(),
        diagnostics: KT.diagnostics
      }, null, 2);
    };
    box.addEventListener("click", (e) => {
      const a = e.target?.dataset?.ktAction;
      if (a === "refresh") render();
      if (a === "clear-overrides") {
        KT.clearLocalOverrides();
        render();
      }
    });
    KT.on("koha-tools:diagnostic", render);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, {once:true});
  } else {
    mount();
  }
})(window);
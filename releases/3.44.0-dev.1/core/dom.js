(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  const DOM = {
    ready() {
      if (document.readyState !== "loading") return Promise.resolve();
      return new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once:true }));
    },

    waitFor(selector, options = {}) {
      const root = options.root || document;
      const timeout = options.timeout ?? 10000;

      const existing = root.querySelector(selector);
      if (existing) return Promise.resolve(existing);

      return new Promise((resolve, reject) => {
        let timer = null;
        const obs = new MutationObserver(() => {
          const el = root.querySelector(selector);
          if (!el) return;
          obs.disconnect();
          if (timer) clearTimeout(timer);
          resolve(el);
        });
        obs.observe(root === document ? document.documentElement : root, {
          childList: true,
          subtree: true
        });
        if (timeout > 0) {
          timer = setTimeout(() => {
            obs.disconnect();
            reject(new Error("Élément introuvable: " + selector));
          }, timeout);
        }
      });
    }
  };

  KT.registerService("dom", DOM);
})(window);
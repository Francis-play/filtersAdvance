// ==UserScript==
// @name         AdGuard Filter Auto-Updater + Dynamic DOM Blocking
// @namespace    https://tuwebpersonal.com
// @version      1.1
// @description  Bloquea anuncios usando filtros cosméticos de AdGuard, detectando cambios dinámicos en el DOM automáticamente cada 24 horas.
// @author       Tú
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const FILTER_URL = 'https://filters.adtidy.org/extension/chromium/filters/2.txt';
    const UPDATE_INTERVAL_HOURS = 24; // cada 24 horas

    const STORAGE_KEY = 'adguard_filters';
    const LAST_UPDATE_KEY = 'adguard_filters_last_update';

    let currentSelectors = [];

    async function fetchFilters() {
        try {
            const response = await fetch(FILTER_URL);
            const text = await response.text();

            const selectors = text
                .split('\n')
                .filter(line => {
                    line = line.trim();
                    return line && !line.startsWith('!') && !line.includes('##+') && line.includes('##');
                })
                .map(line => {
                    const parts = line.split('##');
                    return parts[1]?.trim();
                })
                .filter(Boolean);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectors));
            localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());

            console.log(`[AdGuard Filter] Filtros actualizados. ${selectors.length} selectores cargados.`);
            return selectors;
        } catch (e) {
            console.error('[AdGuard Filter] Error al actualizar filtros:', e);
            return [];
        }
    }

    function applySelectors(selectors, context=document) {
        selectors.forEach(selector => {
            try {
                context.querySelectorAll(selector).forEach(el => el.remove());
            } catch (e) {
                // Algunos selectores inválidos podrían causar errores
                console.warn(`[AdGuard Filter] Selector inválido ignorado: ${selector}`);
            }
        });
    }

    function observeDom(selectors) {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        applySelectors(selectors, node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[AdGuard Filter] Observando cambios dinámicos en el DOM...');
    }

    async function init() {
        const lastUpdate = parseInt(localStorage.getItem(LAST_UPDATE_KEY) || '0', 10);
        const now = Date.now();
        const hoursSinceLastUpdate = (now - lastUpdate) / (1000 * 60 * 60);

        if (hoursSinceLastUpdate > UPDATE_INTERVAL_HOURS) {
            console.log('[AdGuard Filter] Actualizando filtros desde AdGuard...');
            currentSelectors = await fetchFilters();
        } else {
            console.log('[AdGuard Filter] Cargando filtros desde cache...');
            currentSelectors = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        }

        if (currentSelectors.length > 0) {
            applySelectors(currentSelectors);
            observeDom(currentSelectors);
        }
    }

    init();

})();

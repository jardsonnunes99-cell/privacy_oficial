(function() {
    "use strict";

    const DEBUG = true;
    const API_BASE = "https://tracking.utmify.com.br/tracking/v1";

    function log(msg, ...args) {
        if (DEBUG) console.log(`[UTMify] ${msg}`, ...args);
    }

    function logSuccess(msg) {
        console.log(`%c[UTMify] ${msg}`, "color: #2ecc71; font-weight: bold; border: 1px solid #2ecc71; padding: 2px 5px; border-radius: 3px;");
    }

    class Utils {
        static getParam(key) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(key) || localStorage.getItem('utmify_' + key) || null;
        }

        static getFbc() {
            const fbc = this.getParam('fbclid');
            if (!fbc) return localStorage.getItem('_fbc') || null;
            return `fb.1.${Date.now()}.${fbc}`;
        }

        static getFbp() {
            return localStorage.getItem('_fbp') || null;
        }

        static getEventData() {
            return {
                sourceUrl: window.location.href.split('?')[0],
                pageTitle: document.title || ""
            };
        }

        static sanitize(obj) {
            const clean = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    clean[key] = (obj[key] === null) ? null : obj[key];
                }
            }
            return clean;
        }
    }

    class Tracker {
        constructor() {
            this.inited = false;
            this.trackedEvents = [];
        }

        init() {
            if (this.inited) return;
            this.inited = true;
            log("Tracker Initialized");
            this.track("PageView");
        }

        async track(eventType, extraData = {}) {
            try {
                // Prevent duplicate PageViews
                if (eventType === "PageView" && this.trackedEvents.includes("PageView")) return;
                if (eventType === "PageView") this.trackedEvents.push("PageView");

                const pixelId = window.pixelId || "";
                
                const lead = Utils.sanitize({
                    pixelId: pixelId,
                    userAgent: navigator.userAgent,
                    fbc: Utils.getFbc(),
                    fbp: Utils.getFbp(),
                    utm_source: Utils.getParam('utm_source'),
                    utm_medium: Utils.getParam('utm_medium'),
                    utm_campaign: Utils.getParam('utm_campaign'),
                    utm_content: Utils.getParam('utm_content'),
                    utm_term: Utils.getParam('utm_term'),
                    src: Utils.getParam('src'),
                    xcod: Utils.getParam('xcod'),
                    sck: Utils.getParam('sck'),
                    parameters: window.location.search,
                    ip: null, // Server will capture
                    ipv6: null
                });

                const payload = Utils.sanitize({
                    type: eventType,
                    lead: lead,
                    event: Utils.getEventData(),
                    ...extraData
                });

                log(`Sending ${eventType}...`, payload);

                const response = await fetch(`${API_BASE}/events`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    logSuccess(`Event: ${eventType} sent successfully`);
                    const data = await response.json();
                    if (data && data.lead && data.lead._id) {
                        localStorage.setItem('utmify_lead_id', data.lead._id);
                    }
                    return data;
                } else {
                    const errorText = await response.text();
                    console.error(`[UTMify] Error ${response.status}: ${errorText}`);
                }
            } catch (err) {
                console.error(`[UTMify] Fatal error in track(${eventType}):`, err);
            }
        }
    }

    // Export to window
    window.Tracker = new Tracker();
    
    // Auto-init if DOM is ready
    if (document.readyState === "complete" || document.readyState === "interactive") {
        window.Tracker.init();
    } else {
        document.addEventListener("DOMContentLoaded", () => window.Tracker.init());
    }

})();
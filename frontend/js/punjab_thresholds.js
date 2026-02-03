// punjab_thresholds.js
// District-level crop threshold overrides for key Punjab districts.
(function(window) {
    'use strict';

    const PUNJAB_DISTRICT_THRESHOLDS = {
        'Kot Addu': {
            wheat: { idealMax: [12, 26], idealMin: [4, 14], minSoilTemp: 5, minTotalRain5d: 0 },
            rice: { idealMax: [28, 35], idealMin: [22, 30], minSoilTemp: 20, minTotalRain5d: 25 },
            cotton: { idealMax: [30, 38], idealMin: [20, 30], minSoilTemp: 18, minTotalRain5d: 0 },
            sugarcane: { idealMax: [26, 36], idealMin: [20, 30], minSoilTemp: 20, minTotalRain5d: 15 },
            maize: { idealMax: [22, 34], idealMin: [14, 26], minSoilTemp: 14, minTotalRain5d: 5 }
        },
        'Multan': {
            wheat: { idealMax: [14, 28], idealMin: [6, 16], minSoilTemp: 6, minTotalRain5d: 0 },
            rice: { idealMax: [29, 36], idealMin: [23, 31], minSoilTemp: 20, minTotalRain5d: 30 },
            cotton: { idealMax: [32, 40], idealMin: [22, 32], minSoilTemp: 18, minTotalRain5d: 0 },
            sugarcane: { idealMax: [28, 38], idealMin: [22, 32], minSoilTemp: 22, minTotalRain5d: 15 },
            maize: { idealMax: [24, 36], idealMin: [16, 28], minSoilTemp: 14, minTotalRain5d: 5 }
        },
        'Muzaffargarh': {
            wheat: { idealMax: [13, 27], idealMin: [5, 15], minSoilTemp: 5, minTotalRain5d: 0 },
            rice: { idealMax: [28, 35], idealMin: [22, 30], minSoilTemp: 20, minTotalRain5d: 25 },
            cotton: { idealMax: [31, 39], idealMin: [21, 31], minSoilTemp: 18, minTotalRain5d: 0 },
            sugarcane: { idealMax: [27, 36], idealMin: [20, 30], minSoilTemp: 20, minTotalRain5d: 12 },
            maize: { idealMax: [23, 34], idealMin: [15, 26], minSoilTemp: 14, minTotalRain5d: 5 }
        },
        'Lahore': {
            wheat: { idealMax: [11, 24], idealMin: [3, 14], minSoilTemp: 4, minTotalRain5d: 0 },
            rice: { idealMax: [26, 33], idealMin: [21, 28], minSoilTemp: 18, minTotalRain5d: 20 },
            cotton: { idealMax: [28, 36], idealMin: [18, 28], minSoilTemp: 16, minTotalRain5d: 0 },
            sugarcane: { idealMax: [25, 34], idealMin: [18, 28], minSoilTemp: 18, minTotalRain5d: 12 },
            maize: { idealMax: [20, 30], idealMin: [12, 22], minSoilTemp: 12, minTotalRain5d: 5 }
        },
        'Faisalabad': {
            wheat: { idealMax: [12, 25], idealMin: [4, 15], minSoilTemp: 5, minTotalRain5d: 0 },
            rice: { idealMax: [27, 34], idealMin: [21, 29], minSoilTemp: 19, minTotalRain5d: 22 },
            cotton: { idealMax: [29, 37], idealMin: [19, 29], minSoilTemp: 17, minTotalRain5d: 0 },
            sugarcane: { idealMax: [26, 35], idealMin: [19, 29], minSoilTemp: 19, minTotalRain5d: 12 },
            maize: { idealMax: [21, 32], idealMin: [13, 24], minSoilTemp: 13, minTotalRain5d: 5 }
        },
        'Rawalpindi': {
            wheat: { idealMax: [10, 22], idealMin: [2, 12], minSoilTemp: 4, minTotalRain5d: 0 },
            rice: { idealMax: [24, 31], idealMin: [19, 26], minSoilTemp: 17, minTotalRain5d: 18 },
            cotton: { idealMax: [26, 34], idealMin: [16, 26], minSoilTemp: 15, minTotalRain5d: 0 },
            sugarcane: { idealMax: [24, 33], idealMin: [17, 27], minSoilTemp: 17, minTotalRain5d: 10 },
            maize: { idealMax: [19, 29], idealMin: [11, 21], minSoilTemp: 12, minTotalRain5d: 5 }
        },
        'Dera Ghazi Khan': {
            wheat: { idealMax: [14, 30], idealMin: [6, 18], minSoilTemp: 6, minTotalRain5d: 0 },
            rice: { idealMax: [30, 36], idealMin: [24, 32], minSoilTemp: 21, minTotalRain5d: 30 },
            cotton: { idealMax: [33, 41], idealMin: [23, 33], minSoilTemp: 19, minTotalRain5d: 0 },
            sugarcane: { idealMax: [29, 38], idealMin: [23, 33], minSoilTemp: 22, minTotalRain5d: 15 },
            maize: { idealMax: [25, 37], idealMin: [17, 29], minSoilTemp: 15, minTotalRain5d: 5 }
        },
        'Rahim Yar Khan': {
            wheat: { idealMax: [15, 31], idealMin: [7, 19], minSoilTemp: 6, minTotalRain5d: 0 },
            rice: { idealMax: [30, 37], idealMin: [24, 33], minSoilTemp: 22, minTotalRain5d: 30 },
            cotton: { idealMax: [33, 41], idealMin: [23, 33], minSoilTemp: 19, minTotalRain5d: 0 },
            sugarcane: { idealMax: [29, 38], idealMin: [23, 33], minSoilTemp: 22, minTotalRain5d: 15 },
            maize: { idealMax: [25, 37], idealMin: [17, 29], minSoilTemp: 15, minTotalRain5d: 5 }
        },
        'Sargodha': {
            wheat: { idealMax: [11, 24], idealMin: [3, 14], minSoilTemp: 4, minTotalRain5d: 0 },
            rice: { idealMax: [26, 33], idealMin: [20, 28], minSoilTemp: 18, minTotalRain5d: 20 },
            cotton: { idealMax: [28, 36], idealMin: [18, 28], minSoilTemp: 16, minTotalRain5d: 0 },
            sugarcane: { idealMax: [25, 34], idealMin: [18, 28], minSoilTemp: 18, minTotalRain5d: 12 },
            maize: { idealMax: [20, 31], idealMin: [12, 23], minSoilTemp: 12, minTotalRain5d: 5 }
        },
        'Gujranwala': {
            wheat: { idealMax: [12, 25], idealMin: [4, 15], minSoilTemp: 5, minTotalRain5d: 0 },
            rice: { idealMax: [27, 34], idealMin: [21, 29], minSoilTemp: 19, minTotalRain5d: 22 },
            cotton: { idealMax: [29, 37], idealMin: [19, 29], minSoilTemp: 17, minTotalRain5d: 0 },
            sugarcane: { idealMax: [26, 35], idealMin: [19, 29], minSoilTemp: 19, minTotalRain5d: 12 },
            maize: { idealMax: [21, 32], idealMin: [13, 24], minSoilTemp: 13, minTotalRain5d: 5 }
        }
    };

    window.PUNJAB_DISTRICT_THRESHOLDS = PUNJAB_DISTRICT_THRESHOLDS;

    window.getPunjabDistrictThreshold = function(districtName, crop) {
        if (!districtName || !crop) return null;
        const dk = districtName.trim();
        const c = crop.toLowerCase();
        const entry = PUNJAB_DISTRICT_THRESHOLDS[dk];
        if (!entry) return null;
        return entry[c] || null;
    };

})(window);
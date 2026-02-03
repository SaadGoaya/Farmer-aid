 // district_zones.js
 // District -> province/zone mapping for Pakistan.
 // This module builds a normalized lookup from authoritative district lists
 // so other scripts can call getZoneFromDistrictMap(locationName).

 (function(window) {
     'use strict';

     // Lists by province/territory. These arrays include the commonly used
     // district names and many common alternative spellings.
     const PROVINCE_DISTRICTS = {
         'Punjab': [
             'Attock', 'Bahawalnagar', 'Bahawalpur', 'Barki', 'Bhakkar', 'Chakwal', 'Chiniot', 'Dera Ghazi Khan', 'Faisalabad', 'Gujranwala',
             'Gujrat', 'Hafizabad', 'Jhang', 'Jhelum', 'Khanewal', 'Kasur', 'Khanewal', 'Khushab', 'Lahore', 'Layyah', 'Lodhran', 'Mandi Bahauddin',
             'Mianwali', 'Multan', 'Muzaffargarh', 'Nankana Sahib', 'Narowal', 'Okara', 'Pakpattan', 'Rahim Yar Khan', 'Rajanpur', 'Rawalpindi',
             'Sahiwal', 'Sargodha', 'Sheikhupura', 'Sialkot', 'Toba Tek Singh', 'Vehari', 'Kot Addu', 'Taunsa', 'Liaqatpur'
         ],
         'Sindh': [
             'Badin', 'Dadu', 'Ghotki', 'Hyderabad', 'Jacobabad', 'Jamshoro', 'Kamber Shahdadkot', 'Karachi', 'Kashmore', 'Khairpur', 'Larkana',
             'Mirpur Khas', 'Naushahro Feroze', 'Qambar Shahdadkot', 'Sanghar', 'Shaheed Benazirabad', 'Shikarpur', 'Sukkur', 'Thatta', 'Tharparkar', 'Tando Allahyar', 'Tando Muhammad Khan', 'Umerkot', 'Keamari', 'Malir'
         ],
         'Khyber Pakhtunkhwa': [
             'Abbottabad', 'Bannu', 'Battagram', 'Bajaur', 'Charsadda', 'Chitral', 'Dera Ismail Khan', 'Hangu', 'Haripur', 'Karak', 'Kohat', 'Lakki Marwat',
             'Lower Dir', 'Lower Kohistan', 'Mansehra', 'Mardan', 'Nowshera', 'Peshawar', 'Shangla', 'Swabi', 'Swat', 'Tank', 'Torghar', 'Upper Dir', 'Upper Kohistan', 'Khyber', 'Kurram', 'Orakzai', 'Mohmand'
         ],
         'Balochistan': [
             'Awaran', 'Barkhan', 'Chagai', 'Dera Bugti', 'Gwadar', 'Harnai', 'Jafarabad', 'Jhal Magsi', 'Kachhi', 'Kalat', 'Kech', 'Kharan', 'Khuzdar', 'Killa Saifullah',
             'Kohlu', 'Lasbela', 'Loralai', 'Mastung', 'Nushki', 'Panjgur', 'Pishin', 'Pishin', 'Quetta', 'Sibi', 'Washuk', 'Zhob', 'Ziarat', 'Sohbatpur'
         ],
         'Gilgit-Baltistan': [
             'Gilgit', 'Skardu', 'Hunza', 'Nagar', 'Ghizer', 'Ghanche', 'Astore', 'Diamer', 'Shigar', 'Kharmang'
         ],
         'Azad Jammu and Kashmir': [
             'Muzaffarabad', 'Mirpur', 'Kotli', 'Poonch', 'Bhimber', 'Bagh', 'Neelum', 'Hattian Bala', 'Sudhanoti', 'Haveli'
         ],
         'Islamabad': ['Islamabad']
     };

     // Additional common city/district aliases not captured above
     const ALIASES = {
         'dg khan': 'Dera Ghazi Khan',
         'kot addu': 'Kot Addu',
         'kot-addu': 'Kot Addu',
         'kot addu city': 'Kot Addu',
         'shaheed benazirabad': 'Shaheed Benazirabad',
         'nawabshah': 'Shaheed Benazirabad',
         'keamari': 'Karachi',
         'karachi east': 'Karachi',
         'karachi west': 'Karachi',
         'karachi south': 'Karachi',
         'karachi central': 'Karachi',
         'multan city': 'Multan',
         'muzaffar garh': 'Muzaffargarh',
         'muzaffargarh': 'Muzaffargarh',
         // Sanawan is a small town often referenced near Kot Addu / Muzaffargarh (Punjab, Pakistan).
         // Prefer mapping it to Kot Addu per user's locality preference.
         'sanawan': 'Kot Addu',
         // Also handle common geocoder variants that append administrative layers or country names
         'sanawan uttar pradesh': 'Kot Addu',
         'sanawan india': 'Kot Addu',
         'sanawan uttar pradesh india': 'Kot Addu'
     };

     // Build a normalized map from lowercase district substring -> province
     const DISTRICT_ZONE_MAP = {};
     // Also keep a map of normalized key -> canonical district name (for geocoding hints)
     const DISTRICT_NAME_MAP = {};

     function addDistrictToMap(district, province) {
         if (!district) return;
         const key = district.toLowerCase();
         DISTRICT_ZONE_MAP[key] = province;
         DISTRICT_NAME_MAP[key] = district; // store canonical district name for this key
         // also add a simplified key without punctuation
         const simple = key.replace(/[\.\-,'/]/g, ' ').replace(/\s+/g, ' ').trim();
         if (simple && simple !== key) DISTRICT_ZONE_MAP[simple] = province;
         if (simple && simple !== key) DISTRICT_NAME_MAP[simple] = district;
     }

     for (const province in PROVINCE_DISTRICTS) {
         if (!Object.prototype.hasOwnProperty.call(PROVINCE_DISTRICTS, province)) continue;
         const list = PROVINCE_DISTRICTS[province];
         list.forEach(d => addDistrictToMap(d, province));
     }

     for (const a in ALIASES) {
         if (Object.prototype.hasOwnProperty.call(ALIASES, a)) {
             addDistrictToMap(a, DISTRICT_ZONE_MAP[ALIASES[a].toLowerCase()] || Object.keys(PROVINCE_DISTRICTS).find(p => PROVINCE_DISTRICTS[p].includes(ALIASES[a])) || ALIASES[a]);
         }
     }

     // Expose the generated map for debugging/consumption
     window.DISTRICT_ZONE_MAP = DISTRICT_ZONE_MAP;
     window.PROVINCE_DISTRICTS = PROVINCE_DISTRICTS;

     // Normalize lookup: lowercased, stripped of punctuation. Try exact token match first,
     // then substring match. Returns province string or null.
     window.getZoneFromDistrictMap = function(name) {
         if (!name || typeof name !== 'string') return null;
         const lc = name.toLowerCase();
         const norm = lc.replace(/[\.\-,'/]/g, ' ').replace(/\s+/g, ' ').trim();

         // Check aliases exact
         if (ALIASES[norm]) {
             const mapped = ALIASES[norm];
             // find province
             for (const p in PROVINCE_DISTRICTS)
                 if (PROVINCE_DISTRICTS[p].includes(mapped)) return p;
             return mapped;
         }

         // Check for exact district name match
         if (DISTRICT_ZONE_MAP[norm]) return DISTRICT_ZONE_MAP[norm];

         // Tokenize and look for a token that matches a district key
         const tokens = norm.split(' ');
         for (let t of tokens) {
             if (DISTRICT_ZONE_MAP[t]) return DISTRICT_ZONE_MAP[t];
         }

         // Fallback: substring search (useful for 'city, district' raw strings)
         for (const key in DISTRICT_ZONE_MAP) {
             if (Object.prototype.hasOwnProperty.call(DISTRICT_ZONE_MAP, key)) {
                 if (norm.indexOf(key) !== -1) return DISTRICT_ZONE_MAP[key];
             }
         }

         return null;
     };

     // Return the canonical district name (e.g. 'Kot Addu') for a provided input string
     // Checks aliases first, then exact/simplified keys, then token/substring matches.
     window.getDistrictFromName = function(name) {
         if (!name || typeof name !== 'string') return null;
         const lc = name.toLowerCase();
         const norm = lc.replace(/[\.\-,'/]/g, ' ').replace(/\s+/g, ' ').trim();

         // Aliases map to canonical district strings
         if (ALIASES[norm]) return ALIASES[norm];

         if (DISTRICT_NAME_MAP[norm]) return DISTRICT_NAME_MAP[norm];

         const tokens = norm.split(' ');
         for (let t of tokens) {
             if (DISTRICT_NAME_MAP[t]) return DISTRICT_NAME_MAP[t];
         }

         for (const key in DISTRICT_NAME_MAP) {
             if (Object.prototype.hasOwnProperty.call(DISTRICT_NAME_MAP, key)) {
                 if (norm.indexOf(key) !== -1) return DISTRICT_NAME_MAP[key];
             }
         }

         return null;
     };

 })(window);

 // Optional quick-test helper (runs only if explicitly enabled in console):
 // In browser console: window.__TEST_DISTRICT_ZONES = true; then refresh or re-run script to see sample outputs.
 if (typeof window !== 'undefined' && window.__TEST_DISTRICT_ZONES) {
     console.info('district_zones.js quick-test:');
     ['Sanawan', 'Kot Addu', 'Multan', 'Lahore', 'Karachi South', 'Muzaffargarh'].forEach(n => {
         console.info(n, '=>', window.getZoneFromDistrictMap(n));
     });
 }
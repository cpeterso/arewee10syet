"use strict";

var $gdata = (function(){
    return {
        parseSpreadsheet: function(json) {
            var rows = [];
            var entries = json.feed.entry || [];

            for (var entry of entries) {
                var title = (entry.title.type === "html") ? entry.title.$t : encodeURIComponent(entry.title.$t);

                // e.g. "tier: 1, bug: 1002880, reason: AMO #8, amourl: https://addons.mozilla.org/en-US/firefox/addon/wot-safe-browsing-tool"
                var row = {title:title};
                var content = entry.content.$t.split(", ");

                for (var column of content) {
                    var kv = column.split(": ");
                    row[kv[0]] = kv[1];
                }
                rows.push(row);
            }
            return rows;
        }
    };
})();

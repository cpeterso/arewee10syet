;(function(exports) {
    "use strict";

    exports.$addons = {
        parseSpreadsheet: function(json, callback) {
            var bugURL;
            var compatible;
            var bugIDs = [];
            var bugToAddonMap = {};
            var rows = $gdata.parseSpreadsheet(json);

            var addons = _.map(rows, function(row) {
                // e.g. "bug: 1002880, reason: AMO #8, amourl: https://addons.mozilla.org/en-US/firefox/addon/wot-safe-browsing-tool"
                var name = row.title;
                var tier = +row.tier;
                var notes = row["notes"];

                bugURL = null;
                compatible = null;
                var bug = row["bug"];
                if (typeof bug !== "undefined") {
                    bugURL = $bugz.makeURL(bug);
                    bug = +bug;
                    if (bug > 0) {
                        bugIDs.push(bug);
                    } else {
                        compatible = true;
                    }
                }

                var date = row["addondate"];
                if (date) {
                    date = Date.parse(date);
                }

                var amoURL = row["amourl"];
                if (!amoURL) {
                    //amoURL = "https://addons.mozilla.org/en-US/firefox/search/?q=" + name;
                    amoURL = "https://www.google.com/search?btnI=1&q=site%3Aaddons.mozilla.org+" + name;
                }

                var addon = {name:name, tier:tier, amoURL:amoURL, date:date, compatible:compatible, bug:bug, bugURL:bugURL, notes:notes};
                if (bug) {
                    bugToAddonMap[bug] = addon;
                }

                return addon;
            });

            var searchParams = {
                id: bugIDs,
                include_fields: "id, resolution",
            };

            $bugz.searchBugs(searchParams, function(error, bugs) {
                if (error) {
                    console.error(error);
                    alert(error);
                } else {
                    _.forEach(bugs, function(bug) {
                        var addon = bugToAddonMap[bug.id];
                        switch (bug.resolution) {
                            case $bugz.resolution.FIXED:
                            case $bugz.resolution.WORKSFORME:
                                addon.compatible = true;
                                break;
                            default:
                                console.error("Bug " + bug.id + " has unexpected resolution: " + bug.resolution);
                            case $bugz.resolution.DUPLICATE:
                            case $bugz.resolution.INVALID:
                            case $bugz.resolution.INCOMPLETE:
                            case $bugz.resolution.NONE:
                            case $bugz.resolution.WONTFIX:
                                addon.compatible = false;
                                break;
                        }
                    });
                }
                callback(error, addons);
            });
        }
    };
})(this);

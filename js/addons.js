"use strict";

var $addons = (function(){
    /*
       var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
  username: 'bugs@bugmail.com',
  password: 'secret',
  timeout: 30000
});

    var bugzilla = bz.createClient();
bugzilla.getBug(678223, function(error, bug) {
  if (!error) {
    alert(bug.summary);
  }
});

*/

    return {
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
                    bugURL = "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bug;
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

            var bugzilla = bz.createClient();
            bugzilla.searchBugs({id:bugIDs}, function(error, bugs) {
                if (error) {
                    console.error(error);
                    alert(error);
                } else {
                    _.forEach(bugs, function(bug) {
                        var addon = bugToAddonMap[bug.id];
                        if (bug.status === "RESOLVED") {
                            switch (bug.resolution) {
                                case "FIXED":
                                case "WORKSFORME":
                                    addon.compatible = true;
                                    break;
                                case "INVALID":
                                case "DUPLICATE":
                                case "INCOMPLETE":
                                default:
                                    console.error("Bug " + bug.id + " has unexpected resolution: " + bug.resolution);
                                case "WONTFIX":
                                    addon.compatible = false;
                                    break;
                            }
                        } else {
                            addon.compatible = false;
                        }
                    });
                }
                callback(error, addons);
            });
        }
    };
})();

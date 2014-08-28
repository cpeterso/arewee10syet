;(function(exports) {
    "use strict";

    var bzClient = bz.createClient({
        username: "",
        password: "",
    });

    exports.$bugz = {
        status: {
            UNCONFIRMED: "UNCONFIRMED",
            NEW: "NEW",
            ASSIGNED: "ASSIGNED",
            REOPENED: "REOPENED",
            RESOLVED: "RESOLVED",
            VERIFIED: "VERIFIED",
        },
        resolution: {
            NONE: "",
            DUPLICATE: "DUPLICATE",
            FIXED: "FIXED",
            INCOMPLETE: "INCOMPLETE",
            INVALID: "INVALID",
            WONTFIX: "WONTFIX",
            WORKSFORME: "WORKSFORME",
        },
        getURL: function(bugId) {
            return "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugId;
        },
        searchBugs: function(params, callback) {
            bzClient.searchBugs(params, callback);
        }
    };
})(this);

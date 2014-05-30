"use strict";

var $bugz = (function() {
    var bzClient = bz.createClient({
        username: "",
        password: "",
    });

    return {
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
})();

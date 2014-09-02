;(function(exports) {
    "use strict";

    var bzClient = bz.createClient({
        username: "",
        password: "",
    });

    function xhr(url, callback) {
        function onError(event) {
            console.error(event.type);
            request.removeEventListener("error", onError);
            request.removeEventListener("load", onLoad);
            callback(event, null);
        }

        function onLoad(event) {
            //console.debug("onLoad: " + request.responseText);
            request.removeEventListener("error", onError);
            request.removeEventListener("load", onLoad);
            var response = JSON.parse(request.responseText);
            callback(null, response);
        }

        var request = new XMLHttpRequest();
        request.addEventListener("error", onError);
        request.addEventListener("load", onLoad);
        request.open("GET", url, true);
        request.setRequestHeader("Accept", "application/json");
        request.send();
    }

    function storyPointsFromHours(hours) {
        if (hours <= 0) {
            return 0;
        }
        var days = hours / 8;
        var f1 = 1;
        var f2 = 1;
        while (f1 < days) {
            var fn = f1 + f2;
            f1 = f2;
            f2 = fn;
        }
        return f1;
    }

    function matchRealName(detail) {
        // "Joe Cool (:joe :joecool)"
        return detail.real_name.match(/\s*(.+)\s+[([]:(\S+).*[)\]]\s*/);
    }

    function getAssignedToName(detail) {
        var match = matchRealName(detail);
        return (match && match.length >= 2) ? match[1] : "";
    }

    function getAssignedToNick(detail) {
        var match = matchRealName(detail);
        return (match && match.length >= 3) ? match[2] : null;
    }

    function materializePerson(detail) {
        return {
            name: getAssignedToName(detail),
            nick: getAssignedToNick(detail),
            email: detail.email,
        };
    }

    function materializeTimeTracking(bug) {
        if (typeof bug.estimated_time === "undefined") {
            return null; // no time tracking data
        }
        var currentEstimate = bug.actual_time + bug.remaining_time;
        return {
            originalEstimate: bug.estimated_time,
            currentEstimate: currentEstimate,
            remainingHours: bug.remaining_time,
            storyPoints: storyPointsFromHours(bug.estimated_time), // if no Points flag or p=# whiteboard tag
        };
    }

    function materializeBlockingFlags(bug) {
        // "cf_blocking_b2g" : "---",
        // "cf_blocking_fennec" : "---",
        // "cf_blocking_fennec10" : "+",
        // "cf_blocking_fx" : "---",
        var cf_blocking_ = "cf_blocking_";
        var cf_blocking_len = cf_blocking_.length;
        return _.reduce(bug, function(blockingFlags, value, key) {
            if (value !== "---" && key.startsWith(cf_blocking_)) {
                key = key.slice(cf_blocking_len);
                blockingFlags[key] = value;
            }
            return blockingFlags;
        }, {});
    }

    function materializeStatusFlags(bug) {
        // "cf_status_b2g_2_1" : "---",
        // "cf_status_firefox30" : "unaffected",
        // "cf_status_firefox31" : "affected",
        // "cf_status_firefox32" : "fixed",
        var cf_status_ = "cf_status_";
        var cf_status_len = cf_status_.length;
        return _.reduce(bug, function(statusFlags, value, key) {
            if (value !== "---" && key.startsWith(cf_status_)) {
                key = key.slice(cf_status_len);
                statusFlags[key] = value;
            }
            return statusFlags;
        }, {});
    }

    function materializeTrackingFlags(bug) {
        // "cf_tracking_b2g_v1_3" : "---",
        // "cf_tracking_e10s" : "later",
        // "cf_tracking_firefox30" : "+",
        var cf_tracking_ = "cf_tracking_";
        var cf_tracking_len = cf_tracking_.length;
        return _.reduce(bug, function(trackingFlags, value, key) {
            if (value !== "---" && key.startsWith(cf_tracking_)) {
                key = key.slice(cf_tracking_len);
                trackingFlags[key] = value;
            }
            return trackingFlags;
        }, {});
    }

    function materializeBug(bug) {
        return {
            assignedTo: materializePerson(bug.assigned_to_detail),
            blockingFlags: materializeBlockingFlags(bug),
            blocks: bug.blocks,
            component: bug.component,
            dependsOn: bug.depends_on,
            dupeOf: bug.dupe_of,
            id: bug.id,
            keywords: bug.keywords,
            open: bug.is_open,
            os: bug.op_sys,
            product: bug.product,
            reportedAt: new Date(bug.creation_time),
            reporter: materializePerson(bug.creator_detail),
            resolution: bug.resolution,
            summary: bug.summary,
            status: bug.status,
            statusFlags: materializeStatusFlags(bug),
            timeTracking: materializeTimeTracking(bug),
            trackingFlags: materializeTrackingFlags(bug),
            whiteboard: bug.whiteboard, // TODO: parse whiteboard tags?
            _XXX: bug, // escape hatch to original bug object
        };
    }

    function searchBugs(searchTerms, callback) {
        var url = [BUGZILLA_URL, "bug?"];
        for (var i = 0; i < searchTerms.length; ) {
            var key = searchTerms[i++];
            var value = searchTerms[i++];
            url.push("&", encodeURIComponent(key), "=", encodeURIComponent(value));
        }
        if (loginToken) {
            url.push("&token=", loginToken);
        }
        // Must use exclude_fields because we can't include_fields all cf_status_* or cf_tracking_* flags by name.
        url.push("&exclude_fields=alias,cc,cf_crash_signature,cf_qa_whiteboard,cf_user_story,classification,flags,groups,is_cc_accessible,is_confirmed,is_creator_accessible,platform,priority,qa_contact,see_also,severity,target_milestone,url,version");
        // last_change_time?
        url = url.join("");
        xhr(url, function(error, response) {
            if (error) {
                callback(error, null);
            } else {
                var bugs = _.map(response.bugs, materializeBug);
                callback(null, bugs);
            }
        });
    }

    var BUGZILLA_URL = "https://bugzilla.mozilla.org/rest/";
    var loginToken = null;

    exports.$bugz = {
        login: function(username, password, callback) {
            username = encodeURIComponent(username);
            password = encodeURIComponent(password);
            xhr(BUGZILLA_URL + "login?login=" + username + "&password=" + password,
                function(error, response) {
                    error = error || (response.error && response.message);
                    if (error) {
                        callback(error, null);
                    } else {
                        loginToken = encodeURIComponent(response.token);
                        callback(null, response);
                    }
                });
        },
        searchBugs: searchBugs,
        getBugs: function(bugIDs, callback) {
            var searchTerms = _.reduce(bugIDs, function(searchTerms, bugID) {
                searchTerms.push($bugz.field.ID, bugID);
                return searchTerms;
            }, []);
            searchBugs(searchTerms, callback);
        },
        getBug: function(bugID, callback) {
            $bugz.getBugs([bugID], function(error, bugs) {
                var bug = bugs ? bugs[0] : null;
                callback(error, bug);
            });
        },
        getBugComments: function(bugID, callback) {
            var url = BUGZILLA_URL + "bug/" + bugID + "/comment";
            if (loginToken) {
                url += "?token=" + loginToken;
            }
            url += "&include_fields=creator,time,raw_text";
            xhr(url, function(error, response) {
                if (error) {
                    callback(error, null);
                } else {
                    var comments = _.map(response.bugs[bugID].comments, function(comments, value) {
                        return {
                            commenter: value.creator,
                            time: new Date(value.time),
                            text: value.raw_text,
                        };
                    });
                    console.debug(comments);
                    //callback(error, comments);
                }
            });
        },
        getBugHistory: function(bugID, callback) {
            var url = BUGZILLA_URL + "bug/" + bugID + "/history";
            if (loginToken) {
                url += "?token=" + loginToken;
            }
            //url += "&include_fields=creator,time,raw_text";
            xhr(url, function(error, response) {
                if (error) {
                    callback(error, null);
                } else {
                    var comments = _.map(response.bugs[bugID].comments, function(comments, value) {
                        return {
                            commenter: value.creator,
                            time: new Date(value.time),
                            text: value.raw_text,
                        };
                    });
                    console.debug(comments);
                    //callback(error, comments);
                }
            });
        },
        makeURL: function(bugID) {
            return "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugID;
        },
        status: {
            ASSIGNED: "ASSIGNED",
            NEW: "NEW",
            REOPENED: "REOPENED",
            RESOLVED: "RESOLVED",
            UNCONFIRMED: "UNCONFIRMED",
            VERIFIED: "VERIFIED",
        },
        resolution: {
            // null?
            DUPLICATE: "DUPLICATE",
            FIXED: "FIXED",
            INCOMPLETE: "INCOMPLETE",
            INVALID: "INVALID",
            WONTFIX: "WONTFIX",
            WORKSFORME: "WORKSFORME",
        },
        field: {
            ASSIGNEE: "assigned_to",
            BLOCKS: "blocks",
            COMPONENT: "component",
            DEPENDS_ON: "deponds_on",
            HOURS_LEFT: "remaining_time",
            HOURS_WORKED: "actual_time",
            ID: "id",
            KEYWORDS: "keywords",
            ORIGINAL_ESTIMATE: "estimated_time",
            PRODUCT: "product",
            REPORTED: "creation_time",
            REPORTER: "creator",
            RESOLUTION: "resolution",
            STATUS: "status",
            SUMMARY: "summary",
            WHITEBOARD: "whiteboard",
        },
    };
})(this);

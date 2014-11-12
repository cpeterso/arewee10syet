;(function(exports) {
    "use strict";

    // https://www.mozilla.org/en-US/styleguide/identity/firefox/color/
    const FIREFOX_ORANGE = "#E66000";
    const FIREFOX_LIGHT_ORANGE = "#FF9500";
    const FIREFOX_YELLOW = "#FFCB00";
    const FIREFOX_BLUE = "#00539F";
    const FIREFOX_LIGHT_BLUE = "#0095DD";
    const FIREFOX_LIGHT_BLUE_GREY1 = "#EAEFF2";
    const FIREFOX_LIGHT_BLUE_GREY2 = "#D4DDE4";
    const FIREFOX_DARK_BLUE_GREY1 = "#424F5A";
    const FIREFOX_DARK_BLUE_GREY2 = "#6A7B86";

    const E10S_M1 = 997456;
    const E10S_M2 = 997462;
    const E10S_ADDONS = 905436;
    const SHUMWAY_M2= 1044759;
    const SHUMWAY_M3 = 1037568;

    function log(s) {
       console.debug(s);
    }

    function parseQueryString() {
        // e.g. "?foo=bar&baz=qux&/"
        var query = window.location.search;
        if (query.length <= 1) {
            return {};
        }

        var slash = (query[query.length - 1] === '/') ? -1 : undefined;
        query = query.slice(1, slash);

        var kvs = {};

        var params = query.split("&");
        _.forEach(params, function(kv) {
            kv = kv.split("=", 2);
            var key = kv[0];
            if (key.length === 0) {
                return; // "&&"
            }
            var value = (kv.length > 1) ? decodeURIComponent(kv[1]) : null;
            kvs[key] = value;
        });
        return kvs;
    }

    function getElementValue(id) {
        return document.getElementById(id).value;
    }

    function daysFromHours(hours) {
        return Math.ceil(hours / 8);
    }

    function weeksFromHours(hours) {
        return Math.ceil(daysFromHours(hours) / 5);
    }

    function calendarDaysFromWorkDays(workDays) {
        var workWeeks = workDays / 5;
        var modWorkDays = workDays % 5;
        return workWeeks * 7 + modWorkDays;
    }

    function yyyy_mm_dd(date) {
        return date.toISOString().slice(0,10);
    }

    function makeLinearRegressionFunction(xys) {
        var line = ss.linear_regression().data(xys).line();
        return function(x) {
            var y = line(x);
            if (y <= 0) {
                return 0;
            }
            return Math.ceil(y);
        };
    }

    function drawOpenClosed(data) {
        var columns = [
            ["x"].concat(data.dates),
            ["open"].concat(data.open),
            ["closed"].concat(data.closed),
        ];
        if (data.days) {
            columns.push(["days"].concat(data.days));
        }
        c3.generate({
            data: {
                x: "x",
                columns: columns,
                names: {
                    open: "Open Bugs",
                    closed: "Closed Bugs",
                    days: "Days Remaining",
                },
                types: {
                    open: "area",
                    closed: "area",
                    days: "line",
                },
                colors: {
                    open: FIREFOX_LIGHT_ORANGE,
                    closed: FIREFOX_LIGHT_BLUE_GREY2,
                    days: FIREFOX_BLUE,
                },
                groups: [["open", "closed"]],
                order: "asc",
            },
            axis: {
                x: {
                    type: "timeseries",
                    tick: {
                        format: "%m-%d"
                    }
                }
            },
        });
    }

    function searchDependentBugs(bug) {
        $bugz.searchBugs([$bugz.field.BLOCKS, metabug], function(error, bugs) {
            if (error) {
                console.error("searchBugs: " + error);
                return;
            }

            if (bugs.length === 0) {
                console.info("searchBugs: zarro boogs");
                return;
            }

            var changes = {};

            function getChange(date) {
                date = yyyy_mm_dd(date);
                var change = changes[date];
                if (!change) {
                    change = {date: date, bugsOpened: [], bugsClosed: []};
                    changes[date] = change;
                }
                return change;
            }

            _.forEach(bugs, function(bug) {
//                log("bug " + bug.id + ": " + bug.reportedAt);

                getChange(bug.reportedAt).bugsOpened.push(bug);

                if (!bug.open) {
                    // XXX pretend last change time is time of resolution
                    var lastChangeTime = new Date(bug._XXX.last_change_time);
                    getChange(lastChangeTime).bugsClosed.push(bug);
                }
            });

            var bugDates = [];
            var openBugCounts = [];
            var closedBugCounts = [];
            var remainingDays = [];

            var runningOpenBugCount = 0;
            var runningClosedBugCount = 0;
            var runningRemainingDays = 0;

            changes = _.sortBy(changes, "date");

            // chart start date
            const MS_PER_DAY = 24*60*60*1000;
            const MS_PER_MONTH = 4*7*MS_PER_DAY;
            var chartStartDate = yyyy_mm_dd(new Date(Date.now() - 6 * MS_PER_MONTH));
            var hasTimeTracking = false;

            _.forEach(changes, function(change) {
                var closedBugCountDelta = change.bugsClosed.length;
                var openBugCountDelta = change.bugsOpened.length - closedBugCountDelta;

                var daysOpened = daysFromHours(_.reduce(change.bugsOpened, function(sum, bug) {
                    var t = bug.timeTracking;
                    if (!t) {
                        return sum;
                    }
                    // FIXME: log warning if no timeTracking?
                    hasTimeTracking = true;
                    return sum + t.currentEstimate;
                }, 0));

                var daysClosed = daysFromHours(_.reduce(change.bugsClosed, function(sum, bug) {
                    var t = bug.timeTracking;
                    if (!t) {
                        return sum;
                    }
                    // FIXME: log warning if no timeTracking?
                    hasTimeTracking = true;
                    return sum + t.currentEstimate;
                }, 0));

                runningOpenBugCount += openBugCountDelta;
                runningClosedBugCount += closedBugCountDelta;
                runningRemainingDays += daysOpened - daysClosed;

                if (change.date >= sixMonthsAgo) {
                    bugDates.push(change.date);
                    openBugCounts.push(runningOpenBugCount);
                    closedBugCounts.push(runningClosedBugCount);
                    remainingDays.push(runningRemainingDays);
                }
            });

            var todaysDate = Date.now();
            var twoWeeksAgo = todaysDate - 2*7*MS_PER_DAY;

            var bugCountInputs = [];
            var remainingDaysInputs = [];

            var i = bugDates.length - 1;
            for (;;) {
                if (i < 0) {
                   break;
                }
                var t = Date.parse(bugDates[i]);
                if (t < twoWeeksAgo) {
                    break;
                }
                bugCountInputs.unshift([t, openBugCounts[i]]);
                remainingDaysInputs.unshift([t, remainingDays[i]]);
                i--;
            }

            var predictBugCount = makeLinearRegressionFunction(bugCountInputs);
            var predictRemainingDays = makeLinearRegressionFunction(remainingDaysInputs);

            var threeMonthsFromNow = todaysDate + 3*MS_PER_MONTH;
            var futureDate = todaysDate;

            for (;;) {
                futureDate += MS_PER_DAY;
                if (futureDate > threeMonthsFromNow) {
                    break;
                }

                var futureBugCount = predictBugCount(futureDate);
                if (futureBugCount === 0) {
                    bugDates.push(yyyy_mm_dd(new Date(futureDate)));
                    openBugCounts.push(futureBugCount);
                    if (hasTimeTracking) {
                        var futureRemainingDays = predictRemainingDays(futureDate);
                        remainingDays.push(futureRemainingDays);
                    }
                    break;
                }
            }

            if (hasTimeTracking) {
                for (;;) {
                    futureDate += MS_PER_DAY;
                    if (futureDate > threeMonthsFromNow) {
                        break;
                    }

                    var futureRemainingDays = predictRemainingDays(futureDate);
                    if (futureRemainingDays === 0) {
                        bugDates.push(yyyy_mm_dd(new Date(futureDate)));
                        openBugCounts.push(0);
                        remainingDays.push(futureRemainingDays);
                        break;
                    }
                }
            }

            if (hasTimeTracking) {
                for (;;) {
                    futureDate += MS_PER_DAY;
                    if (futureDate > threeMonthsFromNow) {
                        break;
                    }

                    var futureRemainingDays = predictRemainingDays(futureDate);
                    if (futureRemainingDays === 0) {
                        bugDates.push(yyyy_mm_dd(new Date(futureDate)));
                        openBugCounts.push(0);
                        remainingDays.push(futureRemainingDays);
                        break;
                    }
                }
            }

            drawOpenClosed({
                dates: bugDates,
                open: openBugCounts,
                closed: closedBugCounts,
                days: (hasTimeTracking ? remainingDays : null),
            });
        });
    }

    function login(username, password) {
        $bugz.login(username, password, function(error, response) {
            if (error) {
                console.error("login: " + error);
                alert(error);
                return;
            }
            searchDependentBugs(metabug);
        });
    }

    var query = parseQueryString();
    var username = document.getElementById("username");
    if (query.username) {
        username.value = query.username;
    }
    username.select();

    var password = document.getElementById("password");
    if (query.password) {
        password.value = query.password;
    }

    var button = document.getElementById("button");
    button.addEventListener("click", function() {
        var username = getElementValue("username");
        var password = getElementValue("password");
        metabug = getElementValue("bug");
        if (username && password) {
            login(username, password);
        } else {
            searchDependentBugs(metabug);
        }
    });

    var metabug = query.bug|0 || query.id|0;
    if (metabug) {
        searchDependentBugs(metabug);
    } else {
        metabug = E10S_M2;
    }
    button.value = metabug;
})(this);

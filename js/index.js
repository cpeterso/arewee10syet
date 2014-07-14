"use strict";

var $index = (function() {
    return {
        onSpreadsheet: function(json) {
            function createElement(tag, child) {
                var element = document.createElement(tag);
                if (typeof child !== "undefined") {
                    if (typeof child === "string") {
                        child = document.createTextNode(child);
                    }
                    element.appendChild(child);
                }
                return element;
            }

            function createLink(url, text) {
                var element = createElement("a", text);
                element.setAttribute("href", url);
                return element;
            }

            $addons.parseSpreadsheet(json, function(error, addons) {
                var compatible, fragment, style;
                var goodAddons = document.createDocumentFragment();
                var badAddons = document.createDocumentFragment();
                var untestedAddons = document.createDocumentFragment();

                addons.sort(function(a, b) {
                    return a.name < b.name ? -1 : (a.name === b.name ? 0 : 1);
                });

                _.forEach(addons, function(addon) {
                    // Display all tier 1 addons, but only tier 2 and 3 addons that are known compatible or incompatible.
                    if (addon.tier > 1 && addon.compatible === null) {
                        return; // XXX
                    }

                    if (addon.compatible) {
                        compatible = "yes";
                        style = "success"; // green
                        fragment = goodAddons;
                    } else if (addon.compatible === null) {
                        compatible = "not tested";
                        style = "warning"; // yellow
                        fragment = untestedAddons;
                    } else {
                        compatible = "not yet";
                        style = "danger"; // red
                        fragment = badAddons;
                    }

                    var tr = document.createElement("tr");
                    tr.setAttribute("class", style);

                    tr.appendChild(createElement("td", createLink(addon.amoURL, decodeURIComponent(addon.name))));
                    tr.appendChild(createElement("td", compatible));

                    if (addon.bug) {
                        var bugLink = createLink(addon.bugURL, "bug " + addon.bug);
                        if (addon.compatible) {
                            bugLink.setAttribute("style", "text-decoration:line-through");
                        }
                        tr.appendChild(createElement("td", bugLink));
                    } else if (addon.bug === 0) {
                        tr.appendChild(createElement("td", document.createTextNode("no bug")));
                    } else {
                        var bugzillaURL = 'https://bugzilla.mozilla.org/enter_bug.cgi?product=Firefox&component=Extension%20Compatibility&rep_platform=All&op_sys=All&blocked=905436&keywords=addon-compat&short_desc="' + addon.name + '"%20add-on%20does%20not%20work%20with%20e10s&cc=cpeterson@mozilla.com';
                        var reportBugLink = createLink(bugzillaURL, "Report bug");

                        var mailtoURL = 'mailto:cpeterson@mozilla.com?subject="' + addon.name + '" add-on works with e10s!&body=Add-on:%0A' + addon.name + '%0A%0AUser-Agent:%0A' + encodeURIComponent(navigator.userAgent);
                        var itWorksLink = createLink(mailtoURL, 'it works');

                        var td = createElement("td");
                        td.appendChild(reportBugLink);
                        td.appendChild(document.createTextNode(" or "));
                        td.appendChild(itWorksLink);
                        tr.appendChild(td);
                    }

                    fragment.appendChild(tr);
                });

                var tbody = document.getElementById("tbody");
                tbody.appendChild(goodAddons);
                tbody.appendChild(badAddons);
                tbody.appendChild(untestedAddons);
            });
        }
    };
})();

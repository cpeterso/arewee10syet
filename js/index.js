;(function(exports) {
    "use strict";

    exports.$index = {
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

            function shuffleArray(array) {
                for (var i = array.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var temp = array[i];
                    array[i] = array[j];
                    array[j] = temp;
                }
                return array;
            }

            function sortByName(array) {
                array.sort(function(a, b) {
                    return a.name < b.name ? -1 : (a.name === b.name ? 0 : 1);
                });
            }

            function createBugElement(addon) {
                if (addon.bug) {
                    var bugLink = createLink(addon.bugURL, "bug " + addon.bug);
                    if (addon.compatible) {
                        bugLink.setAttribute("style", "text-decoration:line-through");
                    }
                    return createElement("td", bugLink);
                }
                if (addon.bug === 0) {
                    return createElement("td", document.createTextNode("no bug"));
                }
                var bugzillaURL = 'https://bugzilla.mozilla.org/enter_bug.cgi?format=__default__&product=Firefox&component=Extension%20Compatibility&blocked=905436&keywords=addon-compat&short_desc="' + addon.name + '"%20add-on%20does%20not%20work%20with%20e10s&cc=cpeterson@mozilla.com,jmathies@mozilla.com,lshapiro@mozilla.com&';
                var reportBugLink = createLink(bugzillaURL, "Report bug");

                var mailtoURL = 'mailto:cpeterson@mozilla.com?cc=jmathies@mozilla.com,lshapiro@mozilla.com&subject="' + addon.name + '" add-on works with e10s!&body=Add-on:%0A' + addon.name + '%0A%0AUser-Agent:%0A' + encodeURIComponent(navigator.userAgent);
                var itWorksLink = createLink(mailtoURL, 'it works');

                var td = createElement("td");
                td.appendChild(reportBugLink);
                td.appendChild(document.createTextNode(" or "));
                td.appendChild(itWorksLink);
                return td;
            }

            function appendAddonRows(tbody, addons) {
                var fragment = document.createDocumentFragment();
                _.forEach(addons, function(addon) {
                    var compatible, style;
                    if (addon.compatible) {
                        compatible = "compatible";
                        style = "success"; // green
                    } else if (addon.compatible === null) {
                        compatible = "not tested";
                        style = "warning"; // yellow
                    } else {
                        compatible = "bug reported";
                        style = "danger"; // red
                    }

                    var tr = document.createElement("tr");
                    tr.setAttribute("class", style);
                    tr.appendChild(createElement("td", createLink(addon.URL, decodeURIComponent(addon.name))));
                    tr.appendChild(createElement("td", compatible));
                    tr.appendChild(createBugElement(addon));
                    fragment.appendChild(tr);
                });
                tbody.appendChild(fragment);
            }

            $addons.parseSpreadsheet(json, function(error, addons) {
                var goodAddons = [];
                var untestedAddons = [];
                var badAddons = [];

                _.forEach(addons, function(addon) {
                    var array;
                    if (addon.compatible) {
                        array = goodAddons;
                    } else if (addon.compatible === null) {
                        array = untestedAddons;
                    } else {
                        array = badAddons;
                    }
                    array.push(addon);
                });

                sortByName(goodAddons);
                shuffleArray(untestedAddons);
                sortByName(badAddons);

                var tbody = document.getElementById("tbody");
                appendAddonRows(tbody, goodAddons);
                appendAddonRows(tbody, untestedAddons);
                appendAddonRows(tbody, badAddons);
            });
        }
    };
})(this);

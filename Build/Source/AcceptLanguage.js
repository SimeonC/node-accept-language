"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bcp47 = require("bcp47");
var stable = require("stable");
var AcceptLanguage = (function () {
    function AcceptLanguage() {
        this.languageTagsWithValues = {};
        this.defaultLanguageTag = null;
    }
    AcceptLanguage.prototype.languages = function (definedLanguages) {
        var _this = this;
        if (definedLanguages.length < 1) {
            throw new Error('The number of defined languages cannot be smaller than one.');
        }
        this.languageTagsWithValues = {};
        definedLanguages.forEach(function (languageTagString) {
            var languageTag = bcp47.parse(languageTagString);
            if (!languageTag) {
                throw new TypeError('Language tag ' + languageTagString + ' is not bcp47 compliant. For more info https://tools.ietf.org/html/bcp47.');
            }
            var language = languageTag.langtag.language.language;
            if (!language) {
                throw new TypeError('Language tag ' + languageTagString + ' is not supported.');
            }
            var langtag = languageTag.langtag;
            var languageTagWithValues = langtag;
            languageTagWithValues.value = languageTagString;
            if (!_this.languageTagsWithValues[language]) {
                _this.languageTagsWithValues[language] = [languageTagWithValues];
            }
            else {
                _this.languageTagsWithValues[language].push(languageTagWithValues);
            }
        });
        this.defaultLanguageTag = definedLanguages[0];
    };
    AcceptLanguage.prototype.get = function (languagePriorityList, returnDefault) {
        if (returnDefault === void 0) { returnDefault = true; }
        return this.parse(languagePriorityList, returnDefault)[0];
    };
    AcceptLanguage.prototype.create = function () {
        return null;
    };
    AcceptLanguage.prototype.parse = function (languagePriorityList, returnDefault) {
        if (returnDefault === void 0) { returnDefault = true; }
        var defaultTag = returnDefault ? [this.defaultLanguageTag] : [];
        if (!languagePriorityList) {
            return defaultTag;
        }
        var parsedAndSortedLanguageTags = parseAndSortLanguageTags(languagePriorityList);
        var result = [];
        for (var _i = 0, parsedAndSortedLanguageTags_1 = parsedAndSortedLanguageTags; _i < parsedAndSortedLanguageTags_1.length; _i++) {
            var languageTag = parsedAndSortedLanguageTags_1[_i];
            var requestedLang = bcp47.parse(languageTag.tag);
            if (!requestedLang) {
                continue;
            }
            var requestedLangTag = requestedLang.langtag;
            if (!this.languageTagsWithValues[requestedLangTag.language.language]) {
                continue;
            }
            var closestMatch = '', closestScore = 0, foundMatch = false;
            middle: for (var _a = 0, _b = this.languageTagsWithValues[requestedLangTag.language.language]; _a < _b.length; _a++) {
                var definedLangTag = _b[_a];
                for (var _c = 0, _d = ['privateuse', 'extension', 'variant', 'region', 'script']; _c < _d.length; _c++) {
                    var prop = _d[_c];
                    // Continue fast.
                    if (!requestedLangTag[prop]) {
                        continue;
                    }
                    // Filter out more 'narrower' requested languages first. If someone requests 'zh-Hant'
                    // and my defined language is 'zh'. Then I cannot match 'zh-Hant', because 'zh' is
                    // wider than 'zh-Hant'.
                    if (requestedLangTag[prop] && !definedLangTag[prop]) {
                        var score = scoreLanguageSimilarity(requestedLangTag, definedLangTag);
                        if (score > closestScore) {
                            closestMatch = definedLangTag.value;
                            closestScore = score;
                        }
                        continue middle;
                    }
                    // Filter out 'narrower' requested languages.
                    if (requestedLangTag[prop] instanceof Array) {
                        for (var i = 0; i < requestedLangTag[prop].length; i++) {
                            if (!deepEqual(requestedLangTag[prop][i], definedLangTag[prop][i])) {
                                var score = scoreLanguageSimilarity(requestedLangTag, definedLangTag);
                                if (score > closestScore) {
                                    closestMatch = definedLangTag.value;
                                    closestScore = score;
                                }
                                continue middle;
                            }
                        }
                    }
                    else if (requestedLangTag[prop] && definedLangTag[prop] !== requestedLangTag[prop]) {
                        continue middle;
                    }
                }
                foundMatch = true;
                result.push(definedLangTag.value);
            }
            if (!foundMatch) {
                result.push(closestMatch);
            }
        }
        return result.length > 0 ? result : defaultTag;
        function scoreLanguageSimilarity(languageA, languageB) {
            var score = 0;
            if (languageA.script === languageB.script)
                score += 2;
            if (languageA.region === languageB.region)
                score += 1;
            if (languageA.variant.length === languageB.variant.length) {
                var matchFail = false;
                for (var i = 0; i < languageA.variant.length; i += 1) {
                    matchFail = matchFail || languageA[i] !== languageB[i];
                }
                if (!matchFail)
                    score += 1;
            }
            return score;
        }
        function parseAndSortLanguageTags(languagePriorityList) {
            return stable(languagePriorityList.split(',').map(function (weightedLanguageRange) {
                var components = weightedLanguageRange.replace(/\s+/, '').split(';');
                return {
                    tag: components[0],
                    quality: components[1] ? parseFloat(components[1].split('=')[1]) : 1.0
                };
            })
                .filter(function (languageTag) {
                if (!languageTag) {
                    return false;
                }
                if (!languageTag.tag) {
                    return false;
                }
                return languageTag;
            })
            // Sort by quality
            , function (a, b) {
                return b.quality - a.quality;
            });
        }
    };
    return AcceptLanguage;
}());
function deepEqual(x, y) {
    if ((typeof x === 'object' && x !== null) && (typeof y === 'object' && y !== null)) {
        if (Object.keys(x).length !== Object.keys(y).length) {
            return false;
        }
        for (var prop in x) {
            if (y.hasOwnProperty(prop)) {
                if (!deepEqual(x[prop], y[prop])) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        return true;
    }
    else if (x !== y) {
        return false;
    }
    return true;
}
function create() {
    var al = new AcceptLanguage();
    al.create = function () {
        return new AcceptLanguage();
    };
    return al;
}
module.exports = create();
module.exports.default = create();
exports.default = create();

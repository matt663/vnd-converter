/**
 * VND Converter v4.0.8
 * Author: PhucBui
 * Author URL: https://buiminhphuc.com
 */

app = {};
dev = {};
mess = {};
input = {};
currentTab = {};
noti = {};
storage = {};
jQuery(document).ready(function ($) {
    /************************************
     * Dev functions
     ************************************/
    dev.status = false;
    dev.log = function (text) {
        if (dev.status) console.log(text);
    };

    /************************************
     * Message control
     ************************************/
    mess.$ = $("body.eodt2k16 #message");
    mess.clear = function () {
        mess.$.html('');
    };
    /**
     * Set validation message
     * @param errorCode
     */
    mess.setValidation = function (errorCode) {
        // break if mess existed
        if (mess.$.find('.validation.' + errorCode).length) return;

        // define
        var classes = 'validation ' + errorCode,
            text, html;

        // switch error code
        switch (errorCode) {
            case 'too-long-input':
                text = "Hãy nhập giá trị ngắn hơn 100 kí tự.";
                break;
            case 'empty-input':
                text = "Hãy quét chọn hoặc gõ ngoại tệ mà bạn muốn đổi.";
                break;
            case 'currency-code-not-found':
                text = "Hãy gõ mã ngoại tệ.";
                break;
            case 'number-not-found':
                text = "Hãy gõ số lượng bạn muốn đổi.";
                break;
            default:
                text = "";
        }

        // build html
        html = '<p class="' + classes + '">' + text + '</p>';

        mess.$.append(html);
    };

    /**
     * Remove validation message
     * @param errorCode
     */
    mess.unsetValidation = function (errorCode) {
        var validation = mess.$.find('.validation.' + errorCode);
        if (validation.length) validation.remove();
    };

    /**
     * Set result, rate
     * @param resultText
     * @param rateText
     */
    mess.setResult = function (resultText, rateText) {
        // Remove old result
        mess.clearResult();

        // Add new result, rate
        mess.$.append('<p class="success result">' + resultText + '</p>');
        mess.$.append('<p class="success rate">' + rateText + '</p>');
    };
    mess.clearResult = function () {
        mess.$.find(".success").remove();
    };

    /*************************************
     * Storage
     *************************************/
    storage.sync = {
        set: function (value) {
            chrome.storage.sync.set({notiKey: value}, function () {
                dev.log("Storage sync:" + value);
            });
        }
    };

    /*************************************
     * Notification
     *************************************/
    noti.run = function () {
        // Get data from Git
        $.ajax({
            url: "https://raw.githubusercontent.com/phucbm/em-oi-doi-tien/master/core-v4/notification.txt",
            dataType: 'text',
            success: function (data) {
                data = JSON.parse(data);
                noti.id = data.id;
                noti.show = data.show;
                noti.date = data.date;
                noti.title = data.title;
                noti.icon = data.icon;
                noti.content = data.content;
                noti.link = data.link;

                noti.display();
            },
            error: function () {
                dev.log("Get notification data from Git fail!");
            }
        });

    };

    /**
     * Show notification
     */
    noti.display = function () {
        if (noti.show !== "true") return;

        // Get notiID from chrome storage
        chrome.storage.sync.get("notiKey", function (result) {
            result = JSON.parse(result.notiKey);
            dev.log("Storage value:");
            dev.log(result);
        });

        /*var isShown = storage.sync.get();
        if (isShown === "shown") return;*/

        // Show notification
        var notification = new Notification(noti.title, {
            icon: noti.icon,
            body: noti.content
        });

        // Save noti flag
        var val = '{"status":"shown","notiID":"' + noti.id + '"}';
        storage.sync.set(val);

        notification.onclick = function () {
            // Open link
            if (noti.link.length > 0) {
                window.open(noti.link);
            }
        };
    };

    /*************************************
     * Input
     *************************************/
    input.$ = $("body.eodt2k16 #input");
    input.valid = false;
    input.data = {
        raw: '',
        number: 0,
        currencyID: 0,
        currencyName: function () {
            if (currentTab.isSupported) {
                return app.currencyData.currencies[currentTab.currencySupportID].name;
            } else {
                return app.currencyData.currencies[input.data.currencyID].name;
            }
        },
        currencyRate: function () {
            if (currentTab.isSupported) {
                return app.currencyData.currencies[currentTab.currencySupportID].rate;
            } else {
                return app.currencyData.currencies[input.data.currencyID].rate;
            }
        }
    };

    /*************************************
     * Current tab
     *************************************/
    if (chrome.tabs != null) {
        chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
            var activeTab = arrayOfTabs[0];
            currentTab.url = activeTab.url;
            currentTab.favIconUrl = activeTab.favIconUrl;
            currentTab.title = activeTab.title;
            currentTab.incognito = activeTab.incognito;
        });
        dev.log(currentTab);
    }

    /**
     * Check if current site support auto currency code
     */
    currentTab.runCheck = function (currencies) {
        if (typeof currentTab.url === 'undefined') {
            dev.log("Current tab url is undefined!");
            return;
        }

        // dev.log(currentTab);
        // Loop each currency
        for (var i = 0; i < currencies.length; i++) {
            // Loop each site
            for (var j = 0; j < currencies[i].site.length; j++) {
                if (currentTab.url.indexOf(currencies[i].site[j]) >= 0) {
                    // Return currency code
                    currentTab.isSupported = true;
                    currentTab.currencySupportID = i;
                    input.data.currencyID = i;
                    currentTab.heySiteSupport();
                    return;
                }
            }
        }

        currentTab.isSupported = false;
    };

    currentTab.heySiteSupport = function () {
        var html = '<div class="site-support">';
        html += '<img src="' + currentTab.favIconUrl + '" class="favicon">';
        html += '<span class="text">Ngoại tệ mặc định: ' + input.data.currencyName() + '</span>';
        html += '</div>';
        $('body.eodt2k16 main').prepend(html);

        $('body.eodt2k16').addClass('site-supported');
    };

    /*************************************
     * App
     *************************************/
    /**
     *  Currency data
     * @type {{status: boolean, method: string, currencies: {}, update_text: string}}
     */
    app.currencyData = {
        status: false,
        method: '',
        update_text: '',
        currencies: {}
    };

    /**
     * Remove space, special characters
     * @param str
     * @returns {*}
     */
    app.textFilter = function (str) {
        // Break if str empty
        if (!str.length) return false;

        // Do filter
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/đ/g, "d");
        str = str.replace(/ /g, "");
        str = str.replace(/-/g, "");

        //dev.log("Text filtered: " + str);
        return str;
    };

    /**
     * Get number digit and dot, return false if no digit found
     * @param str
     * @returns {*}
     */
    app.numberFilter = function (str) {
        // Break if str empty
        if (!str.length) return false;

        // Do filter
        var number = "";
        for (var i = 0; i < str.length; i++) {
            // only get number digit, dot
            if (str.charCodeAt(i) >= 48 && str.charCodeAt(i) <= 57 || str[i] === "." || str[i] === ",") {
                number += str[i];
            }
        }

        if (number === '') {
            number = false;
        } else {
            number = parseFloat(number);
        }
        //dev.log("Number filtered: " + number);
        return number;
    };

    /**
     * Format currency, add commas
     * @param num
     * @returns {string}
     */
    app.formatCurrency = function (num) {
        var str = num.toFixed(2).toString(),
            x = str.split('.'),
            x1 = x[0],
            x2 = x.length > 1 ? '.' + x[1] : '',
            rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    };

    /**
     * Get currency data
     */
    app.getCurrencyData = function () {
        // Break if already have, only get data once
        if (app.currencyData.status) return;

        // Definition
        var local_currency = {
            "update_text": "Theo tỉ giá Vietcombank cập nhật lúc 27/05/2020",
            "currencies": [
                {
                    "name": " đô la Úc",
                    "rate": 15723.49,
                    "currencyCode": [
                        "aud",
                        "australiandollar",
                        "dolauc",
                        "tienuc"
                    ],
                    "site": []
                },
                {
                    "name": " đô la Canada",
                    "rate": 17166.98,
                    "currencyCode": [
                        "cda",
                        "canadiandollar",
                        "dolacanada",
                        "cad",
                        "tiencanada"
                    ],
                    "site": []
                },
                {
                    "name": " Swiss France",
                    "rate": 24529.08,
                    "currencyCode": [
                        "chf",
                        "swiss",
                        "franc",
                        "thuysi"
                    ],
                    "site": []
                },
                {
                    "name": " Danish Krone",
                    "rate": 3495.16,
                    "currencyCode": [
                        "dkk",
                        "danish",
                        "krone",
                        "danmach"
                    ],
                    "site": []
                },
                {
                    "name": " euro",
                    "rate": 26204.85,
                    "currencyCode": [
                        "eur",
                        "€",
                        "euro"
                    ],
                    "site": []
                },
                {
                    "name": " bảng Anh",
                    "rate": 29166.59,
                    "currencyCode": [
                        "gbp",
                        "£",
                        "pound",
                        "anh",
                        "bang",
                        "british"
                    ],
                    "site": []
                },
                {
                    "name": " đô la HK",
                    "rate": 3055.30,
                    "currencyCode": [
                        "hkd",
                        "$hk",
                        "hk",
                        "hongkongdollar",
                        "dolahongkong",
                        "dolahk",
                        "hongkong"
                    ],
                    "site": []
                },
                {
                    "name": " rupee Ấn Độ",
                    "rate": 320.50,
                    "currencyCode": [
                        "inr",
                        "indianrupee",
                        "rupee",
                        "ando"
                    ],
                    "site": []
                },
                {
                    "name": " yên Nhật",
                    "rate": 220.39,
                    "currencyCode": [
                        "yen",
                        "jpy",
                        "¥",
                        "￥",
                        "円",
                        "japaneseyen",
                        "nhat"
                    ],
                    "site": [
                        "amazon.co.jp",
                        ".jp",
                        "ikea.com/jp/en/"
                    ]
                },
                {
                    "name": " won",
                    "rate": 19.91,
                    "currencyCode": [
                        "won",
                        "krw",
                        "₩",
                        "southkorean",
                        "han"
                    ],
                    "site": [
                        ".kr"
                    ]
                },
                {
                    "name": " ringgit Malaysia",
                    "rate": 5423.63,
                    "currencyCode": [
                        "myr",
                        "ringgit",
                        "malai",
                        "malay",
                        "rm"
                    ],
                    "site": []
                },
                {
                    "name": " kroner Na Uy",
                    "rate": 2404.49,
                    "currencyCode": [
                        "nok",
                        "kroner",
                        "nauy",
                        "norwegian"
                    ],
                    "site": []
                },
                {
                    "name": " rub Nga",
                    "rate": 366.87,
                    "currencyCode": [
                        "rub",
                        "nga"
                    ],
                    "site": []
                },
                {
                    "name": " krona Thụy Điển",
                    "rate": 2471.39,
                    "currencyCode": [
                        "sek",
                        "krona",
                        "thuydien",
                        "swedish"
                    ],
                    "site": []
                },
                {
                    "name": " đô la Sing",
                    "rate": 16709.19,
                    "currencyCode": [
                        "sgd",
                        "dolasing",
                        "singapo",
                        "sing",
                        "dosing",
                        "s$"
                    ],
                    "site": [
                        "irvinsaltedegg.com"
                    ]
                },
                {
                    "name": " baht Thái",
                    "rate": 745.22,
                    "currencyCode": [
                        "thb",
                        "฿",
                        "bath",
                        "baht",
                        "thai"
                    ],
                    "site": []
                },
                {
                    "name": " đô la Mỹ",
                    "rate": 23410,
                    "currencyCode": [
                        "$",
                        "usd",
                        "usdollar",
                        "dola",
                        "hoaki",
                        "hoaky",
                        "my"
                    ],
                    "site": []
                },
                {
                    "name": " nghìn",
                    "rate": 1000,
                    "currencyCode": [
                        "nghin"
                    ],
                    "site": []
                },
                {
                    "name": " Đài tệ",
                    "rate": 795.69,
                    "currencyCode": [
                        "twd",
                        "daite",
                        "NT$",
                        "NTD",
                        "NT"
                    ],
                    "site": []
                },
                {
                    "name": " Nhân dân tệ",
                    "rate": 3330,
                    "currencyCode": [
                        "cny",
                        "ndt",
                        "nhandante",
                        "te",
                        "tq",
                        "trung"
                    ],
                    "site": [
                        "taobao.com",
                        "1688.com",
                        ".cn",
                        "tmall.com",
                        "tmall.hk"
                    ]
                },
                {
                    "name": " Philippine Piso",
                    "rate": 435.22,
                    "currencyCode": [
                        "php",
                        "piso"
                    ],
                    "site": []
                },
                {
                    "name": " Kip Lào",
                    "rate": 2.83,
                    "currencyCode": [
                        "kip",
                        "lao",
                        "kip lao"
                    ],
                    "site": []
                }
            ]
        };


        // Fetch currency from Git
        $.ajax({
            url: "https://raw.githubusercontent.com/phucbm/em-oi-doi-tien/master/core-v4/currency.txt",
            dataType: 'text',
            success: function (data) {
                data = JSON.parse(data);
                app.currencyData.currencies = data.currencies;
                app.currencyData.update_text = data.update_text;
                app.currencyData.method = 'ajax';
                dev.log("Get currency from Git.");

                // Check current tab
                currentTab.runCheck(app.currencyData.currencies);
            },
            error: function () {
                // If ajax fail, use local data
                app.currencyData.currencies = local_currency.currencies;
                app.currencyData.update_text = local_currency.update_text;
                app.currencyData.method = 'local';
                dev.log("Get currency from local variable.");

                // Check current tab
                currentTab.runCheck(app.currencyData.currencies);
            }
        });

        app.currencyData.status = true;
        //dev.log(app.currencyData);
    };

    /**
     * Return currency index key if found
     * @param str
     * @returns {*}
     */
    app.findCurrencyID = function (str) {
        str = str.toString();
        var currencies = app.currencyData.currencies,
            hasFound = false,
            currencyID = 0,
            method;

        // Else loop each currency
        for (var i = 0; i < currencies.length; i++) {
            // Loop each currency code
            for (var j = 0; j < currencies[i].currencyCode.length; j++) {
                if (str.indexOf(currencies[i].currencyCode[j]) >= 0) {
                    // Currency code found in string
                    hasFound = true;
                    currencyID = i;
                    method = 'user-input';
                    break;
                }
            }
            if (hasFound) break;
        }

        if (hasFound) {
            dev.log("Currency code found: " + method);
            return currencyID;
        }
        return false;
    };

    /**
     * Validate and render input
     * @param valRaw
     * @returns boolean
     */
    app.validateInput = function (valRaw) {
        // Definition
        var valTextFiltered,
            valNumber,
            currencyID;
        //dev.log("Input: " + valRaw);

        // Check empty
        if (valRaw.length === 0) {
            mess.clear();
            mess.setValidation('empty-input');
            return false;
        } else {
            mess.unsetValidation('empty-input');
        }

        // Check length
        if (valRaw.length >= input.$.attr("maxlength")) {
            mess.setValidation('too-long-input');
            return false;
        } else {
            mess.unsetValidation('too-long-input');
        }

        // Text filter
        valTextFiltered = app.textFilter(valRaw);

        // Number filter
        valNumber = app.numberFilter(valTextFiltered);
        if (typeof valNumber !== "undefined" || valNumber !== false) {
            mess.unsetValidation('number-not-found');
        } else {
            mess.setValidation('number-not-found');
            return false;
        }

        // Find currency
        currencyID = app.findCurrencyID(valTextFiltered);
        dev.log("Find currency: " + currencyID);
        if (typeof currencyID !== "undefined" || currencyID !== false) {
            mess.unsetValidation('currency-code-not-found');
        } else {
            // If current site support auto currency code
            if (currentTab.isSupported) {
                currencyID = currentTab.currencySupportID;
            } else {
                // Currency code not found
                mess.setValidation('currency-code-not-found');
                return false;
            }
        }

        // Gather value
        input.valid = true;
        input.data.raw = valRaw;
        input.data.number = valNumber;
        input.data.currencyID = currencyID;

        return true;
    };

    /**
     * Convert
     * @param val
     */
    app.convert = function (val) {
        // Return if fail validation
        if (!app.validateInput(val)) {
            mess.clearResult();
            return;
        }

        // Definition
        var data = input.data,
            rate = data.currencyRate(),
            rawNumber = data.number,
            convertedNumber = rawNumber * rate,
            resultText, rateText;

        // Format number
        convertedNumber = app.formatCurrency(convertedNumber);
        rawNumber = app.formatCurrency(rawNumber);
        rate = app.formatCurrency(rate);

        // Build result text
        resultText = rawNumber + data.currencyName() + " = " + convertedNumber + " VNĐ";

        // Build rate text
        rateText = "Tỉ giá: 1" + data.currencyName() + " = " + rate + " VNĐ";

        mess.setResult(resultText, rateText);
    };

    /**
     * App run
     */
    app.run = function () {
        // Get currencies data
        app.getCurrencyData();

        // On key up
        input.$.on('keyup', function () {
            // Run convert
            app.convert(input.$.val());
        });

        // On user selection
        if (chrome.tabs != null) {
            chrome.tabs.executeScript({
                code: "window.getSelection().toString();"
            }, function (selection) {
                input.$.val(selection[0]);
                app.convert(selection[0]);
            });
        }

        //noti.run();
    };
    app.run();

    /**
     * Manual link action
     */
    $('body.eodt2k16 a').click(function () {
        var href = $(this).attr('href');
        chrome.tabs.create({url: href});
    });
});
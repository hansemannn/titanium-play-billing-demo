const IAP = require('ti.iap');

const PRODUCT_ID_1 = 'YOUR_PRODUCT_ID';

// Purchase states from the module:

// IAP.PURCHASE_STATE_UNSPECIFIED_STATE = 0;
// IAP.PURCHASE_STATE_PURCHASED = 1;
// IAP.PURCHASE_STATE_PENDING = 2;

let isBillingInitialized = false;

(function() {
    addLogs();

    IAP.addEventListener('connectionUpdate', onConnectionUpdate);
    IAP.addEventListener('purchaseUpdate', onPurchaseUpdated);

    $.index.open();
}());

function onWindowOpen() {
    IAP.initialize();
}

function getResponseMessage(rc) {
    let message = '';

    if (rc === IAP.CODE_BILLING_UNAVAILABLE) { message = "Billing API version is not supported for the type requested" }
    else if (rc === IAP.CODE_DEVELOPER_ERROR) { message = "Invalid arguments provided to the API" }
    else if (rc === IAP.CODE_FEATURE_NOT_SUPPORTED) { message = "Requested feature is not supported by Play Store on the current device" }
    else if (rc === IAP.CODE_ITEM_ALREADY_OWNED) { message = "Failure to purchase since item is already owned" }
    else if (rc === IAP.CODE_ITEM_NOT_OWNED) { message = "Failure to consume since item is not owned." }
    else if (rc === IAP.CODE_ITEM_UNAVAILABLE) { message = "Requested product is not available for purchase" }
    else if (rc === IAP.CODE_SERVICE_DISCONNECTED) { message = "Play Store service is not connected now" }
    else if (rc === IAP.CODE_SERVICE_TIMEOUT) { message = "The request has reached the maximum timeout before Google Play responds" }
    else if (rc === IAP.CODE_SERVICE_UNAVAILABLE) { message = "Network connection is down" }
    else if (rc === IAP.CODE_USER_CANCELED) { message = "User pressed back or canceled dialog" }
    else if (rc === IAP.CODE_ERROR) { message = "Fatal error during the API action" }
    else if (rc === IAP.CODE_BILLING_NOT_READY) { message = "Billing not ready" }
    else if (rc === IAP.CODE_SKU_NOT_AVAILABLE) { message = "SKU details not available for making purchase" }

    return message;
}

function onConnectionUpdate(e) {
    isBillingInitialized = e.success;
    addLogs('Connection: ' + isBillingInitialized);
}

function disconnect() {
    IAP.disconnect();
    onConnectionUpdate({success: false});
}

function queryPurchase() {
    const e = IAP.queryPurchases({productType: IAP.SKU_TYPE_INAPP});
    processQueriedPurchaseResponse(e, 'queryPurchases');
}

function fetchPurchase() {
    IAP.queryPurchaseHistoryAsync({
        productType: IAP.SKU_TYPE_INAPP,
        callback: processQueriedPurchaseResponse
    });
}

function processQueriedPurchaseResponse(e, tag = 'queryPurchaseHistoryAsync') {
    if (e.success) {
        if (e.purchaseList.length > 0) {
            addLogs(tag + ': Purchase list updated = ' + JSON.stringify(e.purchaseList));
            for (purchaseDetails of e.purchaseList) {
                acknowledgePurchase(purchaseDetails);
            }
        } else {
            addLogs(tag + ': Purchase  list empty');
        }
    } else {
        addLogs(tag + ': ' + getResponseMessage(e.code));
    }
}

function buyProduct() {
    if (isBillingInitialized && IAP.isReady()) {
        IAP.retrieveProductsInfo({
            productType: IAP.SKU_TYPE_INAPP,
            productIdList: [PRODUCT_ID_1],
            callback: function (e) {
                /*
                [
                      {
                        "originalPrice": "$6.90",
                        "productId": "YOUR_PRODUCT_ID",
                        "description": "Your amazing product.",
                        "originalPriceAmountMicros": 690000000,
                        "title": "Your App (Test)",
                        "type": "inapp",
                        "introductoryPrice": "",
                        "priceCurrencyCode": "USD",
                        "introductoryPricePeriod": "",
                        "subscriptionPeriod": "",
                        "originalJson": "{\"skuDetailsToken\":\"XXXXXXX\",\"productId\":\"YOUR_PRODUCT_ID\",\"type\":\"inapp\",\"price\":\"$6.90\",\"price_amount_micros\":690000000,\"price_currency_code\":\"USD\",\"title\":\"Your App (Test)\",\"description\":\"Your amazing product.\" }",
                        "priceAmountMicros": 690000000,
                        "price": "$6.90",
                        "introductoryPriceAmountMicros": 0,
                        "iconUrl": "",
                        "introductoryPriceCycles": 0
                      }
                    ]
                */

                if (e.success) {
                    addLogs('Item Details: ' + JSON.stringify(e.productList[0]));
                    // returns the same result code except if purchase is never made
                    const launchCode = IAP.purchase(PRODUCT_ID_1);
                    if (launchCode != IAP.CODE_OK) {
                        alert(getResponseMessage(launchCode));
                    }
                } else {
                    addLogs("Item Details error: " + getResponseMessage(e.code));
                }
            }
        });
    } else {
        alert(getResponseMessage(IAP.CODE_BILLING_NOT_READY));
    }
}

function onPurchaseUpdated(e) {
    /*
    {
      "purchaseList": [
        {
          "purchaseToken": "XXXXXXXX",
          "productId": "YOUR_PRODUCT_ID",
          "orderId": "GPA.3319-9400-1235-26613",
          "signature": "XXXXXXXXXXX",
          "obfuscatedAccountId": "",
          "developerPayload": "",
          "isAutoRenewing": false,
          "isAcknowledged": false,
          "purchaseTime": 1599226070820,
          "packageName": "com.example.yourapp",
          "obfuscatedProfileId": "",
          "purchaseState": 2
        }
      ],
      "success": true,
      "code": 0
    }
    */

    if (e.success) {
        addLogs('** onPurchaseUpdated success: ' + JSON.stringify(e.purchaseList[0]));
        acknowledgePurchase(e.purchaseList[0]);

    } else {
        addLogs('** onPurchaseUpdated error: ' + getResponseMessage(e.code));
    }
}

function acknowledgePurchase(purchaseDetails) {
    if (purchaseDetails.purchaseState === IAP.PURCHASE_STATE_PURCHASED) {
        if (!purchaseDetails.isAcknowledged) {
            addLogs('** acknowledging ' + purchaseDetails.productId + '…');
            // TODO: use `acknowledgeNonConsumableProduct` method if item is non-consumable
            IAP.acknowledgeConsumableProduct({
                purchaseToken: purchaseDetails.purchaseToken,
                callback: function (purchaseResult) {
                    addLogs('** acknowledgement done for *' + purchaseDetails.productId + '* : ' + purchaseResult.success);
                    if (purchaseResult.success) {
                        addLogs('** Purchase successful for *' + purchaseDetails.productId + '*');
                    } else {
                        addLogs('** Acknowledge error for *' + purchaseDetails.productId + '* : ' + getResponseMessage(purchaseResult.code));
                    }
                }
            });
        } else {
            addLogs('** Purchase acknowledged & successful for *' + purchaseDetails.productId + '*');
        }
    } else if (purchaseDetails.purchaseState === IAP.PURCHASE_STATE_PENDING) {
        addLogs('** Purchase pending for *' + purchaseDetails.productId + '*');
    }
}

// Helper methods

function getDateFormat() {
    function addZero(i) {
        if (i < 10) {
            i = '0' + i;
        }
        return i;
    }

    const Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    let h = d.getHours();
    const m = addZero(d.getMinutes());
    const s = addZero(d.getSeconds());
    const am = h >= 12 ? 'pm' : 'am';
    if (h > 12) {
        h = h - 12;
    }
    return Months[d.getMonth()] + ' ' + d.getDate() + ', ' + h + ':' + m + ':' + s + am;
}

function addLogs(msg = null) {
    let logs = Ti.App.Properties.getString('billing_logs', '');

    if (msg != null) {
        logs += '\n\n<< ' + getDateFormat() + ' >>\n' + msg;
        Ti.App.Properties.setString('billing_logs', logs);
    }

    $.logs.text = Ti.App.Properties.getString('billing_logs', '');
    setTimeout(() => $.scroll.scrollToBottom(), 250)
}

function clearLogs(e) {
    Ti.App.Properties.setString('billing_logs', '');
    $.logs.text = '';
    $.scroll.scrollToTop();
}

function copyLogs(e) {
    Ti.UI.Clipboard.text = Ti.App.Properties.getString('billing_logs', '');
}

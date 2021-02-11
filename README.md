# Titanium Android: Google Play Billing

This is a detailed guide on how to leverage [Google Play's Billing Library (GPBL)](https://developer.android.com/google/play/billing) using the Titanium Android module.

Looking for iOS? Ti.StoreKit has been rewritten as well, for example with pending transactions handling, better receipt-validation and redemption codes.
See `Get the module` for ways to contact.

**⚠️ [Must read for server handling before using this module](https://developer.android.com/google/play/billing/security#verify)**

### Requirements

- [x] Google Play Billing Library: 3.0.0+ (included in the module)
- [x] Titanium SDK: 9.0.0.GA+

### Get the module

The Play Billing module has been rewritten from the scratch (using Kotlin) to offer a modern and maintained alterative to [ti.inappbilling](https://github.com/appcelerator-archive/ti.inappbilling).
If you are interested in the module, pleas reach out via [TiSlack](https://tislack.org) (@hans) or [Twitter](https://twitter.com/hansemannnn) (@hansemannnn).

### Import the module

```js
const IAP = require('ti.iap');
```
 
### Initialization

Before calling any method on module, make sure to call `initialize()` which will respond through an event `connectionUpdate` to report whether the GPBL is connected for further actions:

```js
let isBillingInitialized = false;

IAP.addEventListener('connectionUpdate', event => {
    isBillingInitialized = event.success;
});

IAP.initialize();
```

### Module Constants (for different purposes):

```js
/* Check for supported features in `isFeatureSupported(…)` method */
FEATURE_TYPE_IN_APP_ITEMS_ON_VR         // Purchase/query for in-app items on VR
FEATURE_TYPE_PRICE_CHANGE_CONFIRMATION  // Launch a price change confirmation flow
FEATURE_TYPE_SUBSCRIPTIONS              // Purchase/query for subscriptions
FEATURE_TYPE_SUBSCRIPTIONS_ON_VR        // Purchase/query for subscriptions on VR
FEATURE_TYPE_SUBSCRIPTIONS_UPDATE       // Subscriptions update/replace

/* Product type constants */
SKU_TYPE_INAPP                          // for in-app consumable or non-consumable products
SKU_TYPE_SUBS                           // for subscriptions

/* Purchase states to check after purchasing a product */
PURCHASE_STATE_UNSPECIFIED_STATE        // when the purchase state cannot be determined
PURCHASE_STATE_PURCHASED                // when the product is purchased, acknowledgement is remaining after this generally
PURCHASE_STATE_PENDING                  // when purchase payment is pending after the product is owned, the payment can be made outside the app or can be cancelled as well

/* Response codes to match for `code` parameter returned in callbacks */
CODE_BILLING_UNAVAILABLE                // "Billing API version is not supported for the type requested."
CODE_DEVELOPER_ERROR                    // "Invalid arguments provided to the API."
CODE_FEATURE_NOT_SUPPORTED              // "Requested feature is not supported by Play Store on the current device."
CODE_ITEM_ALREADY_OWNED                 // "Failure to purchase since item is already owned."
CODE_ITEM_NOT_OWNED                     // "Failure to consume since item is not owned."
CODE_ITEM_UNAVAILABLE                   // "Requested product is not available for purchase."
CODE_SERVICE_DISCONNECTED               // "Play Store service is not connected now - potentially transient state."
CODE_SERVICE_TIMEOUT                    // "The request has reached the maximum timeout before Google Play responds."
CODE_SERVICE_UNAVAILABLE                // "Network connection is down."
CODE_USER_CANCELED                      // "User pressed back or canceled dialog."
CODE_ERROR                              // "Fatal error during the API action."
CODE_OK                                 // when the response was `ok`
CODE_BILLING_NOT_READY                  // "Billing library not ready"
CODE_SKU_NOT_AVAILABLE                  // "SKU details not available for making purchase"
```

### Check whether the GPBL is finally ready to make purchases and other calls

```js
// this method also tells whether the in-app purchases are supported and ready to make purchases
// or to know the statuses of past purchases
const isBillingReady = IAP.isReady();
```
Note: Some Android devices might have an older version of the Google Play Store app that doesn't support certain products types, such as subscriptions. Before your app enters the billing flow, you can call isFeatureSupported() to determine whether the device supports the products you want to sell:
```js
const isFeatureSupported = IAP.isFeatureSupported(IAP.FEATURE_TYPE_SUBSCRIPTIONS);
```

### Get products information

Before making a purchase on a product, it's important to retrieve its details as the module will internally store its required model.

```
IAP.retrieveProductsInfo(options);

/*
options: dictionary of below parameters
    - `productType`: pass product type constant - either IAP.SKU_TYPE_INAPP or IAP.SKU_TYPE_SUBS
    - `productIdList`: pass array of product ids setup at Google Play console for the app
    - `callback`: callback method after successful retrieval, contains below parameters
          - `success`: boolean for successful response
          - `code`: response code - IAP.CODE_OK for success
          - `productList`: array of product information dictionary with following key-value pairs
               {
                    "originalPrice": "$1.50",
                    "productId": "test_id_0001",
                    "description": "Testing Product",
                    "originalPriceAmountMicros": 1500000,
                    "title": "Test title",
                    "type": "inapp",
                    "introductoryPrice": "",
                    "priceCurrencyCode": "USD",
                    "introductoryPricePeriod": "",
                    "subscriptionPeriod": "",
                    "priceAmountMicros": 1500000,
                    "price": "$1.50",
                    "introductoryPriceAmountMicros": 0,
                    "iconUrl": "",
                    "introductoryPriceCycles": 0
                }
*/
```

### Make a purchase

Calling purchase method will launch the purchase dialog with relevant product information. Pass product-id and make sure to fetch product information before making a purchase call.
```js
const purchaseDialogLaunchCode = IAP.purchase(PRODUCT_ID);

// handle further if launch-code is not ok
if (purchaseDialogLaunchCode !== IAP.CODE_OK) {
    // check response codes in constants section for relevant messages
}
```

### Get purchase status

**Purchase statuses are handled in different ways as users can make payments outside or inside the app, on any other devices, even after launching purchase dialog on one device, or even if the app is killed. This section will guide on how to handle different purchase states.**

1. The event listener `purchaseUpdate` can be used to know the purchase details in following cases:
   - purchase is made or cancelled inside the app.
   - purchase is made outside with the app running in background mode. (event is not fired if purchase is not made in this mode)

```js
// Register this listener before making purchases
IAP.addEventListener('purchaseUpdate', event => {
/*
    {
       "success": true,
       "code": 0,
       "purchaseList": [
        {
          "purchaseToken": "xxxxxxxxxxx",
          "productId": "test_0001",
          "orderId": "GPA.1234-1234-1234-1234",
          "signature": "xxxxxxxx",
          "obfuscatedAccountId": "",
          "developerPayload": "",
          "isAutoRenewing": false,
          "isAcknowledged": false,
          "purchaseTime": 1599226070820,
          "packageName": "com.test.app",
          "obfuscatedProfileId": "",
          "purchaseState": 2
        },
        …
      ]
    }
*/

    if (event.success) {
        // e.purchaseList contains the purchase data represented above
        // check the purchase state and acknowledge product to finally give it to user;
        acknowledgePurchase(event.purchaseList[0]);
    } else {
        alert(event.code);
    }
});

```

2. Use `queryPurchases` method every time the app is launched to know the status of any purchase made outside the app or in killed state. [Read more about this method here](https://developer.android.com/reference/com/android/billingclient/api/BillingClient#querypurchases)

```js
const result = IAP.queryPurchases({ productType: IAP.SKU_TYPE_INAPP });

// the response parameters are exactly same as in event listener `purchaseUpdate`
processQueriedPurchaseResponse(result);

function processQueriedPurchaseResponse(result) {
    if (result.success) {
        if (result.purchaseList.length > 0) {
            for (purchaseDetails of result.purchaseList) {
                acknowledgePurchase(purchaseDetails);
            }
        }
    } else {
        alert(result.code);
    }
}
```

### Acknowledge purchase

Once the purchase is made, it's mandatory to acknowledge it so Google Play can mark it as claimed. [Read more about acknowledging here](https://developer.android.com/google/play/billing/integrate#process)

- If the product was consumable, call `acknowledgeConsumableProduct()`
- If the product was non-consumable, call `acknowledgeNonConsumableProduct()`

```js
function acknowledgePurchase(purchaseDetails) {
    if (purchaseDetails.purchaseState === IAP.PURCHASE_STATE_PURCHASED) {
        if (!purchaseDetails.isAcknowledged) {
            // use `acknowledgeNonConsumableProduct` method if item is non-consumable
            IAP.acknowledgeConsumableProduct({
                purchaseToken: purchaseDetails.purchaseToken,
                callback: event => {
                    event.success ? alert('purchase was successful and product delivered to user') : alert(event.code);
                }
            });
        } else {
            // do not deliver the product until the purchase is acknowledged
        }
    } else if (purchaseDetails.purchaseState === IAP.PURCHASE_STATE_PENDING) {
        // purchase is still pending, it can happen if user wants to make purchase outside the app or by any other medium
    }
}
```

### Additional methods

- **queryPurchaseHistoryAsync** : to know the purchase details of successful purchases from Google server

```js
IAP.queryPurchaseHistoryAsync({
    productType: IAP.SKU_TYPE_INAPP,
    callback: processQueriedPurchaseResponse	// implementation in `queryPurchases` section
});
```

- **disconnect** : method to call when entire billing flow is done to release resources
```js
IAP.disconnect();
```

## License

UNLICENSED

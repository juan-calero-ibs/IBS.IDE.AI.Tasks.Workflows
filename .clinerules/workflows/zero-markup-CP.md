**How to Set a Zero Markup CP**

# Steps 
1. Go to the profiles screen and look up the CP that requires the setting
2. Look up the CP and grab the customer id from the URL
3. Replace the {{customerID}} in this json object with the customer id from Step 2 for the new setting:
``
{
    "fkID": "{{customerID}}",
    "fkReference": "CUSTOMER",
    "id": "CUSTOMER|{{customerID}}|ALLOW_NON_MARKUP_AVAILABILITY",
    "inactivated": false,
    "settingCode": "ALLOW_NON_MARKUP_AVAILABILITY",
    "settingValue": "TRUE",
    "shortDescription": "Enable 0 Markup",
    "systemYN": "N"
}
``
4. Use the following curl to POST the new setting:
``curl --location 'https://api.aboveproperty.com/rest/v1/settings' \
--header 'Accept: application/json' \ß
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data '{
    "fkID": "{{customerID}}",
    "fkReference": "CUSTOMER",
    "id": "CUSTOMER|{{customerID}}|ALLOW_NON_MARKUP_AVAILABILITY",
    "inactivated": false,
    "settingCode": "ALLOW_NON_MARKUP_AVAILABILITY",
    "settingValue": "TRUE",
    "shortDescription": "Enable 0 Markup",
    "systemYN": "N"
}'``
5. Once this setting is in, ticket is complete

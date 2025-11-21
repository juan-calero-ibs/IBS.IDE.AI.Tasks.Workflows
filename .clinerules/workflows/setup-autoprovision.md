# How to Set Auto Provision

## 📑 Table of Contents
- [📘 Overview](#-overview)
- [⚠️ After Auto Provision](#️-after-auto-provision)
- [🧭 Steps](#-steps)
  - [1. Load channel parameters](#1-load-channel-parameters)
  - [2. Load channels](#2-load-channels)
  - [3. Update AVAILABLE_CHANNELS in UMT](#3-update-available_channels-in-umt)
  - [4. Setup UMT](#4-setup-umt)
  - [5. Configure AP Core to call UMT](#5-configure-ap-core-to-call-umt)
- [⚙️ Configure Auto Provision in UI](#️-configure-auto-provision-in-ui)
  - [6. Find Supplier Property Reference](#6-find-supplier-property-reference)
  - [7. Configure Auto Provision in UI](#7-configure-auto-provision-in-ui)

---

## 📘 Overview

**Auto Provisioning**  
*“Auto provisioning connects to a 3rd-party content/information API to create a property from scratch.”*

### What this means
UMT calls the content API of the supplier (EAN, Expedia, HotelBeds, DerbySoft, etc.) and retrieves:

- Attributes (amenities)  
- Base prices (shell prices)  
- Products (room types)  
- Images  
- Static descriptions  
- Occupancy  
- Rate plan codes  

Auto Provision builds the property structure in **APCore**, acting as **property initialization**.

---

## ⚠️ After Auto Provision
- Prices are **not** fully ready  
- Sell flag, markup, and distro controls must still be configured  
- Availability **is NOT guaranteed**  

---

## 🧭 Steps

### 1. Load channel parameters  

File:  
`Repositories/aboveproperty.data/cassandra/patches/US10587/stage/channel_parameters.json`

> ⚠️ Run the `migrateData` script with `-e STAGE`  
> (loads STAGE parameters into your local system).

---

### 2. Load channels

File:  
`Repositories/aboveproperty.data/cassandra/patches/US20242/stage/channels.json`

> ⚠️ Run the `migrateData` script again using `-e STAGE`  
> (loads STAGE channels into local).

---

### 3. Update AVAILABLE_CHANNELS in UMT  
(Channels were not uploaded correctly in the patch)

```bash
curl --location --request PUT 'http://localhost:8080/rest/v1/settings/CUSTOMER%7C5991a000-0000-0000-0000-000000000000%7CAVAILABLE_CHANNELS' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Authorization: ••••••' \
--data '{
    "fkID": "5991a000-0000-0000-0000-000000000000",
    "fkReference": "CUSTOMER",
    "id": "CUSTOMER|5991a000-0000-0000-0000-000000000000|AVAILABLE_CHANNELS",
    "inactivated": false,
    "lastModified": "2025-05-01T19:57:11.805+0000",
    "lastModifiedByID": "1a000000-0000-0000-0000-000000000000",
    "settingCode": "AVAILABLE_CHANNELS",
    "settingID": "80268ac9-d555-4d5f-b03f-ce7dbac74535",
    "settingValue": "[{\"channelID\":\"7ee6e40c-e2a3-4c58-adfa-b51b83caec33\",\"required\":false},{\"channelID\":\"337c738a-4127-4c48-bea1-099bbd41a7c1\",\"required\":false},{\"channelID\":\"6d7e6376-ed6c-4f5a-8088-8b4483ccd9b1\",\"required\":false},{\"channelID\":\"78fde0f4-f298-496c-999b-c0d16f98b67b\",\"required\":false},{\"channelID\":\"7cb4f274-123d-4803-9085-2dcb4f56cd3a\",\"required\":false},{\"channelID\":\"e55bff77-8a56-461f-90a8-2aea7cd00b44\",\"required\":false},{\"channelID\":\"ea8a3d4b-9826-418d-972c-13f9c4086608\",\"required\":false},{\"channelID\":\"43816a4b-7eca-4bf1-b345-989aed0fb425\",\"required\":false},{\"channelID\":\"39dcb295-65dd-4d5f-9bb4-8f17dec78af2\",\"required\":false},{\"channelID\":\"bcca04ec-6f36-4a1c-9d8b-898a8b91a90d\",\"required\":false},{\"channelID\":\"a909cae0-9906-4d80-9e33-ea41dfb0be6e\",\"required\":false},{\"channelID\":\"eb922fbb-f816-4137-ba3f-103ee483c631\",\"required\":false},{\"channelID\":\"3df3129f-d475-4268-a40a-87a329d4fd1e\",\"required\":false},{\"channelID\":\"8d7e9f02-701e-4fe2-bb20-64aa574fa7bb\",\"required\":false},{\"channelID\":\"5b1696ed-788a-4941-a6d1-6f369eb75a98\",\"required\":false},{\"channelID\":\"0e65c3b5-8f6b-44a8-823e-628bcd823aad\",\"required\":false},{\"channelID\":\"e2389fe2-64c2-4cec-bfa0-f9e2752dab2f\",\"required\":false},{\"channelID\":\"eb73916f-cfb3-4535-9d51-a102c7e762a2\",\"required\":false},{\"channelID\":\"0589c1c5-21fb-4cbf-9070-8ce11ef56a12\",\"required\":false},{\"channelID\":\"f60482ce-b99b-45d5-9b4b-df810478490a\",\"required\":false,\"parents\":[\"11a00000-0000-0000-0000-000000000000\",\"10a00000-0000-0000-0000-000000000000\",\"#\"]},{\"channelID\":\"8576520a-7095-4847-95de-2ccfee74a516\",\"required\":false},{\"channelID\":\"7eba737a-faa3-481c-b101-c125d6ea6653\",\"required\":false},{\"channelID\":\"123617c5-7900-4285-9d9e-fc30deef8e0a\",\"required\":false},{\"channelID\":\"6d791dca-47d1-4a59-b567-f8a1c3f4d417\",\"required\":false},{\"channelID\":\"337c738a-4127-4c48-bea1-099bbd41a7c1\",\"required\":false},{\"channelID\":\"27a7fe02-f3f0-4c38-be82-71dd3c33dc31\",\"required\":false},{\"channelID\":\"42ca958a-f4c7-4bb4-89f0-60727b82ef15\",\"required\":false},{\"channelID\":\"7196ba4c-b523-488b-ad30-572494795da7\",\"required\":false},{\"channelID\":\"20461c00-a11f-4e47-b2e9-6c56075fcb6b\",\"required\":false},{\"channelID\":\"e469c0dd-b5f8-4114-a82f-839607d46288\",\"required\":false},{\"channelID\":\"f8dcd42f-641d-4fbc-9650-53c4e36a0f42\",\"required\":false},{\"channelID\":\"335ee861-e07f-44e5-abd3-383b4d2d61d3\",\"required\":false},{\"channelID\":\"f8dcd42f-641d-4fbc-9650-53c4e36a0f42\",\"required\":false},{\"channelID\":\"df46911b-9b74-48dc-abeb-7712e4f5872c\",\"required\":false},{\"channelID\":\"26036bea-b560-4eb1-b3ab-942c04584b11\",\"required\":false},{\"channelID\":\"85adc122-a12d-477c-8edf-65f35748ea6a\",\"required\":false}]",
    "systemYN": "N"
}'
```

---

### 4. Setup UMT

Read the documentation:

- `~/src/github.com/aboveproperty/aboveproperty.umt/README.md`  
- `~/src/github.com/aboveproperty/aboveproperty.umt/config/README.md`  

---

### 5. Configure AP Core to call UMT

Inside **AP CORE**, open:

```text
src/main/java/com/abvprp/utils/config/ApplicationConfiguration.java
```

Find:

```text
UMT_URL_DEFAULT
```

Set it to:

```text
https://localhost:8580
```

---

## ⚙️ Configure Auto Provision in UI

### 6. Find Supplier Property Reference

UI Steps:

1. Open **Property Wizard**  
2. Search property using APS code (e.g., `BN2202`)  
3. Click **Edit → View Only**  
4. Go to the **Channels** tab  
5. Select a channel offering the property (e.g., `SUPPLY_SRH_EAN`)  
6. Click **Next**  
7. Select the channel in the left panel  
8. Go to **Property Details** tab in the right panel  

Look for **Property Reference**.  
Example:

```text
3814029
```

---

### 7. Configure Auto Provision in UI

UI Steps:

1. Open **Property Wizard**  
2. Go to **Auto Provision** tab  
3. Select the Channel  
4. Enter the **External Reference** (location code) found in step 6  

---

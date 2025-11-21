# **After doing Auto Provision → What you MUST always check**

When you run **Auto Provision** (i.e.: for `SUPPLY_SRH_EAN` and property `3814029`), UMT creates all the **price records**, but it may leave them with **default values that are NOT sellable**.

Because of that, Call Center won’t return availability until you finish these steps:

---

## 1️⃣ **Check the SELL FLAG on all prices**

**UI Path:**
🔎 *APS top search field (e.g., BN999) → MY PROPERTY*
📄 Prices Tab (`Master:SUPPLY_SRH_EAN:price`) → **Details** → **Edit** (green button) → **Next** → *Additional Information*

Look at the **Sellable (Sell Flag)** column — most of them will be **false**.

🔧 **Set them to `true`.**
This tells APS that the price is allowed to be sold.

---

## 2️⃣ **Set the MARKUP**

UMT sets markup = **0**, which for EAN/Expedia is not valid.

You must apply a markup, for example:

* **1.10 → 10%**
* **1.15 → 15%**

If markup is missing, APS may not calculate the sell price correctly → the price won’t appear in Call Center.

**UI Path:**
🔎 APS search → MY PROPERTY → Prices → Details → Edit

Go to **Wholesale Pricing**:

* Adjustment Rule: **Markup**
* Adjustment Method: **Percentage**
* Adjustment Amount: **1.10**

---

## 3️⃣ **Set the DISTRIBUTION CONTROLS (Price-level)**

Each price needs distribution controls so APS knows **which regions** and **Corporate Profile Contract Types** can sell it.

**UI Path:**
🔎 APS search → MY PROPERTY → Prices → Details → Edit

Go to **Distribution Control**:

* 🌍 Regions: **All**
* 🏢 CP Contract Types: **ALL**

---

## 4️⃣ **Save and test availability**

Once you set:

* ✔️ Sell Flag = **true**
* ✔️ Markup = **1.10 (10%)**
* ✔️ Distribution Control = **Regions: All | CP Types: ALL**

Then go to Call Center and retry availability:

👉 You should start seeing **AVAIL** return.
👉 Or at least avoid **“no price found” / “not sellable”** errors.

---

## 5️⃣ **Set PROPERTY-LEVEL Distribution Controls (required for access)**

Even if price-level controls are correct, the **property itself** must allow the channel.

**UI Path:**
🔎 APS search → **CONFIGURATION**

### 🌍 Rate Regions

* Distribution Control tab → Rate Regions sub-tab
* Select **"All"** → **Add+**

### 🏢 Corporate Profiles

* Distribution Control tab → Corporate Profiles sub-tab
* Select **"Allowed"** access type
* Search for a corporate profile → **Add+**

---

## 💡 **Why is this necessary?**

Auto Provision:

* Creates the property
* Creates all prices

…but it **does NOT know** your markup, business rules, or distribution access.
So it leaves everything **OFF by default** to avoid accidentally enabling properties in production.

---

## 🧠 **Joshua’s rule of thumb**

Whenever you auto-provision:

* ✔️ Go to **Prices**
* ✔️ Filter by **Property ID**
* ✔️ Verify:

  * **Sellable = true**
  * **Markup set**
  * **Distribution Control set**

Everything else usually works automatically.

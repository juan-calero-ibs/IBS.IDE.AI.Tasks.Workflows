# 📊 JavaScript Visualizers for Postman

This folder contains JavaScript files used to render **Postman Visualizer** views for APS/UMT requests.  
Each file corresponds to a specific endpoint and generates a clean, structured UI to simplify debugging and analysis.

---

## 🚀 How It Works

### **1. Match the file name to the endpoint**
Each JavaScript file must match the request URL, replacing `/` with `.`.

**Example:**

| Endpoint | JavaScript File |
|----------|------------------|
| `/rest/v1/reservations/conf` | `rest.v1.reservations.conf.js` |
| `/rest/v1/availability/hotels` | `rest.v1.availability.hotels.js` |

---

### **2. Copy the JS into Postman**
In Postman:

1. Open the request  
2. Go to the **Tests** tab (Post-response) or **Scripts** depending on your workspace  
3. Paste the content from the corresponding `.js` file

---

### **3. Send the request and open the “Visualize” tab**
After the request executes, click on **Visualize** to see the formatted summary.

You’ll get:
- Reservation summaries  
- Icons, badges, and colors  
- Parsed fields (reservationNumber, reservationID, status, profile, hotel…)  
- Splunk command helpers  
- Debugging quick-links  
- Clean HTML table layout  

---

## 📸 Example Screenshots  
> *(Place your screenshots in these sections — the repo will look much more helpful with them.)*

### **Visualizer Output Example**
![Visualizer Example](./images/visualizer-example.png)

---

### **VS Code README Preview**
![README Preview](./images/readme-preview.png)

---

## 📁 Folder Structure
js-for-postman/
├── rest.v1.reservations.conf.js
├── rest.v1.reservations.id.js
├── rest.v1.availability.hotels.js
├── rest.v1.reservations.create.js
└── ...

Each file contains an HTML/JavaScript layout specifically crafted for its API behavior.

---

## 🧪 Quick Testing Guide

1. Pick a Postman request  
2. Copy the matching visualizer JS file  
3. Paste it into the Script/Test tab  
4. Send the request  
5. View the formatted summary in the Visualize tab  

---

## 🔧 Best Practices

- Keep each visualizer file short and endpoint-focused  
- Reuse layout helper functions for consistency  
- Avoid external libraries — Postman only supports native JS/HTML  
- When APS adds new fields (e.g., pricing, ACL, state validation), update the visualizer  
- Keep screenshot examples fresh so the team always knows what to expect  

---

## 🤖 Future Enhancements

- Auto-detect endpoint and load corresponding JS  -> AUTO-LOADER-VISUALIZER.md
- Shared utility library for table formatting  
- Multi-tab visualizer (Summary / Raw / Debug)  
- Downloadable Splunk commands based on timestamp extracted from response  

---

### ✔ Ready to publish.
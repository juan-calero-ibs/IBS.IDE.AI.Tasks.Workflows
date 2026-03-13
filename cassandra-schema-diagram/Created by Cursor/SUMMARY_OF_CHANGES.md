# Summary of changes – Cassandra schema diagram

This folder contains a **copy** of the Cassandra tables diagram and generator created in the **aboveproperty** repo, for reference and reuse in the IBS.IDE.AI.Tasks.Workflows repo.

---

## Source

- **Origin:** `aboveproperty.sql/cassandra/schema/` (aboveproperty repo)
- **Files copied:**
  - `generate_tables_diagram.py` – Python script that parses CQL schema and emits a Mermaid diagram
  - `cassandra_tables_diagram.md` – Generated Mermaid flowchart of all Cassandra tables and materialized views, grouped by domain

---

## What was added in aboveproperty

### 1. Diagram generator (`generate_tables_diagram.py`)

- **Purpose:** Scans all `*.cql` files in the same directory (excluding keyspace/truncate scripts), extracts every `CREATE TABLE` and `CREATE MATERIALIZED VIEW` name, and writes a Mermaid flowchart.
- **Grouping:** Each table/view is assigned to a **domain** (e.g. Reservations, Customers, Invoices & Payments, Pricing & Products, Users & Security). The diagram is grouped by domain so the full schema is easier to navigate.
- **Extraction:** Multiple regex patterns so tables are found even when the opening `(` is on the next line. Both `CREATE TABLE` and `create table` (lowercase) are handled.
- **Output:** Writes `cassandra_tables_diagram.md` in the same directory, with a Mermaid code block that renders in GitHub, VS Code, etc.

### 2. Diagram content (`cassandra_tables_diagram.md`)

- **Scope:** All **204 tables** and **25 materialized views** from the aboveproperty Cassandra schema.
- **Domains used:** Addresses & Reference, Agreements, Alerts, Analytics & Batch, Attributes & UDF, Change & Audit, Channels, Config & Content, Customers, Data Load & Codes, Inventory, Invoices & Payments, Ledger & System, Marketing, Pricing & Products, Reservations, Rules, Users & Security, Workflow.
- **No “Other” bucket:** Domain rules were tuned so every table/view is assigned to one of these domains (no leftover “Other” group).

### 3. Domain rules (in the script)

- Reservations: `RESERVATION*`, `reservations_map*`, `reservation_rules`
- Customers: `CUSTOMER*`, `customers_by_*`, `customer_map*`
- Invoices & Payments: `INVOICE*`, `PAYMENT*`
- Pricing & Products: `PRICE*`, `PRODUCT*`, `price_map`, `REVENUE_MGMT*`
- Inventory: `INVENTORY*`, `inventory_map*`, `INV_RESTRICTION*`
- Plus rules for Agreements, Channels, Marketing, Alerts, Rules, Users & Security (including `device_token*`), Workflow, Attributes & UDF, Analytics & Batch, Change & Audit, Ledger & System, Data Load & Codes, Addresses & Reference (including `COUNTRIES`, `CURRENCIES`), Config & Content.

---

## How to use in this repo

- **View the diagram:** Open `cassandra_tables_diagram.md` in an editor or on GitHub that supports Mermaid to see the flowchart.
- **Regenerate the diagram:** The script expects to run in a directory that contains the CQL schema files. To regenerate the `.md` file with the latest schema:
  1. Copy `generate_tables_diagram.py` into `aboveproperty.sql/cassandra/schema/` (or any folder that has the `*.cql` files).
  2. Run: `python3 generate_tables_diagram.py`
  3. Copy the updated `cassandra_tables_diagram.md` back here if you want to refresh this repo’s copy.

The copy in **IBS.IDE.AI.Tasks.Workflows** is a snapshot for reference; the canonical schema and regeneration flow remain in the aboveproperty repo.

---

## Summary table

| Item | Description |
|------|-------------|
| **Script** | `generate_tables_diagram.py` – extracts table/view names from CQL, groups by domain, outputs Mermaid |
| **Diagram** | `cassandra_tables_diagram.md` – 204 tables + 25 materialized views, grouped by 19 domains |
| **Grouping** | By domain (e.g. Reservations, Customers, Invoices & Payments); all entities included, no “Other” |
| **Source repo** | aboveproperty (`aboveproperty.sql/cassandra/schema/`) |

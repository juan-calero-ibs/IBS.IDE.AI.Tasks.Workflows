#!/usr/bin/env python3
"""
Extract CREATE TABLE (and optionally CREATE MATERIALIZED VIEW) names from
aboveproperty Cassandra CQL schema and emit a Mermaid diagram.
Run from repo root or from aboveproperty.sql/cassandra/schema/.
"""
import re
import os
from pathlib import Path

SCHEMA_DIR = Path(__file__).resolve().parent
CQL_GLOB = "*.cql"
# Exclude keyspace and utility scripts
EXCLUDE = {"keyspace_", "drop_keyspace", "trunc_"}


def extract_table_names():
    tables = set()
    views = set()
    for cql_path in sorted(SCHEMA_DIR.glob(CQL_GLOB)):
        name = cql_path.stem
        if any(name.startswith(prefix) for prefix in EXCLUDE):
            continue
        text = cql_path.read_text()
        # CREATE TABLE [keyspace.]table_name (optional whitespace/newline then ( or /*)
        for m in re.finditer(
            r"CREATE\s+TABLE\s+(?:\w+\.)?(\w+)\s*[(/\*]",
            text,
            re.IGNORECASE | re.DOTALL,
        ):
            tables.add(m.group(1))
        for m in re.finditer(
            r"create\s+table\s+(?:\w+\.)?(\w+)\s*[(]",
            text,
        ):
            tables.add(m.group(1))
        # Fallback: name at end of line, ( on next line
        for m in re.finditer(
            r"CREATE\s+TABLE\s+(?:\w+\.)?(\w+)\s*$",
            text,
            re.IGNORECASE | re.MULTILINE,
        ):
            tables.add(m.group(1))
        # CREATE MATERIALIZED VIEW name AS
        for m in re.finditer(
            r"CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?(\w+)\s+AS",
            text,
            re.IGNORECASE,
        ):
            views.add(m.group(1))
    return sorted(tables), sorted(views)


def domain(table_name):
    """Group table/view into a diagram subgraph by name prefix/suffix. All items get a domain."""
    u = table_name.upper()
    # Reservations
    if u.startswith("RESERVATION") or "RESERVATIONS_MAP" in u or "RESERVATION_MAP" in u or "RESERVATION_RULES" in u:
        return "Reservations"
    # Customers
    if u.startswith("CUSTOMER") or u.startswith("CUSTOMERS_BY") or "CUSTOMER_MAP" in u:
        return "Customers"
    # Invoices & Payments
    if u.startswith("INVOICE") or u.startswith("PAYMENT"):
        return "Invoices & Payments"
    # Pricing & Products (includes revenue mgmt)
    if u.startswith("PRICE") or u.startswith("PRODUCT") or "PRICE_MAP" in u or u.startswith("REVENUE_MGMT"):
        return "Pricing & Products"
    # Inventory (includes inv restriction)
    if u.startswith("INVENTORY") or "INVENTORY_MAP" in u or u.startswith("INV_RESTRICTION"):
        return "Inventory"
    if u.startswith("AGREEMENT"):
        return "Agreements"
    if u.startswith("CHANNEL"):
        return "Channels"
    if u.startswith("MARKETING") or u.startswith("MKT_") or u.startswith("MMEDIA"):
        return "Marketing"
    if u.startswith("ALERT"):
        return "Alerts"
    if u.startswith("RULE"):
        return "Rules"
    # Users & Security (includes device tokens, sessions)
    if (
        u.startswith("USER")
        or u.startswith("SESSION")
        or u.startswith("SECURITY")
        or u.startswith("PERMISSION")
        or "DEVICE_TOKEN" in u
    ):
        return "Users & Security"
    if u.startswith("WORKFLOW"):
        return "Workflow"
    if u.startswith("ATTRIBUTE") or u.startswith("UDF_"):
        return "Attributes & UDF"
    if u.startswith("ANALYTIC") or u.startswith("REPORT") or u.startswith("BATCH_"):
        return "Analytics & Batch"
    if u.startswith("CHANGE_") or u.startswith("AUDIT") or "MESSAGE_" in u or "SCOPE_LEASE" in u:
        return "Change & Audit"
    if "GENERAL_LEDGER" in u or "DELIVERY_QUEUE" in u or "DISTRIBUTED_CACHE" in u:
        return "Ledger & System"
    if u.startswith("DATA_LOAD") or u.startswith("SANDBOX") or u.startswith("CODE"):
        return "Data Load & Codes"
    # Addresses & Reference (countries, currencies, time zones, etc.)
    if (
        u.startswith("ADDRESS")
        or u.startswith("CONTACT")
        or u.startswith("COMMENT")
        or u in ("COUNTRIES", "COUNTRY")
        or u in ("CURRENCIES", "CURRENCY") or u.startswith("CURRENCY")
        or u.startswith("TIME_ZONE")
    ):
        return "Addresses & Reference"
    if u.startswith("ACCESS_") or u.startswith("SETTING") or u.startswith("SUBSCRIPTION") or u.startswith("PROGRAM") or u.startswith("MULTIMEDIA"):
        return "Config & Content"
    return "Other"


def emit_mermaid(tables, views, include_views=True):
    by_domain = {}
    for t in tables:
        d = domain(t)
        by_domain.setdefault(d, []).append(t)
    if include_views:
        for v in views:
            d = domain(v)
            by_domain.setdefault(d, []).append(v + " (MV)")

    lines = ["flowchart TB", "  %% All tables and materialized views, grouped by domain"]
    domain_order = sorted(by_domain.keys(), key=lambda d: (d == "Other", d))
    for dom in domain_order:
        lines.append(f"  subgraph {dom.replace(' ', '_')}[\"{dom}\"]")
        for name in sorted(by_domain[dom]):
            node_id = re.sub(r"[^A-Za-z0-9_]", "_", name)
            lines.append(f"    {node_id}[\"{name}\"]")
        lines.append("  end")
    return "\n".join(lines)


def main():
    tables, views = extract_table_names()
    mermaid = emit_mermaid(tables, views)
    out = SCHEMA_DIR / "cassandra_tables_diagram.md"
    out.write_text(
        "# Cassandra tables overview\n\n"
        "**All tables and materialized views** from `aboveproperty.sql/cassandra/schema/*.cql`, "
        "grouped by domain. To refresh, run:\n\n"
        "```bash\npython3 schema/generate_tables_diagram.py\n```\n\n"
        "## Diagram\n\n```mermaid\n" + mermaid + "\n```\n"
    )
    print(f"Wrote {out}")
    print(f"Tables: {len(tables)}, Materialized views: {len(views)}")


if __name__ == "__main__":
    main()

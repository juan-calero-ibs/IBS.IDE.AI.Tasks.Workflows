#!/usr/bin/env python3
"""
Generate a Mermaid ER diagram from Cassandra CQL CREATE TABLE statements.

Default source:
  aboveproperty.devops/grafana-prometheus-docker-dev/cassandra-docker/files/schema

Default output:
  aboveproperty.devops/grafana-prometheus-docker-dev/cassandra-docker/files/schema/cassandra_schema.md
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


CREATE_TABLE_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_\.]+)\s*\((.*?)\)\s*WITH",
    re.IGNORECASE | re.DOTALL,
)


def normalize_table_name(raw: str) -> str:
    name = raw.strip().strip('"')
    if "." in name:
        name = name.split(".", 1)[1]
    return name.lower()


def sanitize_entity_name(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", name)


def split_columns(definition: str) -> list[str]:
    # Remove block comments and line comments to avoid parser confusion.
    cleaned = re.sub(r"/\*.*?\*/", "", definition, flags=re.DOTALL)
    cleaned = re.sub(r"--.*?$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"//.*?$", "", cleaned, flags=re.MULTILINE)

    parts: list[str] = []
    buf: list[str] = []
    paren_depth = 0
    angle_depth = 0
    for ch in cleaned:
        if ch == "(":
            paren_depth += 1
        elif ch == ")":
            paren_depth = max(0, paren_depth - 1)
        elif ch == "<":
            angle_depth += 1
        elif ch == ">":
            angle_depth = max(0, angle_depth - 1)

        if ch == "," and paren_depth == 0 and angle_depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return parts


def parse_table_columns(definition: str) -> tuple[list[tuple[str, str]], set[str]]:
    columns: list[tuple[str, str]] = []
    pks: set[str] = set()
    for item in split_columns(definition):
        if not item:
            continue
        line = item.strip()
        if not line:
            continue

        if re.match(r"(?i)^PRIMARY\s+KEY", line):
            for col in re.findall(r"[A-Za-z_][A-Za-z0-9_]*", line):
                if col.upper() not in {"PRIMARY", "KEY"}:
                    pks.add(col.lower())
            continue

        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$", line)
        if not m:
            continue
        col_name = m.group(1)
        col_type = m.group(2).strip()
        columns.append((col_name.lower(), col_type))
        if re.search(r"(?i)\bPRIMARY\s+KEY\b", col_type):
            pks.add(col_name.lower())

    return columns, pks


def normalize_mermaid_type(cql_type: str) -> str:
    t = cql_type.lower()
    t = re.sub(r"(?i)\bprimary\s+key\b.*$", "", t).strip()
    token = t.split()[0] if t else "text"

    if token.startswith("frozen<") and token.endswith(">"):
        token = token[7:-1]

    if token.startswith(("map<", "list<", "set<", "tuple<")):
        return "string"
    if token in {"text", "varchar", "ascii"}:
        return "string"
    if token in {"uuid", "timeuuid", "blob", "inet"}:
        return "string"
    if token in {"timestamp", "time"}:
        return "datetime"
    if token in {"date"}:
        return "date"
    if token in {"int", "smallint", "tinyint", "bigint", "varint", "counter"}:
        return "int"
    if token in {"decimal", "double", "float"}:
        return "float"
    if token in {"boolean", "bool"}:
        return "boolean"
    return "string"


def load_tables(schema_dir: Path) -> dict[str, dict]:
    tables: dict[str, dict] = {}
    for cql_file in sorted(schema_dir.glob("*.cql")):
        for table_raw, body in CREATE_TABLE_RE.findall(cql_file.read_text(encoding="utf-8", errors="ignore")):
            table_name = normalize_table_name(table_raw)
            columns, pks = parse_table_columns(body)
            if columns:
                tables[table_name] = {"columns": columns, "pks": pks, "file": cql_file.name}
    return tables


def infer_relationships(tables: dict[str, dict]) -> set[tuple[str, str, str]]:
    relationships: set[tuple[str, str, str]] = set()
    table_names = set(tables.keys())

    for table_name, info in tables.items():
        for col_name, _ in info["columns"]:
            if not col_name.endswith("_id"):
                continue

            base = col_name[:-3]
            candidates = [base, f"{base}s", f"{base}es", f"{base[:-1]}ies" if base.endswith("y") else ""]
            for candidate in candidates:
                if not candidate:
                    continue
                if candidate in table_names and candidate != table_name:
                    relationships.add((table_name, candidate, col_name))
                    break

    return relationships


def compute_connected_components(
    tables: dict[str, dict], relationships: set[tuple[str, str, str]]
) -> list[list[str]]:
    adjacency: dict[str, set[str]] = {name: set() for name in tables.keys()}
    for src, dst, _ in relationships:
        if src in adjacency and dst in adjacency:
            adjacency[src].add(dst)
            adjacency[dst].add(src)

    visited: set[str] = set()
    components: list[list[str]] = []

    for node in sorted(adjacency.keys()):
        if node in visited:
            continue
        stack = [node]
        component: list[str] = []
        while stack:
            current = stack.pop()
            if current in visited:
                continue
            visited.add(current)
            component.append(current)
            for neighbor in sorted(adjacency[current], reverse=True):
                if neighbor not in visited:
                    stack.append(neighbor)
        components.append(sorted(component))

    components.sort(key=lambda c: (len(c), c[0] if c else ""), reverse=True)
    return components


def chunk_component(component: list[str], max_tables_per_diagram: int) -> list[list[str]]:
    if max_tables_per_diagram <= 0 or len(component) <= max_tables_per_diagram:
        return [component]

    chunks: list[list[str]] = []
    for idx in range(0, len(component), max_tables_per_diagram):
        chunks.append(component[idx : idx + max_tables_per_diagram])
    return chunks


def prettify_domain_from_file(file_name: str) -> str:
    stem = Path(file_name).stem
    stem = re.sub(r"(?i)^cql_", "", stem)
    return stem.replace("_", " ").strip().title() or "Schema"


def derive_diagram_title(
    chunk_tables: dict[str, dict],
    component_size: int,
    part_index: int,
    total_parts: int,
) -> str:
    file_counts: dict[str, int] = {}
    for info in chunk_tables.values():
        file_name = info.get("file", "schema")
        file_counts[file_name] = file_counts.get(file_name, 0) + 1

    primary_file = max(
        sorted(file_counts.keys()),
        key=lambda name: file_counts[name],
    )
    domain = prettify_domain_from_file(primary_file)

    table_names = sorted(chunk_tables.keys())
    if len(table_names) == 1:
        base = f"{domain}: {table_names[0]}"
    else:
        examples = ", ".join(table_names[:2])
        base = f"{domain} ({examples})"

    if component_size > len(chunk_tables) and total_parts > 1:
        base += f" — Part {part_index}/{total_parts}"

    return base


def build_mermaid(tables: dict[str, dict], relationships: set[tuple[str, str, str]], source_dir: Path) -> str:
    lines: list[str] = [
        "%% Auto-generated by scripts/generate_cassandra_mermaid.py",
        f"%% Source: {source_dir}",
        "erDiagram",
    ]

    for table_name in sorted(tables.keys()):
        entity = sanitize_entity_name(table_name)
        lines.append(f"  {entity} {{")
        for col_name, col_type in tables[table_name]["columns"]:
            dtype = normalize_mermaid_type(col_type)
            safe_col = sanitize_entity_name(col_name)
            tag = " PK" if col_name in tables[table_name]["pks"] else ""
            lines.append(f"    {dtype} {safe_col}{tag}")
        lines.append("  }")

    for src, dst, col in sorted(relationships):
        src_entity = sanitize_entity_name(src)
        dst_entity = sanitize_entity_name(dst)
        lines.append(f"  {src_entity} }}o--|| {dst_entity} : \"{col}\"")

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Mermaid ER diagram from Cassandra CQL")
    parser.add_argument(
        "--schema-dir",
        default="aboveproperty.devops/grafana-prometheus-docker-dev/cassandra-docker/files/schema",
        help="Directory containing .cql files",
    )
    parser.add_argument(
        "--output",
        default="aboveproperty.devops/grafana-prometheus-docker-dev/cassandra-docker/files/schema/cassandra_schema.md",
        help="Output Mermaid file (.mmd) or Markdown file (.md)",
    )
    parser.add_argument(
        "--max-tables-per-diagram",
        type=int,
        default=30,
        help="For Markdown output, split into multiple Mermaid diagrams with at most this many tables each",
    )
    args = parser.parse_args()

    schema_dir = Path(args.schema_dir)
    output = Path(args.output)

    tables = load_tables(schema_dir)
    relationships = infer_relationships(tables)
    mermaid = build_mermaid(tables, relationships, schema_dir)

    output.parent.mkdir(parents=True, exist_ok=True)

    if output.suffix.lower() == ".md":
        components = compute_connected_components(tables, relationships)
        diagrams: list[tuple[str, dict[str, dict], set[tuple[str, str, str]]]] = []
        for component in components:
            chunks = chunk_component(component, args.max_tables_per_diagram)
            for chunk_idx, chunk in enumerate(chunks, start=1):
                subset = set(chunk)
                sub_tables = {name: tables[name] for name in chunk}
                sub_relationships = {
                    rel for rel in relationships if rel[0] in subset and rel[1] in subset
                }
                title = derive_diagram_title(
                    sub_tables,
                    component_size=len(component),
                    part_index=chunk_idx,
                    total_parts=len(chunks),
                )
                diagrams.append((title, sub_tables, sub_relationships))

        lines: list[str] = [
            "# Cassandra Schema Diagrams",
            "",
            f"Generated from: `{schema_dir}`",
            "",
            f"- Tables: **{len(tables)}**",
            f"- Inferred relationships: **{len(relationships)}**",
            f"- Diagrams: **{len(diagrams)}** (max **{args.max_tables_per_diagram}** tables each)",
            "",
        ]

        # Build map to identify omitted relationships that span diagram boundaries.
        table_to_diagram_idx: dict[str, int] = {}
        diagram_titles: dict[int, str] = {}
        for idx, (title, sub_tables, _) in enumerate(diagrams, start=1):
            diagram_titles[idx] = title
            for table_name in sub_tables.keys():
                table_to_diagram_idx[table_name] = idx

        cross_diagram_links: list[tuple[int, str, int, str, str]] = []
        for src, dst, col in sorted(relationships):
            src_idx = table_to_diagram_idx.get(src)
            dst_idx = table_to_diagram_idx.get(dst)
            if src_idx is None or dst_idx is None:
                continue
            if src_idx == dst_idx:
                continue
            cross_diagram_links.append((src_idx, src, dst_idx, dst, col))

        if cross_diagram_links:
            # Aggregate diagram-level links for an overview Mermaid graph.
            diagram_link_counts: dict[tuple[int, int], int] = {}
            for src_idx, _, dst_idx, _, _ in cross_diagram_links:
                key = (src_idx, dst_idx)
                diagram_link_counts[key] = diagram_link_counts.get(key, 0) + 1

            lines.extend(
                [
                    "## Cross-Diagram Links",
                    "",
                    "Relationships omitted from Mermaid blocks because source and destination tables are in different diagrams:",
                    "",
                    "### Diagram Relationship Overview",
                    "",
                    "```mermaid",
                    "flowchart LR",
                ]
            )

            for idx in sorted(diagram_titles.keys()):
                safe_title = diagram_titles[idx].replace('"', "'")
                lines.append(f"  D{idx}[\"Diagram {idx}: {safe_title}\"]")

            for (src_idx, dst_idx), count in sorted(diagram_link_counts.items()):
                lines.append(f"  D{src_idx} -->|{count} links| D{dst_idx}")

            lines.extend(
                [
                    "```",
                    "",
                    "### Detailed Cross-Diagram Links",
                    "",
                ]
            )
            for src_idx, src, dst_idx, dst, col in cross_diagram_links:
                lines.append(
                    f"- `{src}` (Diagram {src_idx}) -> `{dst}` (Diagram {dst_idx}) via `{col}`"
                )
            lines.append("")

        for diagram_idx, (title, sub_tables, sub_relationships) in enumerate(diagrams, start=1):
            lines.extend(
                [
                    f"## Diagram {diagram_idx}: {title}",
                    "",
                    f"- Tables: **{len(sub_tables)}**",
                    f"- Relationships: **{len(sub_relationships)}**",
                    "",
                    "```mermaid",
                    build_mermaid(sub_tables, sub_relationships, schema_dir).rstrip("\n"),
                    "```",
                    "",
                ]
            )

        markdown = "\n".join(lines)
        output.write_text(markdown, encoding="utf-8")
    else:
        output.write_text(mermaid, encoding="utf-8")

    print(f"Generated {output} with {len(tables)} tables and {len(relationships)} inferred relationships")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

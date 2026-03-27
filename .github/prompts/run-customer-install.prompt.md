---
name: run-customer-install
description: Run a customer install.sh from aboveproperty.data/customers to load local customer configuration, prompting for the customer when needed and surfacing any errors clearly.
argument-hint: Customer name, optional target URL, or install.sh path
agent: agent
---

# Run Customer Install Script

Run a customer configuration `install.sh` script from `~/src/github.com/aboveproperty/aboveproperty.data/customers`.

These scripts install customer configuration into the local environment.

## Accepted Input

Accept any of these forms:

- Customer name, for example `greatwolf`
- Nested customer path, for example `g6/data` or `ihg/data/demo`
- Absolute path to an `install.sh`
- Customer name plus target URL, for example `greatwolf http://localhost:8080`

If the user does not provide a customer, ask which customer to install before doing anything else.

## Workflow

1. Resolve the script path.
2. If only a customer name is provided, search under `~/src/github.com/aboveproperty/aboveproperty.data/customers` for a matching `install.sh`.
3. If multiple matches exist, present the options and ask the user to choose one.
4. Run the script from its own directory so relative files like `index.tsv` work correctly.
5. Pass the target URL only if the user supplied one. Otherwise let the script use its default target.
6. Capture and review the command output.
7. Report whether the install succeeded.
8. If there are errors, show the important error lines first, including shell failures, non-zero exit codes, and any HTTP status failures reported by the script.

## Execution Rules

- Prefer `bash ./install.sh` from the script directory.
- Do not edit the script unless the user explicitly asks for a fix.
- If the resolved script path does not exist, stop and explain what was searched.
- If the script exits non-zero, summarize the failure and include the most relevant output lines.
- If the output contains HTTP failures such as `HTTP_CODE was ... != 200`, call that out explicitly.
- If the script succeeds, provide a concise success summary including the script path and target used.

## Output Format

Use this structure:

1. `Script`: resolved script path
2. `Target`: explicit target URL or `script default`
3. `Result`: `success` or `failed`
4. `Key output`: short summary of the important lines
5. `Errors`: only include this section if something failed

## Examples

- `/run-customer-install greatwolf`
- `/run-customer-install ihg/data/demo`
- `/run-customer-install greatwolf http://localhost:8080`
- `/run-customer-install ~/src/github.com/aboveproperty/aboveproperty.data/customers/greatwolf/install.sh`
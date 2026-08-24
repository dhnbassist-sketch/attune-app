# Agent Instructions

## External documentation retrieval

When external documentation is available through SMFS:

1. Search SMFS before recursively exploring documentation files.
2. Prefer:
   smfs grep "<semantic query>" --tag <container>
3. Read only relevant files returned by search.
4. Do not scan entire documentation trees unless necessary.
5. Use normal grep/ripgrep only for exact identifiers or strings.
6. Treat .agent-docs as external reference documentation.

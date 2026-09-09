# Contracts

This directory is the source of truth for approved machine-readable interfaces.
It intentionally contains no product contract yet.

When the first interface is approved:

1. choose its technology-appropriate format;
2. commit the artifact through a governance PR to `main`;
3. update `VERSION` according to [the contract policy](../docs/CONTRACTS.md);
4. include valid and invalid examples where the chosen format permits; and
5. make frontend, backend, and integration checks consume this artifact.

Do not store generated stack clients here unless they are themselves the
canonical contract. Generated outputs belong to the consuming stack and must
identify this directory as their source.


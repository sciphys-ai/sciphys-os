# SciPhys OS Roadmap

SciPhys OS is building the open scientific data layer for experimental materials
and physics research.

## P0: Trustworthy XRD Core

- Expand parser coverage for Bruker, Rigaku, PANalytical, Malvern, and common
  ASCII exports.
- Build a benchmark suite for single phase, multiphase, impurity, low
  signal-to-noise, broad peak, preferred orientation, and substrate cases.
- Make phase matching evidence-first: matched peaks, unmatched peaks, missing
  strong references, candidate ambiguity, and confidence rationale.
- Improve CIF parsing, structure factor generation, profile fitting, and
  refinement diagnostics.

## P1: Open Scientific Data Schema

- Define stable schemas for sample, project, instrument, measurement, analysis
  result, provenance, expert feedback, and publication export.
- Provide JSON Schema and TypeScript types.
- Support export/import between SciPhys.ai, notebooks, and lab archives.

## P2: Multimodal Experimental Workflows

- Add Raman peak fitting and reference matching.
- Add SEM/AFM metadata and image-analysis fixtures.
- Add battery health data examples and benchmark tasks.
- Add notebook recipes for cross-measurement reasoning.

## P3: Community Benchmark and Leaderboard

- Publish DOI-backed benchmark snapshots.
- Track parser compatibility and phase-identification accuracy.
- Accept community submissions with transparent provenance.
- Make expert corrections auditable and reusable.

## What Stays Commercial

The hosted SciPhys.ai product focuses on private lab workspaces, permissions,
AI analysis agents, expert review loops, organization dashboards, and secure
data collaboration.

The open project focuses on formats, parsers, benchmarks, and evidence logic.

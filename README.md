# Mosaic: An Architecture for Scalable and Extensible Data Views

Mosaic is an extensible architecture for linking data visualizations, tables, input widgets, and other data-driven components, leveraging a backing database for scalable processing.

The key idea is to have interface components "publish" their data needs as declarative queries that can then be managed, optimized, and cross-filtered by a coordinator that proxies access to a backing database such as DuckDB.

This repository contains a set of related projects:

- `duckdb`: A Node.js + DuckDB data server that supports transfer of Apache Arrow and JSON data over either Web Sockets or HTTP.
- `sql`: An API for convenient construction and analysis of SQL queries. Query objects then coerce to SQL query strings.
- `mosaic`: The core Mosaic components. A central coordinator, signals and selections for linking values or query predicates (respectively) across Mosaic clients, and filter groups with optimized index management. Mosaic can send queries either over the network to a backing server (`socket` and `rest` clients) or to a client-side DuckDB-WASM instance (`wasm` client).
- `inputs`: Standalone data-driven components such as input menus, text search boxes, and sortable infinite-scroll data tables.
- `vgplot`: A prototype visualization grammar implemented on top of Observable Plot, in which marks (plot layers) are individual Mosaic clients. These marks can push data processing (binning, hex binning, regression) and optimizations (such as M4 for line/area charts) down to the database.

## Build Instructions

To build and develop Mosaic locally:

- Clone [https://github.com/uwdata/mosaic](https://github.com/uwdata/mosaic).
- Run `npm i` to install dependencies.
- Run `npm test` to run the test suite.
- Run `npm run build` to build a client-side bundle.

To run the interactive examples:

- Run `node run server` to launch a data server with default files loaded.
- Run `npx wds` to launch a local web server.
- Browse to `http://localhost:8000/dev/` to view examples.

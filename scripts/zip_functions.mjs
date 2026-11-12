// Empaqueta las funciones de netlify/functions (con sus dependencias) para subirlas a Netlify por la API.
import { zipFunctions } from "@netlify/zip-it-and-ship-it";
import { mkdirSync } from "node:fs";
mkdirSync("dist/functions", { recursive: true });
const out = await zipFunctions("netlify/functions", "dist/functions", { archiveFormat: "zip", basePath: process.cwd(), repositoryRoot: process.cwd() });
console.log(JSON.stringify(out.map(f => ({ name: f.name, path: f.path, runtime: f.runtime, apiVersion: f.runtimeAPIVersion || 1, invocationMode: f.invocationMode, priority: f.priority, routes: f.routes || [] }))));

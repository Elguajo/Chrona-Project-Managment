import { getDatabasePathForDiagnostics } from "../src/lib/db/connection";

console.info(`Database is ready at ${getDatabasePathForDiagnostics()}`);

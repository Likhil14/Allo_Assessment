/**
 * __tests__/setup.ts
 * Global test setup — loads env vars for integration tests.
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load .env.test if present, otherwise fall back to .env.local
config({ path: resolve(process.cwd(), ".env.test") })
config({ path: resolve(process.cwd(), ".env.local") })

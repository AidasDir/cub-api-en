# Migrating to Vercel: Frontend, Backend, and PostgreSQL

## 1. Introduction and Goals

This document provides a comprehensive guide for migrating your existing full-stack application (React frontend, Node.js/Express backend, and PostgreSQL database) from a local development setup to Vercel services. The goal is to successfully deploy and run your application and API on Vercel, utilizing Vercel Postgres for the database.

This guide covers:
- Deploying the React frontend.
- Migrating the Node.js/Express API to Vercel Serverless Functions.
- Migrating your local PostgreSQL database to Vercel Postgres.
- Configuration and best practices for a smooth transition.

## 2. Prerequisites

Before you begin, ensure you have the following:

- **Vercel Account:** Sign up or log in at [vercel.com](https://vercel.com).
- **Git Repository:** Your project code should be hosted on a Git provider supported by Vercel (GitHub, GitLab, Bitbucket).
- **Local PostgreSQL Database Details:** You'll need access to your local PostgreSQL instance to export its data (host, port, username, password, database name).
- **Node.js and npm/yarn/pnpm/bun:** Installed locally for running commands and managing dependencies. This project uses npm primarily, based on `package-lock.json`.
- **`psql` command-line tool:** For interacting with PostgreSQL (usually part of a PostgreSQL installation).
- **`pg_dump` command-line tool:** For exporting PostgreSQL data (usually part of a PostgreSQL installation).

## 3. Overall Migration Strategy

The migration will be performed in three main stages:

1.  **Frontend Deployment:** The React frontend application (built with Vite) will be deployed as a static site on Vercel. Vercel excels at this.
2.  **Database Migration:** Your local PostgreSQL database schema and data will be migrated to a new Vercel Postgres instance.
3.  **Backend API Migration:** The existing Node.js/Express backend API (`cub-api-backend`) will be refactored to run as Vercel Serverless Functions.

We will aim for minimal initial changes to get the application running on Vercel, followed by recommendations for further optimization.

## 4. Frontend Migration to Vercel

This section details the steps to deploy your React/Vite frontend to Vercel.

### 4.1. Connecting Your Repository to Vercel

1.  Log in to your Vercel dashboard.
2.  Click on "Add New..." and select "Project".
3.  Import your Git repository:
    *   Choose your Git provider (e.g., GitHub).
    *   Select the repository for this project.
    *   Vercel will typically try to auto-detect the framework.

### 4.2. Build Configuration in Vercel

Vercel should automatically detect Vite. If not, or to customize:

-   **Framework Preset:** Select `Vite`.
-   **Build Command:**
    *   Vercel will likely default to `npm run build` (due to `package-lock.json`).
    *   The script defined in your `package.json` is `tsc -b && vite build --outDir dist`. This command will be executed by Vercel.
    *   Ensure your `typescript` and `vite` versions in `package.json` are compatible with Vercel's Node.js build environment (usually recent LTS versions are fine).
-   **Output Directory:**
    *   Vite's default output directory is `dist`, which is specified in your build script (`--outDir dist`). Vercel should auto-detect this. If not, set it to `dist`.
-   **Install Command:**
    *   Vercel will use `npm install` by default if `package-lock.json` is present at the root.
-   **Root Directory:**
    *   Leave as default if your frontend `package.json` and `vite.config.ts` are in the root of the repository.

### 4.3. Handling `base: '/developer/'` in `vite.config.ts`

Your `vite.config.ts` currently has `base: '/developer/'`. This means the application expects to be served from a `/developer/` subpath. Vercel deploys projects to the root of the deployment URL by default.

**Recommendation:**

For the simplest Vercel deployment, it's best if the application can run from the root (`/`).

1.  **Modify `vite.config.ts`:**
    Change:
    ```typescript
    // vite.config.ts
    export default defineConfig({
      plugins: [react()],
      base: '/developer/',
      // ...
    });
    ```
    To (Option 1: relative base path - good for flexibility):
    ```typescript
    // vite.config.ts
    export default defineConfig({
      plugins: [react()],
      base: './', // Or simply remove the base line if assets are handled correctly
      // ...
    });
    ```
    Or (Option 2: absolute root path):
    ```typescript
    // vite.config.ts
    export default defineConfig({
      plugins: [react()],
      base: '/', // Or simply remove the base line
      // ...
    });
    ```
    Test thoroughly locally after this change to ensure all asset paths and routing work as expected from the root.

2.  **Commit and Push this change to your Git repository before deploying on Vercel, or configure Vercel to use a branch with this change.**

If serving from `/developer/` is an absolute requirement and cannot be changed, you may need to explore Vercel's path rewrite capabilities or monorepo settings, which can add complexity. The recommendation is to adapt the app to run from the root if possible.

### 4.4. Frontend Environment Variables

Identify any environment variables your frontend needs. For Vite applications, these must be prefixed with `VITE_`.

Example: If your frontend calls an API and the URL is configurable:
`VITE_API_URL=https://your-api-domain.vercel.app/api`

1.  In your Vercel project settings, navigate to "Settings" > "Environment Variables".
2.  Add any necessary `VITE_` prefixed variables. For now, you might not know the final API URL, so you can set a placeholder or update this after the backend is deployed.

### 4.5. Custom Domains (Optional)

Once deployed, you can assign a custom domain to your Vercel project:

1.  In your Vercel project settings, navigate to "Settings" > "Domains".
2.  Add your custom domain and follow the instructions to configure DNS records.

### 4.6. Initial Deployment and Testing

1.  After configuring the project settings (build command, output directory, environment variables), Vercel will automatically trigger a deployment when you push to the connected Git branch. You can also manually trigger a deployment from the Vercel dashboard.
2.  Once the deployment is complete, access the Vercel-provided URL (e.g., `your-project-name.vercel.app`).
3.  **Test Thoroughly:**
    *   Check if all pages load correctly.
    *   Verify that assets (images, CSS, JS) are loading without errors (check browser console).
    *   Test routing within the app.
    *   At this stage, API calls will likely fail as the backend isn't deployed yet. This is expected.

---
*(Further sections for Database, Backend, etc., will be added in subsequent steps)*

## 5. Database Migration to Vercel Postgres

This section covers migrating your local PostgreSQL database to Vercel Postgres.

### 5.1. Creating a Vercel Postgres Instance

1.  From your Vercel dashboard, navigate to the "Storage" tab.
2.  Click "Create Database" and choose "Postgres".
3.  Follow the prompts to:
    *   Select a region for your database (choose one geographically close to your users or your serverless functions' region).
    *   Name your database.
    *   Link it to your Vercel project. This is crucial as it will automatically inject environment variables (like `POSTGRES_URL`) into your project's build and runtime environments.
4.  Once created, Vercel will provide you with connection details.

### 5.2. Obtaining Connection Details

After creating the Vercel Postgres instance and linking it to your project:

1.  Go to your Vercel project's settings.
2.  Navigate to "Settings" > "Environment Variables".
3.  You should see several environment variables automatically added by Vercel for your Postgres database. The most important one for direct connections (like with `psql`) is usually `POSTGRES_URL` or a similar one that provides the full connection string (`postgresql://user:password@host:port/database`).
    *   Other variables like `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE`, `POSTGRES_PASSWORD` might also be provided separately.

    **Important:** For the `psql` import, you'll typically use the full `POSTGRES_URL`.

### 5.3. Exporting Data from Local PostgreSQL (using `pg_dump`)

Before you can import data into Vercel Postgres, you need to export it from your local PostgreSQL database.

1.  **Open your terminal or command prompt.**
2.  **Run the `pg_dump` command:**
    Replace placeholders (`your_local_user`, `your_local_db_name`, `backup.sql`) with your actual local database details and desired backup filename.
    ```bash
    pg_dump -U your_local_user -d your_local_db_name -h localhost -W -F c -b -v -f backup.sql
    ```
    Or, if your local setup doesn't require a password prompt or specific host:
    ```bash
    pg_dump -U your_local_user -d your_local_db_name -f backup.sql --no-password
    ```
    **Explanation of common flags:**
    *   `-U your_local_user`: Your PostgreSQL username.
    *   `-d your_local_db_name`: The name of your local database.
    *   `-h localhost`: Hostname of your local PostgreSQL server.
    *   `-W`: Prompts for the password. You can omit this if your local setup allows passwordless access for the user, or set up a `.pgpass` file.
    *   `-f backup.sql`: Specifies the output file for the dump.
    *   `-F c`: Output a custom-format archive file (often preferred for pg_restore, but for psql, a plain SQL dump is also fine. If you use `-F c`, you'd use `pg_restore` instead of `psql -f` for importing). For simplicity with `psql -f`, you might prefer a plain SQL dump (omit `-F c`).

    **For plain SQL dump (recommended for `psql -f`):**
    ```bash
    pg_dump -U your_local_user -d your_local_db_name -h localhost -W --clean --if-exists --no-owner --no-privileges -f backup.sql
    ```
    This command will create a `backup.sql` file containing the SQL commands to recreate your database's schema and data.
    *   `--clean`: Adds commands to drop objects before creating them.
    *   `--if-exists`: Adds `IF EXISTS` to drop commands.
    *   `--no-owner`: Prevents setting ownership of objects (useful when migrating to a different user).
    *   `--no-privileges`: Prevents dumping ACLs (privileges).

    This dump will include your schema (tables, columns, types from migrations like `001_create_users_table.sql`, etc.) and all data.

### 5.4. Importing Data into Vercel Postgres (using `psql`)

Once you have your `backup.sql` file and your Vercel Postgres connection string:

1.  **Open your terminal or command prompt.**
2.  **Run the `psql` command:**
    Retrieve the `POSTGRES_URL` (or equivalent full connection string) from your Vercel project's environment variables.
    ```bash
    psql "your_vercel_postgres_connection_string" -f backup.sql
    ```
    Replace `"your_vercel_postgres_connection_string"` with the actual connection string.
    *   The connection string will look something like: `postgresql://user:password@host.region.vercel-storage.com:5432/database_name`
    *   The `-f backup.sql` flag tells `psql` to execute the commands from your dump file.

3.  **Network Access/Firewalls:**
    *   Vercel Postgres databases are typically accessible over the public internet using their connection string (which includes credentials).
    *   Ensure the machine where you run the `psql` command has internet access.
    *   Some managed database services require you to whitelist IP addresses for direct connections. Check your Vercel Postgres settings if you encounter connection issues, though this is less common for Vercel's own managed services compared to, say, AWS RDS.

4.  **Verification:**
    *   After the import completes (it might take some time depending on database size), you can connect to your Vercel Postgres instance using `psql` or a database GUI tool (using the same connection string) to verify that your tables and data have been imported correctly.
    ```bash
    psql "your_vercel_postgres_connection_string"
    # Then run SQL commands like: \dt (to list tables), SELECT * FROM your_table LIMIT 10;
    ```

### 5.5. Updating Environment Variables (Review)

By linking your Vercel Postgres database to your project during creation, Vercel should have automatically set the necessary `POSTGRES_URL` (and other related) environment variables in your project's settings. These will be used by your backend API once it's deployed. Double-check these are present.

## 6. Backend API Migration to Vercel Serverless Functions

This section explains how to migrate your existing Node.js/Express backend API (from the `cub-api-backend` directory) to Vercel Serverless Functions. We'll start by wrapping the current Express app into a single serverless function for a quicker initial deployment.

### 6.1. Consolidating Dependencies

Your backend has its own `package.json` in `cub-api-backend/package.json`. For Vercel deployments, it's generally simpler to have a single `package.json` at the root of your project that includes all dependencies (frontend and backend).

1.  **Identify Backend Dependencies:**
    Open `cub-api-backend/package.json` and list all dependencies and devDependencies.
    Key dependencies include: `axios`, `bcryptjs`, `body-parser`, `cookie-parser`, `cors`, `dotenv`, `express`, `express-validator`, `jsonwebtoken`, `magic-sdk`, `morgan`, `pg`.

2.  **Add Backend Dependencies to Root `package.json`:**
    Open the `package.json` file located at the root of your project.
    For each dependency from `cub-api-backend/package.json`, add it to the `dependencies` section of the root `package.json`. For example, if `express` is in the backend `package.json`, add `"express": "^4.17.1"` (use the correct version) to the root `package.json`.
    ```json
    // Root package.json
    {
      "name": "react-vite-tailwind",
      // ... other frontend dependencies
      "dependencies": {
        // ... existing frontend dependencies
        "express": "^4.19.2", // Example, use version from cub-api-backend/package.json
        "pg": "^8.12.0",       // Example
        "jsonwebtoken": "^9.0.2", // Example
        "magic-sdk": "^29.1.0", // Already present, ensure version compatibility if different
        "cors": "^2.8.5",      // Example
        "dotenv": "^16.4.5",   // Example
        // ... add all other backend dependencies
      },
      "devDependencies": {
        // ... existing frontend devDependencies
        // Add backend devDependencies if any are critical for the build/runtime on Vercel
        // (typically, runtime dependencies are the most important here)
      }
    }
    ```
    **Note:** Some dependencies like `magic-sdk` might already exist if shared. Ensure versions are compatible or consolidate to a single version. `dotenv` is useful for local development but on Vercel, environment variables are set through the Vercel dashboard.

3.  **Install Consolidated Dependencies:**
    Run `npm install` (or `yarn install` / `pnpm install` / `bun install` depending on your project's package manager, likely `npm install` given `package-lock.json`) in the root directory to update your `package-lock.json` with all dependencies.

4.  **Remove/Ignore `cub-api-backend/node_modules` and `cub-api-backend/package-lock.json`:**
    *   Delete the `node_modules` directory from inside `cub-api-backend/` if it exists.
    *   Delete `cub-api-backend/package-lock.json` (or `yarn.lock`, etc.) if it exists.
    *   Ensure `cub-api-backend/node_modules/` is added to your main `.gitignore` file if not already covered.

### 6.2. Creating the `api/` Directory

Vercel uses an `api/` directory at the root of your project (or the configured "Root Directory" in Vercel project settings) to host serverless functions.

1.  In the **root** of your project, create a new directory named `api`.

### 6.3. Adapting the Express App

We will create a single serverless function that runs your entire existing Express application.

1.  **Create `api/index.js`:**
    Inside the `api/` directory, create a file named `index.js` (or `server.js`, `app.js`). This will be the entry point for your API on Vercel.

2.  **Modify `api/index.js` to export the Express app:**
    ```javascript
    // api/index.js
    // Adjust the path to correctly locate your Express app's entry point
    const app = require('../cub-api-backend/index.js');

    // Export the app for Vercel
    module.exports = app;
    ```

3.  **Modify `cub-api-backend/index.js` to prevent `app.listen()` on Vercel:**
    Your main backend file (`cub-api-backend/index.js`) likely calls `app.listen()` to start the server. Vercel handles this itself. You need to prevent this call when deployed on Vercel.

    Change this part in `cub-api-backend/index.js`:
    ```javascript
    // const PORT = process.env.PORT || 3000; // Or whatever your port is
    // app.listen(PORT, () => {
    //   console.log(`Server running on port ${PORT}`);
    // });
    ```
    To this (conditional listen):
    ```javascript
    const PORT = process.env.PORT || 3001; // Vercel might set PORT, or use a different one for local

    // Only listen if not running on Vercel (Vercel handles listening)
    // process.env.VERCEL is a system environment variable set by Vercel.
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server listening on PORT: ${PORT}`);
      });
    }

    // Make sure to export the app if you weren't already,
    // though the api/index.js above is already requiring it.
    // If it's not explicitly exported, require might still get the app instance
    // if app is a global or module-scoped variable modified by the script.
    // Explicitly:
    // module.exports = app; // Add this at the end of cub-api-backend/index.js
    ```
    **Important:** Ensure `cub-api-backend/index.js` either implicitly makes the `app` instance available to `require` or explicitly exports it using `module.exports = app;`. The subtask for Step 1 noted that `index.js` defines routes directly on `app`. If `app` is declared with `const app = express();` at the top level of that file, it should be available via `require`. Adding `module.exports = app;` at the end is the most robust way.

### 6.4. Database Connection in Backend

Your backend needs to connect to the Vercel Postgres database using the connection string provided as an environment variable.

1.  **Update Database Connection Logic (in `cub-api-backend/index.js` or your DB utility file):**
    Your current code likely initializes `pg.Pool` like this:
    ```javascript
    // cub-api-backend/index.js (example)
    // const pool = new Pool({
    //   user: process.env.DB_USER,
    //   host: process.env.DB_HOST,
    //   database: process.env.DB_NAME,
    //   password: process.env.DB_PASSWORD,
    //   port: process.env.DB_PORT,
    // });
    ```
    Change this to use the `POSTGRES_URL` (or equivalent like `DATABASE_URL`) provided by Vercel:
    ```javascript
    // cub-api-backend/index.js
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL, // Vercel injects this
      ssl: {
        rejectUnauthorized: false // Required for Vercel Postgres, unless you configure specific CA certs
      }
    });
    ```
    **Recommendation: Use `@vercel/postgres` SDK:**
    For optimal performance and connection management in serverless environments, Vercel recommends using their `@vercel/postgres` SDK.
    Install it: `npm install @vercel/postgres` (in the root directory).
    Then, you can use it like this:
    ```javascript
    // cub-api-backend/index.js or a db util file
    const { sql } = require('@vercel/postgres');

    // Example usage in a route handler:
    // const { rows } = await sql`SELECT * FROM users WHERE id = ${userId};`;
    ```
    This SDK handles connection pooling and serverless lifecycle nuances automatically. You would replace direct `pool.query` calls with `sql` tagged template literals. This is a larger refactor but recommended for long-term stability. For initial migration, ensuring `pg.Pool` uses the `POSTGRES_URL` with SSL is the minimum.

### 6.5. Authentication Middleware

Your authentication middleware (`authenticateToken`, `authenticateMagicUser` in `cub-api-backend/middleware/auth.js`) should largely work as is, since they operate on the request object within the Express framework.

1.  **Ensure Secrets are Environment Variables:**
    *   The `authenticateToken` uses a `TOKEN_SECRET`.
    *   The `authenticateMagicUser` uses `process.env.MAGIC_SECRET_KEY`.
    *   Make sure `TOKEN_SECRET` (if not already using an env var) and `MAGIC_SECRET_KEY` are defined as environment variables in your Vercel project settings. **Do not hardcode secrets.**

### 6.6. Backend Environment Variables

List all environment variables your backend API requires and ensure they are set in the Vercel project settings ("Settings" > "Environment Variables"). These include:

-   `POSTGRES_URL` (and other `POSTGRES_*` vars - Vercel adds these automatically when linking Vercel Postgres)
-   `MAGIC_SECRET_KEY` (for Magic Link authentication)
-   `TOKEN_SECRET` (for your custom JWTs)
-   Any other API keys or configuration values currently in `.env` files or your local environment.
    *   `CORS_ORIGIN_WHITELIST` (e.g., `http://localhost:5173` for local, and your Vercel frontend URL for production: `https://your-project.vercel.app`) - Your CORS middleware in `cub-api-backend/index.js` should use this.
    *   `NODE_ENV` (Vercel sets this to `production` for production deployments)

### 6.7. `vercel.json` Configuration (Optional)

For this monolithic Express app approach, Vercel can often automatically handle routing requests to `/api/(.*)` to your `api/index.js` function. However, you can create a `vercel.json` file in the root of your project for more explicit control or if you encounter routing issues.

```json
// vercel.json (optional, Vercel might handle this automatically)
{
  "version": 2,
  "functions": {
    "api/index.js": {
      "memory": 1024, // Optional: Increase memory if needed (default is 1024MB for Hobby)
      "maxDuration": 10 // Optional: Increase max duration if needed (default 10s for Hobby)
    }
  },
  "rewrites": [
    // If your Express app's routes already start with /api, like /api/users,
    // Vercel's file-system routing for api/index.js might handle this.
    // If your Express app handles routes from the root (e.g. /users), you'd need rewrites:
    // { "source": "/users/(.*)", "destination": "/api/index" },
    // { "source": "/devices/(.*)", "destination": "/api/index" }
    // Given your backend routes are /api/*, this might not be strictly needed.
    // A catch-all for /api if not automatically handled:
    { "source": "/api/(.*)", "destination": "/api/index" }
  ]
}
```
The existing backend routes like `/api/users/get` already include `/api`, so Vercel's default behavior of routing `/api` to the function in `api/index.js` should work well. The `rewrites` section might therefore be minimal or not needed.

### 6.8. Testing the Deployed API

1.  After deploying, use a tool like Postman, `curl`, or your deployed frontend to test the API endpoints.
2.  Check Vercel logs for your functions ("Functions" tab in your Vercel project deployment) for any errors.
    *   Pay attention to database connection errors, middleware issues, or problems with environment variables.

## 7. Post-Migration Configuration and Testing

After deploying the frontend, database, and backend API to Vercel, perform these final steps.

### 7.1. Updating Frontend to Use New Vercel API Endpoints

If you hadn't set it before, or if it needs changing, ensure your frontend's API URL environment variable points to your new Vercel API.

1.  **Identify your Vercel API URL:** This will typically be your Vercel project's domain followed by `/api`. For example, `https://your-project-name.vercel.app/api`.
2.  **Update Frontend Environment Variable:**
    *   Go to your Vercel project settings > "Settings" > "Environment Variables".
    *   Set or update the `VITE_API_URL` variable (or whatever your frontend uses) to this URL. For example: `VITE_API_URL=https://your-project-name.vercel.app/api`.
    *   Ensure this variable is available to the "Production", "Preview", and "Development" environments as needed.
3.  **Redeploy Frontend:** If you changed an environment variable that affects the build, Vercel should automatically trigger a new deployment for the Production environment. If not, manually redeploy the latest commit.

### 7.2. End-to-End Testing

Thoroughly test your entire application:

1.  **User Authentication:**
    *   Test login with Magic Link.
    *   Test token-based authentication for subsequent requests.
    *   Test profile creation, switching, and management.
2.  **Core Functionality:**
    *   Test all CRUD operations for devices, bookmarks, notifications, cards, reactions, and notices.
    *   Verify that data is correctly saved to and retrieved from Vercel Postgres.
    *   Check that frontend components display data correctly from the API.
3.  **Edge Cases and Error Handling:**
    *   Test invalid inputs and expect user-friendly error messages.
    *   Check how the application behaves with incorrect or expired tokens.
4.  **CORS:**
    *   Ensure your backend's CORS policy (configured in `cub-api-backend/index.js` using `process.env.CORS_ORIGIN_WHITELIST`) correctly allows requests from your Vercel frontend domain (e.g., `https://your-project-name.vercel.app`) and blocks requests from other origins. Your `CORS_ORIGIN_WHITELIST` environment variable in Vercel should include your frontend's production URL.

### 7.3. Reviewing Vercel Logs

1.  **Frontend:** Check the build logs for any errors during the deployment process.
2.  **Backend API (Functions):**
    *   In your Vercel project dashboard, go to the "Functions" tab.
    *   Select your `api/index` function (or any other functions).
    *   Review runtime logs for any errors or unexpected behavior during your testing. This is crucial for debugging.
3.  **Database:**
    *   Vercel Postgres provides logging. Access these through the Vercel dashboard (Storage > Your Postgres DB > Logs) to check for any database-level errors.

## 8. Recommendations for Future Optimization

While the current migration approach aims to get your application running on Vercel quickly, consider these optimizations for better performance, scalability, and maintainability:

1.  **Refactor Backend to Function-per-Route:**
    *   Instead of a single monolithic serverless function (`api/index.js`) running the entire Express app, break down your API into smaller, independent functions (e.g., `api/users.js`, `api/devices.js`).
    *   This can improve cold start times for individual endpoints, allow for more granular scaling, and make the codebase easier to manage. Each function would handle specific routes,
[M::end_of_stream]

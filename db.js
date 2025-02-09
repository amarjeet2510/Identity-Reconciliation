import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

// Create the `contacts` table if it doesn't exist
export const createTable = async () => {
    await sql`
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            phone_number TEXT,
            email TEXT,
            linked_id INTEGER REFERENCES contacts(id),
            link_precedence TEXT CHECK (link_precedence IN ('primary', 'secondary')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    console.log("Table is ready!");
};

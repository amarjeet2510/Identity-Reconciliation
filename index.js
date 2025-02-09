import "dotenv/config";
import express from "express";
import { sql, createTable } from "./db.js";

const app = express();
app.use(express.json());

// Ensure database table exists
await createTable();

// Identify API
app.post("/identify", async (req, res) => {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Email or phoneNumber is required" });
    }

    try {
        const existingContacts = await sql`
            SELECT * FROM contacts WHERE email = ${email} OR phone_number = ${phoneNumber}
        `;

        let primaryContact;
        if (existingContacts.length > 0) {
            primaryContact = existingContacts.find(c => c.link_precedence === "primary") || existingContacts[0];

            const isNewContact = !existingContacts.some(c => c.email === email && c.phone_number === phoneNumber);
            if (isNewContact) {
                const newSecondary = await sql`
                    INSERT INTO contacts (email, phone_number, linked_id, link_precedence)
                    VALUES (${email}, ${phoneNumber}, ${primaryContact.id}, 'secondary')
                    RETURNING *
                `;
                existingContacts.push(newSecondary[0]);
            }
        } else {
            const newPrimary = await sql`
                INSERT INTO contacts (email, phone_number, link_precedence)
                VALUES (${email}, ${phoneNumber}, 'primary')
                RETURNING *
            `;
            primaryContact = newPrimary[0];
        }

        // Fetch all contacts linked to the primary contact
        const allContacts = await sql`
            SELECT * FROM contacts WHERE linked_id = ${primaryContact.id} OR id = ${primaryContact.id}
        `;

        const emails = new Set(allContacts.map(c => c.email).filter(Boolean));
        const phoneNumbers = new Set(allContacts.map(c => c.phone_number).filter(Boolean));
        const secondaryContactIds = allContacts.filter(c => c.link_precedence === "secondary").map(c => c.id);

        res.json({
            contact: {
                primaryContactId: primaryContact.id,
                emails: Array.from(emails),
                phoneNumbers: Array.from(phoneNumbers),
                secondaryContactIds
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

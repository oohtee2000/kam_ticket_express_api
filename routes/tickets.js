const express = require("express");
const { db, query } = require("../config/db");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/", upload.single("image"), async (req, res) => {
    const { name, email, phone, location, department, category, subCategory, otherSubCategory, title, details } = req.body;
    
    // Log the image path to ensure it's correctly saved
    if (req.file) {
        console.log("Uploaded image file:", req.file);
    }
    
    // Save the filename of the uploaded image
    const image = req.file ? req.file.filename : null; // Save the filename instead of image data

    try {
        const result = await query(
            "INSERT INTO tickets (name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, image]
        );
        
        res.json({ message: "Ticket submitted successfully!", ticketId: result.insertId });
    } catch (err) {
        console.error("Error inserting ticket:", err);
        res.status(500).json({ error: "Database error. Ticket not saved." });
    }
});


// router.post("/", upload.single("image"), async (req, res) => {
//     console.log("Received file:", req.file);
//     console.log("Received body:", req.body);
    
//     const { name, email, phone, location, department, category, subCategory, otherSubCategory, title, details } = req.body;
//     const image = req.file ? req.file.filename : null;

//     try {
//         const result = await query(
//             "INSERT INTO tickets (name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
//             [name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, 'images']
//         );
//         res.json({ message: "Ticket submitted successfully!", ticketId: result.insertId });
//     } catch (err) {
//         console.error("Error inserting ticket:", err);
//         res.status(500).json({ error: "Database error. Ticket not saved." });
//     }
// });




router.get("/", async (req, res) => {
    try {
        const results = await query("SELECT * FROM tickets");

        // Map the results and include the image path (base URL + image filename)
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `http://localhost:5000/uploads/${ticket.image}` : null // Image URL
        }));
        res.json(formattedResults);
    } catch (err) {
        console.error("Error fetching tickets:", err);
        res.status(500).json({ error: "Database error. Could not retrieve tickets." });
    }
});




// 📌 GET a SINGLE Ticket by ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query("SELECT * FROM tickets WHERE id = ?", [id]);
        if (result.length === 0) return res.status(404).json({ error: "Ticket not found." });
        res.json(result[0]);
    } catch (err) {
        console.error("Error fetching ticket:", err);
        res.status(500).json({ error: "Database error. Could not retrieve ticket." });
    }
});

// 🗑 DELETE a Ticket
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query("DELETE FROM tickets WHERE id = ?", [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Ticket not found." });
        res.json({ message: "Ticket deleted successfully!" });
    } catch (err) {
        console.error("Error deleting ticket:", err);
        res.status(500).json({ error: "Database error. Ticket not deleted." });
    }
});


router.put("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await query("UPDATE tickets SET status = ? WHERE id = ?", [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        res.json({ message: "Ticket status updated successfully!" });
    } catch (err) {
        console.error("Error updating ticket status:", err);
        res.status(500).json({ error: "Database error. Could not update ticket status." });
    }
});


// GET the 5 Most Recent Tickets
router.get("/recent/latest", async (req, res) => {
    try {
        const results = await query("SELECT * FROM tickets ORDER BY id DESC LIMIT 5");

        // Format results with image URLs
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `http://localhost:5000/uploads/${ticket.image}` : null
        }));

        res.json(formattedResults);
    } catch (err) {
        console.error("Error fetching recent tickets:", err);
        res.status(500).json({ error: "Database error. Could not retrieve recent tickets." });
    }
});

// GET all unresolved tickets and unassigned tickets
router.get("/unresolved", async (req, res) => {
    try {
        // Query to select tickets where status is 'Unresolved' and assigned_to is 'NULL'
        const results = await query("SELECT * FROM tickets WHERE status = 'Unresolved' AND assigned_to IS NULL");

        // Format the results to include the image URL
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `http://localhost:5000/uploads/${ticket.image}` : null
        }));

        res.json(formattedResults);  // Send the formatted results as the response
    } catch (err) {
        console.error("Error fetching unresolved tickets:", err);
        res.status(500).json({ error: "Database error. Could not retrieve unresolved tickets." });
    }
});


// In your tickets route (e.g., `routes/ticket.js`)
router.put("/:id/assign", async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;

    try {
        const result = await query("UPDATE tickets SET assigned_to = ? WHERE id = ?", [assigned_to, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket not found." });
        }

        res.json({ message: "User assigned to ticket successfully!" });
    } catch (err) {
        console.error("Error assigning user to ticket:", err);
        res.status(500).json({ error: "Database error. Could not assign user to ticket." });
    }
});


// ♻️ PUT: Reassign a ticket (only if unresolved and already assigned)
router.put("/:id/reassign", async (req, res) => {
    const { id } = req.params;
    const { new_assigned_to } = req.body;

    try {
        // First, check if ticket exists and is unresolved and assigned
        const [ticket] = await query(
            "SELECT * FROM tickets WHERE id = ? AND status = 'Unresolved' AND assigned_to IS NOT NULL",
            [id]
        );

        if (!ticket) {
            return res.status(400).json({ error: "Ticket cannot be reassigned. It must be unresolved and already assigned." });
        }

        // Reassign the ticket
        const result = await query(
            "UPDATE tickets SET assigned_to = ? WHERE id = ?",
            [new_assigned_to, id]
        );

        res.json({ message: "Ticket reassigned successfully!" });
    } catch (err) {
        console.error("Error reassigning ticket:", err);
        res.status(500).json({ error: "Database error. Could not reassign ticket." });
    }
});




module.exports = router;

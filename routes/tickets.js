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


// ✅ Mark a Ticket as Resolved
router.put("/:id/resolve", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query("UPDATE tickets SET status = 'Resolved' WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket not found." });
        }

        res.json({ message: "Ticket marked as Resolved successfully!" });
    } catch (err) {
        console.error("Error marking ticket as resolved:", err);
        res.status(500).json({ error: "Database error. Could not mark ticket as resolved." });
    }
});

// ✅ Mark a Ticket as Pending
router.put("/:id/pending", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await query("UPDATE tickets SET status = 'Pending' WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket not found." });
        }

        res.json({ message: "Ticket marked as Pending successfully!" });
    } catch (err) {
        console.error("Error marking ticket as pending:", err);
        res.status(500).json({ error: "Database error. Could not mark ticket as pending." });
    }
});


// GET total tickets and resolved tickets count
router.get("/metrics/counts", async (req, res) => {
    try {
        const [totalTicketsResult] = await query("SELECT COUNT(*) AS total FROM tickets");
        const [resolvedTicketsResult] = await query("SELECT COUNT(*) AS resolved FROM tickets WHERE status = 'Resolved'");

        res.json({
            totalTickets: totalTicketsResult.total,
            resolvedTickets: resolvedTicketsResult.resolved
        });
    } catch (err) {
        console.error("Error fetching ticket counts:", err);
        res.status(500).json({ error: "Database error. Could not retrieve ticket counts." });
    }
});

// 📅 GET resolved tickets count grouped by month
router.get("/metrics/monthly-resolved", async (req, res) => {
    try {
        const results = await query(`
            SELECT 
                MONTH(created_at) AS month,
                COUNT(*) AS resolvedCount
            FROM tickets
            WHERE status = 'Resolved'
            GROUP BY MONTH(created_at)
        `);

        // Build an array with 12 months, even if some months have 0
        const monthlyCounts = Array(12).fill(0);
        results.forEach(result => {
            monthlyCounts[result.month - 1] = result.resolvedCount;
        });

        res.json(monthlyCounts);
    } catch (err) {
        console.error("Error fetching monthly resolved tickets:", err);
        res.status(500).json({ error: "Database error. Could not retrieve monthly resolved tickets." });
    }
});


// 📈 GET agent performance overview
router.get("/metrics/agent-performance", async (req, res) => {
  try {
    const results = await query(`
      SELECT 
        assigned_to AS agent,
        COUNT(*) AS ticketsHandled,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) AS avgResponseTimeMinutes,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS resolutionRate
      FROM tickets
      WHERE assigned_to IS NOT NULL
      GROUP BY assigned_to
    `);

    const formattedResults = results.map(agent => ({
      name: agent.agent,
      ticketsHandled: agent.ticketsHandled,
      avgResponseTime: `${Math.floor(agent.avgResponseTimeMinutes / 60)}h ${agent.avgResponseTimeMinutes % 60}m`,
      resolutionRate: `${agent.resolutionRate.toFixed(2)}%`,
      csat: "4.5/5" // Placeholder until you have CSAT (customer satisfaction) data
    }));

    res.json(formattedResults);
  } catch (err) {
    console.error("Error fetching agent performance:", err);
    res.status(500).json({ error: "Database error. Could not retrieve agent performance." });
  }
});
// 📊 GET agent performance overview
router.get("/metrics/agent-performance", async (req, res) => {
    try {
        const results = await query(`
            SELECT 
                assigned_to,
                COUNT(*) AS ticketsHandled,
                AVG(TIMESTAMPDIFF(MINUTE, created_at, NOW())) AS avgResponseMinutes,
                SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS resolutionRate
            FROM tickets
            WHERE assigned_to IS NOT NULL
            GROUP BY assigned_to
        `);

        // Map assigned_to (user id) to user name
        // const detailedResults = await Promise.all(results.map(async agent => {
        //     const [user] = await query("SELECT name FROM users WHERE id = ?", [agent.assigned_to]);
        //     return {
        //         name: user ? user.name : "Unknown",
        //         ticketsHandled: agent.ticketsHandled,
        //         avgResponseTime: agent.avgResponseMinutes !== null
        //             ? `${Math.floor(agent.avgResponseMinutes / 60)}h ${Math.floor(agent.avgResponseMinutes % 60)}m`
        //             : "N/A",
        //         resolutionRate: `${parseFloat(agent.resolutionRate).toFixed(1)}%`,
        //         csat: "4.5/5" // Placeholder
        //     };
        // }));



        const detailedResults = await Promise.all(results.map(async agent => {
            const [user] = await query("SELECT name FROM users WHERE id = ?", [agent.assigned_to]);
            return {
                name: user ? user.name : "Unknown",
                ticketsHandled: agent.ticketsHandled,
                avgResponseTime: agent.avgResponseMinutes !== null
                    ? `${Math.floor(agent.avgResponseMinutes / 60)}h ${Math.floor(agent.avgResponseMinutes % 60)}m`
                    : "N/A",
                resolutionRate: agent.resolutionRate !== null
                    ? `${parseFloat(agent.resolutionRate).toFixed(1)}%`
                    : "N/A",
                csat: "4.5/5" // Placeholder
            };
        }));
        

        res.json(detailedResults);
    } catch (err) {
        console.error("Error fetching agent performance:", err);
        res.status(500).json({ error: "Database error. Could not retrieve agent performance." });
    }
});



module.exports = router;

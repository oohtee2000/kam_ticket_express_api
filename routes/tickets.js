const express = require("express");
const { db, query } = require("../config/db");
const upload = require("../middleware/upload");
const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
const uploadsPath = process.env.UPLOADS_PATH || 'uploads';



const router = express.Router();

router.post("/", upload.single("image"), async (req, res) => {
    const {
        name = null,
        email = null,
        phone = null,
        location = null,
        department = null,
        category = null,
        subCategory = null,
        otherSubCategory = null,
        title = null,
        details = null,
    } = req.body;

    // 🚨 Required field check
    if (!name || !email || !title || !details) {
        return res.status(400).json({ error: "Name, email, title, and details are required." });
    }

    const image = req.file ? req.file.filename : null;

    try {
        const result = await query(
            `INSERT INTO tickets 
            (name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, location, department, category, subCategory, otherSubCategory, title, details, image]
        );

        res.json({ message: "Ticket submitted successfully!", ticketId: result.insertId });
    } catch (err) {
        console.error("Error inserting ticket:", err);
        res.status(500).json({ error: "Database error. Ticket not saved." });
    }
});




router.get("/", async (req, res) => {
    try {
        const results = await query("SELECT * FROM tickets");

        // Map the results and include the image path (base URL + image filename)
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `${baseUrl}/${uploadsPath}/${ticket.image}` : null // Image URL
        }));
        res.json(formattedResults);
    } catch (err) {
        console.error("Error fetching tickets:", err);
        res.status(500).json({ error: "Database error. Could not retrieve tickets." });
    }
});


router.get("/unassigned", async (req, res) => {
    try {
        const results = await query("SELECT * FROM tickets WHERE assigned_to IS NULL");

        // Map the results and include the image path (base URL + image filename)
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `${baseUrl}/${uploadsPath}/${ticket.image}` : null // Image URL
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


// router.put("/:id/status", async (req, res) => {
//     const { id } = req.params;
//     const { status } = req.body;

//     try {
//         const result = await query("UPDATE tickets SET status = ? WHERE id = ?", [status, id]);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: "Ticket not found" });
//         }

//         res.json({ message: "Ticket status updated successfully!" });
//     } catch (err) {
//         console.error("Error updating ticket status:", err);
//         res.status(500).json({ error: "Database error. Could not update ticket status." });
//     }
// });


router.put("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
    try {
      // Update status
      await query("UPDATE tickets SET status = ? WHERE id = ?", [status, id]);
  
      // Fetch ticket details for email
      const [ticket] = await query("SELECT * FROM tickets WHERE id = ?", [id]);

  
      res.json({ message: "Ticket status updated." });
    } catch (err) {
      console.error("Error updating ticket status:", err);
      res.status(500).json({ error: "Failed to update ticket status." });
    }
  });
  


// GET the 5 Most Recent Tickets
router.get("/recent/latest", async (req, res) => {
    try {
        const results = await query("SELECT * FROM tickets ORDER BY id DESC LIMIT 5");

        // Format results with image URLs
        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `${baseUrl}/${uploadsPath}/${ticket.image}` : null
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
            image: ticket.image ? `${baseUrl}/${uploadsPath}/${ticket.image}` : null
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


router.get("/metrics/monthly-resolved", async (req, res) => {
    try {
      const results = await query(`
        SELECT 
          YEAR(created_at) AS year,
          MONTH(created_at) AS month,
          MONTHNAME(created_at) AS monthName,
          COUNT(*) AS resolvedCount
        FROM tickets
        WHERE status = 'Resolved'
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY YEAR(created_at), MONTH(created_at)
      `);
  
      res.json(results); // e.g., [{ year: 2025, month: 6, monthName: "June", resolvedCount: 12 }, ...]
    } catch (err) {
      console.error("Error fetching monthly resolved tickets:", err);
      res.status(500).json({ error: "Database error. Could not retrieve monthly resolved tickets." });
    }
  });
  


router.get("/metrics/department-breakdown", async (req, res) => {
    try {
      const results = await query(`
        SELECT department, COUNT(*) AS ticketCount 
        FROM tickets 
        GROUP BY department
      `);
  
      res.json(results); // [{ department: 'IT Support', ticketCount: 10 }, ...]
    } catch (err) {
      console.error("Error fetching department breakdown:", err);
      res.status(500).json({ error: "Database error. Could not retrieve department breakdown." });
    }
  });

//   // 📊 GET Tickets Over Time (monthly, quarterly, yearly)
// router.get("/metrics/time-distribution", async (req, res) => {
//     const { type } = req.query; // 'monthly', 'quarterly', 'yearly'

//     let queryStr = "";
//     if (type === "monthly") {
//         queryStr = `
//             SELECT 
//                 YEAR(created_at) AS year,
//                 MONTH(created_at) AS month,
//                 COUNT(*) AS ticketCount
//             FROM tickets
//             GROUP BY YEAR(created_at), MONTH(created_at)
//             ORDER BY YEAR(created_at), MONTH(created_at)
//         `;
//     } else if (type === "quarterly") {
//         queryStr = `
//             SELECT 
//                 YEAR(created_at) AS year,
//                 QUARTER(created_at) AS quarter,
//                 COUNT(*) AS ticketCount
//             FROM tickets
//             GROUP BY YEAR(created_at), QUARTER(created_at)
//             ORDER BY YEAR(created_at), QUARTER(created_at)
//         `;
//     } else if (type === "yearly") {
//         queryStr = `
//             SELECT 
//                 YEAR(created_at) AS year,
//                 COUNT(*) AS ticketCount
//             FROM tickets
//             GROUP BY YEAR(created_at)
//             ORDER BY YEAR(created_at)
//         `;
//     } else {
//         return res.status(400).json({ error: "Invalid type. Use 'monthly', 'quarterly', or 'yearly'." });
//     }

//     try {
//         const results = await query(queryStr);
//         res.json(results);
//     } catch (err) {
//         console.error("Error fetching time-distribution stats:", err);
//         res.status(500).json({ error: "Database error. Could not retrieve time-distribution stats." });
//     }
// });


router.get("/metrics/time-distribution", async (req, res) => {
    const { type, status } = req.query; // e.g. type=monthly&status=resolved
    let queryStr = "";
    let whereClause = "";
  
    if (status === "resolved") {
      whereClause = `WHERE status = 'Resolved'`;
    } else if (status === "opened") {
      whereClause = `WHERE status != 'Resolved'`;
    }
  
    if (type === "monthly") {
      queryStr = `
        SELECT 
          YEAR(created_at) AS year,
          MONTH(created_at) AS month,
          COUNT(*) AS ticketCount
        FROM tickets
        ${whereClause}
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY YEAR(created_at), MONTH(created_at)
      `;
    } else if (type === "quarterly") {
      queryStr = `
        SELECT 
          YEAR(created_at) AS year,
          QUARTER(created_at) AS quarter,
          COUNT(*) AS ticketCount
        FROM tickets
        ${whereClause}
        GROUP BY YEAR(created_at), QUARTER(created_at)
        ORDER BY YEAR(created_at), QUARTER(created_at)
      `;
    } else if (type === "yearly") {
      queryStr = `
        SELECT 
          YEAR(created_at) AS year,
          COUNT(*) AS ticketCount
        FROM tickets
        ${whereClause}
        GROUP BY YEAR(created_at)
        ORDER BY YEAR(created_at)
      `;
    } else {
      return res.status(400).json({ error: "Invalid type. Use 'monthly', 'quarterly', or 'yearly'." });
    }
  
    try {
      const results = await query(queryStr);
      res.json(results);
    } catch (err) {
      console.error("Error fetching time-distribution stats:", err);
      res.status(500).json({ error: "Database error. Could not retrieve stats." });
    }
  });

  // 📧 GET tickets by email
router.get("/by-email/:email", async (req, res) => {
    const { email } = req.params;

    try {
        const results = await query("SELECT * FROM tickets WHERE email = ?", [email]);

        const formattedResults = results.map(ticket => ({
            ...ticket,
            image: ticket.image ? `${baseUrl}/${uploadsPath}/${ticket.image}` : null
        }));

        res.json(formattedResults);
    } catch (err) {
        console.error("Error fetching tickets by email:", err);
        res.status(500).json({ error: "Database error. Could not retrieve tickets for the email." });
    }
});

  


module.exports = router;

const express = require("express");
const { db, query } = require("../config/db");

const router = express.Router();

// POST /api/comments - Add a new comment
router.post("/", async (req, res) => {
  const { ticket_id, content, isAdmin } = req.body; // 👈 include isAdmin

  if (!ticket_id || !content) {
    return res
      .status(400)
      .json({ message: "ticket_id and content are required." });
  }

  try {
    const sql =
      "INSERT INTO comments (ticket_id, content, isAdmin) VALUES (?, ?, ?)";
    const result = await query(sql, [ticket_id, content, isAdmin || 0]); // default = 0 (user)

    res.status(201).json({
      message: "Comment added successfully.",
      commentId: result.insertId,
      isAdmin: isAdmin || 0,
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Failed to add comment." });
  }
});


// GET /api/comments/:ticket_id - Get all comments for a ticket
router.get("/:ticket_id", async (req, res) => {
  const { ticket_id } = req.params;

  try {
    const sql = "SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at DESC";
    const comments = await query(sql, [ticket_id]);

    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "Failed to fetch comments." });
  }
});

module.exports = router;

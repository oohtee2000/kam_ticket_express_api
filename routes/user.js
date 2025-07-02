    const express = require("express");
    const bcrypt = require("bcryptjs");
    const { check, validationResult } = require("express-validator");
    const { db, query } = require("../config/db");
    const upload = require("../middleware/upload");
    const fs = require('fs');

    const router = express.Router();



    /**
     * @route   GET /api/users
     * @desc    Get all users
     * @access  Private (Requires authentication)
     */
    router.get("/", async (req, res) => {
        try {
            const users = await query("SELECT * FROM users");
            res.json(users); // Send the users as JSON response
        } catch (err) {
            console.error(err.message);
            res.status(500).send("Server error");
        }
    });


    router.get("/:id", async (req, res) => {
        const userId = req.params.id;
        try {
            const user = await query("SELECT * FROM users WHERE id = ?", [userId]);
            if (user.length === 0) {
                return res.status(404).json({ msg: "User not found" });
            }
            res.json(user[0]);
        } catch (err) {
            console.error(err.message);
            res.status(500).send("Server error");
        }
    });
    

    /**
     * @route   POST /api/users
     * @desc    Add a new user
     * @access  Private (Requires authentication & admin role)
     */

    router.post(
        "/",
        upload.single("profile_picture"),
        [
        check("name", "Name is required").not().isEmpty(),
        check("email", "Please include a valid email").isEmail(),
        check("role", "Role is required").not().isEmpty(),
        check("department", "Department is required").not().isEmpty(),
        check("phone_number", "Phone number is required").not().isEmpty(),
        ],
        async (req, res) => {
        console.log("Received Request Body:", req.body);
        console.log("Received File:", req.file);
    
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log("Validation Errors:", errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
    
        const { name, email, role, department, phone_number } = req.body;
        const password = email; // Default password as email
    
        try {
            const existingUser = await query("SELECT * FROM users WHERE email = ?", [email]);
    
            if (existingUser.length > 0) {
            console.log("User already exists:", email);
            return res.status(400).json({ msg: "User already exists" });
            }
    
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            let profile_picture = null;
            if (req.file) {
            profile_picture =  req.file.filename;
            }
    
            const result = await query(
            "INSERT INTO users (name, email, password, role, department, phone_number, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, email, hashedPassword, role, department, phone_number, profile_picture]
            );
    
            console.log("User added successfully:", result);
            res.status(201).json({ msg: "User added successfully", userId: result.insertId, profile_picture });
        } catch (err) {
            console.error("Server Error:", err.message);
            res.status(500).send("Server error");
        }
        }
    );
    
    

    /**
     * @route   PUT /api/users/:id
     * @desc    Edit an existing user
     * @access  Private (Requires authentication)
     */
    // router.put("/:id", upload.single("profile_picture"), [
    //     check("name", "Name is required").optional().not().isEmpty(),
    //     check("email", "Please include a valid email").optional().isEmail(),
    //     check("role", "Role is required").optional().not().isEmpty(),
    //     check("department", "Department is required").optional().not().isEmpty(),
    //     check("phone_number", "Phone number is required").optional().not().isEmpty(),
    // ], async (req, res) => {
    //     const errors = validationResult(req);
    //     if (!errors.isEmpty()) {
    //     return res.status(400).json({ errors: errors.array() });
    //     }
    
    //     const { name, email, role, department, phone_number } = req.body;
    //     const userId = req.params.id;
    
    //     try {
    //     // Fetch the existing user before updating
    //     const existingUser = await query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
        
    //     if (existingUser.length === 0) {
    //         return res.status(404).json({ msg: "User not found" });
    //     }
    
    //     let updateFields = {};
    //     if (name) updateFields.name = name;
    //     if (email) updateFields.email = email;
    //     if (role) updateFields.role = role;
    //     if (department) updateFields.department = department;
    //     if (phone_number) updateFields.phone_number = phone_number;
    
    //     if (req.file) {
    //         const newProfilePath =  req.file.filename;
    //         ;
    
    //         // Delete old profile picture safely
    //         if (existingUser[0].profile_picture) {
    //         const oldImagePath = path.join(__dirname, "..", "uploads", path.basename(existingUser[0].profile_picture));
    //         try {
    //             if (fs.existsSync(oldImagePath)) {
    //             fs.unlinkSync(oldImagePath);
    //             }
    //         } catch (error) {
    //             console.error("Error deleting old profile picture:", error);
    //         }
    //         }
    
    //         updateFields.profile_picture = newProfilePath;
    //     }
    
    //     const keys = Object.keys(updateFields);
    //     const values = Object.values(updateFields);
    
    //     if (keys.length === 0) {
    //         return res.status(400).json({ msg: "No fields provided for update" });
    //     }
    
    //     const setString = keys.map((key) => `${key} = ?`).join(", ");
    //     values.push(userId);
    
    //     await query(`UPDATE users SET ${setString} WHERE id = ?`, values);
    
    //     res.json({ msg: "User updated successfully", profile_picture: updateFields.profile_picture || existingUser[0].profile_picture });
    //     } catch (err) {
    //     console.error(err.message);
    //     res.status(500).send("Server error");
    //     }
    // });
    

    router.put(
  "/:id",
  upload.single("profile_picture"),
  [
    check("name", "Name is required").optional().not().isEmpty(),
    check("email", "Please include a valid email").optional().isEmail(),
    check("role", "Role is required").optional().not().isEmpty(),
    check("department", "Department is required").optional().not().isEmpty(),
    check("phone_number", "Phone number is required").optional().not().isEmpty(),
  ],
  async (req, res) => {
    const userId = req.params.id;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, department, phone_number } = req.body;

    try {
      // Check if user exists
      const userRows = await query("SELECT * FROM users WHERE id = ?", [userId]);
      if (userRows.length === 0) {
        return res.status(404).json({ msg: "User not found" });
      }

      const currentUser = userRows[0];

      // Update image if new one is uploaded
      let profile_picture = currentUser.profile_picture;
      if (req.file) {
        // Delete old image if exists
        if (profile_picture) {
          const oldImagePath = `uploads/${profile_picture}`;
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        profile_picture = req.file.filename;
      }

      // Update user in DB
      await query(
        `UPDATE users SET name = ?, email = ?, role = ?, department = ?, phone_number = ?, profile_picture = ? WHERE id = ?`,
        [name, email, role, department, phone_number, profile_picture, userId]
      );

      res.json({ msg: "User updated successfully" });
    } catch (err) {
      console.error("Update error:", err.message);
      res.status(500).send("Server error");
    }
  }
);

    

    /**
     * @route   DELETE /api/users/:id
     * @desc    Delete a user
     * @access  Private (Requires authentication & admin role)
     */
    router.delete("/:id", async (req, res) => {
        const userId = req.params.id;
    
        try {
        const existingUser = await query("SELECT profile_picture FROM users WHERE id = ?", [userId]);
    
        if (existingUser.length === 0) {
            return res.status(404).json({ msg: "User not found" });
        }
    
        // Delete profile picture safely
        if (existingUser[0].profile_picture) {
            const imagePath = `.${existingUser[0].profile_picture}`;
            try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            } catch (error) {
            console.error("Error deleting profile picture:", error);
            }
        }
    
        const result = await query("DELETE FROM users WHERE id = ?", [userId]);
    
        if (result.affectedRows === 0) {
            return res.status(404).json({ msg: "User not found" });
        }
    
        res.json({ msg: "User deleted successfully" });
        } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
        }
    });

// PUT /api/users/:id/password
router.put("/:id/password", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ msg: "Password is required" });
  }

  try {
    // Check if user exists
    const user = await query("SELECT * FROM users WHERE id = ?", [id]);
    if (user.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the password
    await query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);

    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err.message);
    res.status(500).send("Server error");
  }
});

router.get("/email/:email", async (req, res) => {
  const email = req.params.email;

  try {
    const user = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user[0]);
  } catch (err) {
    console.error("Get user by email error:", err.message);
    res.status(500).send("Server error");
  }
});
 

    module.exports = router;

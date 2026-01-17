// ================= IMPORTS =================
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const ExcelJS = require("exceljs");
const path = require("path");

// ================= APP SETUP =================
const app = express();

// CORS (important for Save DPR)
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Serve frontend files
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));

// ================= DATABASE CONNECTION =================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Roktim@01",
    database: "scada_dpr"
});


db.connect(err => {
    if (err) {
        console.error("❌ MySQL connection failed:", err);
        return;
    }
    console.log("✅ MySQL connected successfully");
});

// ================= TEST ROUTE =================
app.get("/", (req, res) => {
    res.send("Backend is running successfully");
});

// ================= SAVE DPR (TABLE BASED) =================
app.post("/save-dpr-table", (req, res) => {
    const { date, drilling, production, activities } = req.body;

    if (!date) {
        return res.status(400).json({ message: "DPR date missing" });
    }

    // 1️⃣ Insert DPR date if not exists
    db.query(
        "INSERT IGNORE INTO dpr_master (dpr_date) VALUES (?)",
        [date],
        (err) => {
            if (err) return res.status(500).json(err);

            // 2️⃣ Fetch DPR ID
            db.query(
                "SELECT id FROM dpr_master WHERE dpr_date = ?",
                [date],
                (err, result) => {
                    if (err || result.length === 0)
                        return res.status(500).json(err);

                    const dprId = result[0].id;

                    // 3️⃣ Clear previous data for that date
                    db.query("DELETE FROM drilling_rtdmm WHERE dpr_id = ?", [dprId]);
                    db.query("DELETE FROM production_scada WHERE dpr_id = ?", [dprId]);
                    db.query("DELETE FROM major_activities WHERE dpr_id = ?", [dprId]);

                    // 4️⃣ Insert Drilling RTDMM rows
                    drilling.forEach(row => {
                        db.query(
                            `INSERT INTO drilling_rtdmm
                            (dpr_id, rig_name, location, availability, remark, install_date, deinstall_date)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                dprId,
                                row.rig,
                                row.location,
                                row.availability,
                                row.remark,
                                row.installDate || null,
                                row.deinstallDate || null
                            ]
                        );
                    });

                    // 5️⃣ Insert Production SCADA rows
                    production.forEach(row => {
                        db.query(
                            `INSERT INTO production_scada
                            (dpr_id, installation, location, availability, remark)
                            VALUES (?, ?, ?, ?, ?)`,
                            [
                                dprId,
                                row.installation,
                                row.location,
                                row.availability,
                                row.remark
                            ]
                        );
                    });

                    // 6️⃣ Insert Major Activities
                    activities.forEach(act => {
                        db.query(
                            `INSERT INTO major_activities
                            (dpr_id, section, references_name, field_changed, new_value, activity_date)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                dprId,
                                act.section,
                                act.name,
                                act.field,
                                act.value,
                                date
                            ]
                        );
                    });

                    res.json({ message: "✅ DPR saved successfully" });
                }
            );
        }
    );
});

// ================= EXCEL EXPORT =================
app.get("/api/export-excel", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).send("DPR date is required");

        const [[{ id: dprId } = {}]] = await db.promise()
            .query("SELECT id FROM dpr_master WHERE dpr_date = ?", [date]);
        if (!dprId) return res.status(404).send("No DPR found");

        const [drilling]   = await db.promise().query("SELECT * FROM drilling_rtdmm WHERE dpr_id = ?", [dprId]);
        const [production] = await db.promise().query("SELECT * FROM production_scada WHERE dpr_id = ?", [dprId]);
        const [activities] = await db.promise().query("SELECT * FROM major_activities WHERE dpr_id = ?", [dprId]);

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("SCADA DPR");

        // ================= PAGE SETUP =================
        ws.pageSetup = {
            paperSize: 9,
            orientation: "portrait",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1
        };

        // ================= YELLOW STRIP =================
        ws.mergeCells("A1:G1");
        ws.getRow(1).height = 10;
        ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };

        // ================= MAIN TITLE =================
        ws.mergeCells("A2:G2");
        ws.getRow(2).height = 32; // 🔥 THIS IS CRITICAL
        ws.getCell("A2").value = "Drilling RTDMM & Production SCADA DPR Assam Asset";
        ws.getCell("A2").font = { bold: true, size: 18, color: { argb: "FFFFFF" } };
        ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };

        // ================= DATE =================
        ws.mergeCells("A3:G3");
        ws.getRow(3).height = 22;
        ws.getCell("A3").value = new Date(date).toLocaleDateString("en-GB", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        });
        ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell("A3").font = { bold: true };

        ws.addRow([]);

        // ================= DRILLING HEADER =================
        ws.mergeCells("A5:G5");
        ws.getRow(5).height = 26; // 🔥 FIXES CENTERING
        ws.getCell("A5").value = "Drilling RTDMM";
        ws.getCell("A5").font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
        ws.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };

        const drillHeader = ws.addRow([
            "Sl No", "RIG Name", "Location", "RTDMM Data Availability",
            "Remedial Action / Remarks", "RTDMM Installation Date", "RTDMM De-installation Date"
        ]);
        drillHeader.font = { bold: true };

        drilling.forEach((r, i) => {
            const row = ws.addRow([
                i + 1, r.rig_name, r.location, r.availability, r.remark || "",
                r.install_date?.toISOString().slice(0,10) || "",
                r.deinstall_date?.toISOString().slice(0,10) || ""
            ]);
            row.getCell(4).fill = {
                type: "pattern", pattern: "solid",
                fgColor: r.availability === "Data Available" ? { argb: "92D050" }
                       : r.availability === "Rig Building" ? { argb: "FFC000" }
                       : { argb: "FF0000" }
            };
        });

        ws.addRow([]);
        ws.addRow([]);

        
        // ================= PRODUCTION HEADER =================
        // ================= PRODUCTION HEADER =================
        const productionHeaderRow = ws.rowCount + 1;

        ws.mergeCells(`A${productionHeaderRow}:G${productionHeaderRow}`);
        ws.getRow(productionHeaderRow).height = 26;

        const productionHeaderCell = ws.getCell(`A${productionHeaderRow}`);
        productionHeaderCell.value = "Production SCADA";
        productionHeaderCell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
        productionHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
        productionHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };


        const prodHeader = ws.addRow([
            "Sl No", "Production Installation", "Location",
            "SCADA Data Availability", "Remedial Action / Remarks"
        ]);
        prodHeader.font = { bold: true };

        production.forEach((r, i) => {
            let location = (i === 5 && r.location === "Safrai GGS") ? "Safrai QPS" : r.location;
            const row = ws.addRow([i+1, r.installation, location, r.availability, r.remark || ""]);

            if (location.includes("\n")) {
                row.height = location.split("\n").length * 18; // 🔥 MULTILINE FIX
            }

            row.getCell(4).fill = {
                type: "pattern", pattern: "solid",
                fgColor: r.availability === "Data Available"
                    ? { argb: "92D050" } : { argb: "FF0000" }
            };
        });

        ws.addRow([]);
        ws.addRow([]);

        // ================= MAJOR ACTIVITIES HEADER =================
        const activityHeaderRow = ws.rowCount + 1;

        ws.mergeCells(`A${activityHeaderRow}:G${activityHeaderRow}`);
        const activityHeaderCell = ws.getCell(`A${activityHeaderRow}`);

        activityHeaderCell.value =
            "Major Activities – " +
            new Date(date).toLocaleString("default", { month: "long", year: "numeric" });

        activityHeaderCell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
        activityHeaderCell.alignment = { horizontal: "center", vertical: "middle" };
        activityHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "000000" } };

        ws.getRow(activityHeaderRow).height = 26;


        const actHeader = ws.addRow(["Date","Section","Rig / Installation","Field Updated","New Value"]);
        actHeader.font = { bold: true };

        activities.forEach(a => {
            ws.addRow([
                a.activity_date?.toISOString().slice(0,10) || "",
                a.section, a.references_name, a.field_changed, a.new_value
            ]);
        });

        // ================= COLUMN WIDTHS =================
        ws.columns = [
            { width: 8 }, { width: 22 }, { width: 38 },
            { width: 26 }, { width: 48 }, { width: 18 }, { width: 22 }
        ];

        // ================= COMPACTION (SAFE) =================
        ws.eachRow((row, num) => {
            if (![1,2,3,5].includes(num) && !row.height) {
                row.height = 18;
            }
            row.alignment = { vertical: "middle", wrapText: true };
        });

        // ================= FINAL VISUAL CORRECTION PASS =================

        // 1️⃣ HARD LOCK HEADER ROWS (prevent compaction override)
        const headerRows = [1, 2, 3, 5];

        ws.eachRow((row, rowNumber) => {
            if (headerRows.includes(rowNumber)) {
                row.height = row.height || 28;
                row.alignment = { horizontal: "center", vertical: "middle" };
                return; // 🔥 do not touch further
            }
        });

        // 2️⃣ RECALCULATE MULTILINE ROW HEIGHTS (AFTER WIDTHS)
        ws.eachRow((row) => {
            const cell = row.getCell(3); // Location column
            if (cell && typeof cell.value === "string" && cell.value.includes("\n")) {
                const lines = cell.value.split("\n").length;
                row.height = Math.max(row.height || 18, lines * 18);
            }
        });

        // 3️⃣ FORCE TABLE TO VISUALLY REACH HEADER WIDTH
        ws.columns = [
            { width: 8 },   // Sl No
            { width: 24 },  // Rig / Installation
            { width: 42 },  // Location
            { width: 28 },  // Availability
            { width: 52 },  // 🔥 Remedial Action / New Value
            { width: 18 },
            { width: 22 }
        ];

        // ================= FINAL HEADER ALIGNMENT FORCE =================
        const forceCenterMergedRow = (rowNumber) => {
            ["A","B","C","D","E","F","G"].forEach(col => {
                ws.getCell(`${col}${rowNumber}`).alignment = {
                    horizontal: "center",
                    vertical: "middle",
                    wrapText: true
                };
            });
        };

        // Force center all section headers
        forceCenterMergedRow(2);                 // Main title
        forceCenterMergedRow(5);                 // Drilling RTDMM
        forceCenterMergedRow(productionHeaderRow);
        forceCenterMergedRow(activityHeaderRow);


        res.setHeader("Content-Disposition", `attachment; filename="SCADA_DPR_${date}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        await wb.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        res.status(500).send("Excel generation failed");
    }
});



app.get("/api/load-dpr", (req, res) => {
    const { date } = req.query;

    db.query(
        "SELECT id FROM dpr_master WHERE dpr_date = ?",
        [date],
        (err, result) => {
            if (err || result.length === 0)
                return res.json({ drilling: [], production: [], activities: [] });

            const dprId = result[0].id;

            Promise.all([
                db.promise().query("SELECT * FROM drilling_rtdmm WHERE dpr_id = ?", [dprId]),
                db.promise().query("SELECT * FROM production_scada WHERE dpr_id = ?", [dprId]),
                db.promise().query("SELECT * FROM major_activities WHERE dpr_id = ?", [dprId])
            ]).then(([d, p, a]) => {
                res.json({
                    drilling: d[0],
                    production: p[0],
                    activities: a[0]
                });
            });
        }
    );
});

// ================= LOAD DPR BY DATE =================
app.get("/api/dpr", (req, res) => {
    const { date } = req.query;

    db.query(
        "SELECT id FROM dpr_master WHERE dpr_date = ?",
        [date],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0) {
                return res.json({ exists: false });
            }

            const dprId = result[0].id;

            Promise.all([
                db.promise().query("SELECT * FROM drilling_rtdmm WHERE dpr_id = ?", [dprId]),
                db.promise().query("SELECT * FROM production_scada WHERE dpr_id = ?", [dprId]),
                db.promise().query("SELECT * FROM major_activities WHERE dpr_id = ?", [dprId])
            ])
            .then(([drilling, production, activities]) => {
                res.json({
                    exists: true,
                    drilling: drilling[0],
                    production: production[0],
                    activities: activities[0]
                });
            })
            .catch(error => res.status(500).json(error));
        }
    );
});

// ================= GET LAST SAVED DPR =================
app.get("/api/last-dpr", (req, res) => {
    db.query(
        "SELECT dpr_date FROM dpr_master ORDER BY dpr_date DESC LIMIT 1",
        (err, result) => {
            if (err || result.length === 0) {
                return res.json({ exists: false });
            }
            res.json({
                exists: true,
                date: result[0].dpr_date
            });
        }
    );
});


// ================= START SERVER =================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

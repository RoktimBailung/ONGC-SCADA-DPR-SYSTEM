// ================= DATE =================
const dprDate = document.getElementById("dprDate");
dprDate.value = new Date().toISOString().split("T")[0];

// ================= STATE STORAGE =================
let initialState = [];
let activityLogs = [];

// ================= DRILLING RTDMM ROWS =================
const drillingRows = [
    ["ARMCUE-1", "KGDK (D)"],
    ["E-1400-4", "GKLE (D)"],
    ["E-1400-6", "LKHS (D)"],
    ["E-1400-13", "GKKO_S (D)"],
    ["E-3000-1", "LPEZ (D)"],
    ["EV-2000-3", "LKHX (D)"],
    ["EV-2000-4", "KGDL (D)"],
    ["EV-2000-5", "LMFH_SBS (D)"],
    ["M-6100-1", "LPEP (D)"],
    ["M-4900", "CMDY (D)"],
    ["NG-2000-4", "HPAA (E)"],
    ["NG-1500-6", "KGAS-SBS (E)"],
    ["NG-2000-6", "LKBF (E)"]
];

// ================= PRODUCTION SCADA ROWS =================
const productionRows = [
    { installation: "ASMRDSGGS01", location: "RDS GGS01" },
    { installation: "ASMRDSGGS02", location: "RDS GGS02" },
    { installation: "ASMRDSGGS03", location: "RDS GGS03" },
    { installation: "ASMRDSGGS04", location: "RDS GGS04" },
    { installation: "ASMDHLGGS01", location: "Demulgaon GGS" },
    { installation: "ASMSFREPS01", location: "Safrai QPS" },
    {
        installation: "ASMARPNZR",
        location: `ARP 09 Installations :
        1. Lakwa GGS01
        2. Lakwa GGS03
        3. Lakwa GGS08
        4. Lakhmani GGS04
        5. Lakhmani GGS05
        6. Lakwa ETP
        7. Lakhmani ETP
        8. Lakwa CCP`,
                multiline: true
    },
    {
        installation: "ASMGLK",
        location: `Geleky 05 Installations :
        1. Geleky GGS01
        2. Geleky GGS02
        3. Geleky CTF
        4. Geleky GGS03
        5. RDS Chariali GGS`,
                multiline: true
    }
];

// ================= TABLE REFERENCES =================
const drillingBody = document.querySelector("#drillingTable tbody");
const productionBody = document.querySelector("#productionTable tbody");
const activityBody = document.querySelector("#activityTable tbody");

// ================= LOAD DPR FROM BACKEND =================
async function loadDPRForDate(date) {
    const res = await fetch(`http://localhost:3000/api/dpr?date=${date}`);
    const data = await res.json();

    if (!data.exists) {
        return false;
    }

    drillingBody.innerHTML = "";
    productionBody.innerHTML = "";
    activityBody.innerHTML = "";

    // -------- DRILLING --------
    data.drilling.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${row.rig_name}</strong></td>
            <td>
                <input type="text" value="${row.location || ""}" />
            </td>

            <td>
                <select>
                    <option ${row.availability === "Data Available" ? "selected" : ""}>Data Available</option>
                    <option ${row.availability === "Rig Building" ? "selected" : ""}>Rig Building</option>
                    <option ${row.availability === "Data Unavailable" ? "selected" : ""}>Data Unavailable</option>
                </select>
            </td>
            <td><input type="text" value="${row.remark || ""}"></td>
            <td><input type="date" value="${row.install_date ? row.install_date.split("T")[0] : ""}"></td>
            <td><input type="date" value="${row.deinstall_date ? row.deinstall_date.split("T")[0] : ""}"></td>
        `;
        const select = tr.querySelector("select");
        applyStatusColor(select);
        select.addEventListener("change", () => applyStatusColor(select));
        drillingBody.appendChild(tr);
    });

    // -------- PRODUCTION --------
    data.production.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${row.installation}</strong></td>
            <td>
                ${row.location.replace(/\n/g, "<br>")}
            </td>

            <td>
                <select>
                    <option ${row.availability === "Data Available" ? "selected" : ""}>Data Available</option>
                    <option ${row.availability === "Data Unavailable" ? "selected" : ""}>Data Unavailable</option>
                </select>
            </td>
            <td><input type="text" value="${row.remark || ""}"></td>
        `;
        const select = tr.querySelector("select");
        applyStatusColor(select);
        select.addEventListener("change", () => applyStatusColor(select));
        productionBody.appendChild(tr);
    });

    // -------- MAJOR ACTIVITIES --------
    data.activities.forEach(act => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${act.activity_date}</td>
            <td>${act.section}</td>
            <td>${act.references_name}</td>
            <td>${act.field_changed}</td>
            <td>${act.new_value}</td>
        `;
        activityBody.appendChild(tr);
    });

    captureInitialState();
    return true;
}

// ================= STATUS COLOR HANDLER =================
function applyStatusColor(selectEl) {
    selectEl.classList.remove("status-available", "status-unavailable", "status-building");

    if (selectEl.value === "Data Available") {
        selectEl.classList.add("status-available");
    } else if (selectEl.value === "Rig Building") {
        selectEl.classList.add("status-building");
    } else {
        selectEl.classList.add("status-unavailable");
    }
}

// ================= RENDER DRILLING TABLE =================
drillingRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><strong>${r[0]}</strong></td>
        <td>
            <input type="text" value="${r[1]}" />
        </td>
        <td>
            <select>
                <option>Data Available</option>
                <option>Rig Building</option>
                <option>Data Unavailable</option>
            </select>
        </td>
        <td><input type="text"></td>
        <td><input type="date"></td>
        <td><input type="date"></td>
    `;
    const select = tr.querySelector("select");
    applyStatusColor(select);
    select.addEventListener("change", () => applyStatusColor(select));
    drillingBody.appendChild(tr);
});

// ================= RENDER PRODUCTION TABLE =================
productionRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><strong>${r.installation}</strong></td>
        <td class="${r.multiline ? "multiline-cell" : ""}">
            ${r.location.replace(/\n/g, "<br>")}
        </td>
        <td>
            <select>
                <option>Data Available</option>
                <option>Data Unavailable</option>
            </select>
        </td>
        <td><input type="text"></td>
    `;
    const select = tr.querySelector("select");
    applyStatusColor(select);
    select.addEventListener("change", () => applyStatusColor(select));
    productionBody.appendChild(tr);
});

// ================= CAPTURE INITIAL STATE =================
function captureInitialState() {
    initialState = [];

    document.querySelectorAll("#drillingTable tbody tr").forEach(row => {
        const c = row.querySelectorAll("td");
        initialState.push({
            section: "Drilling RTDMM",
            name: c[0].innerText,
            availability: c[2].querySelector("select").value,
            remark: c[3].querySelector("input").value
        });
    });

    document.querySelectorAll("#productionTable tbody tr").forEach(row => {
        const c = row.querySelectorAll("td");
        initialState.push({
            section: "Production SCADA",
            name: c[0].innerText,
            availability: c[2].querySelector("select").value,
            remark: c[3].querySelector("input").value
        });
    });
}

// ================= LOG ACTIVITY =================
function logActivity(date, section, name, field, value) {
    activityLogs.push({ section, name, field, value });

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${date}</td>
        <td>${section}</td>
        <td>${name}</td>
        <td>${field}</td>
        <td>${value}</td>
    `;
    activityBody.appendChild(tr);
}

// ================= SAVE DPR =================
document.querySelector(".save-btn").addEventListener("click", async () => {

    const date = dprDate.value;
    activityLogs = [];
    activityBody.innerHTML = "";

    const drilling = [];
    const production = [];
    let index = 0;

    document.querySelectorAll("#drillingTable tbody tr").forEach(row => {
        const c = row.querySelectorAll("td");
        const prev = initialState[index++];

        const availability = c[2].querySelector("select").value;
        const remark = c[3].querySelector("input").value;

        if (prev.availability !== availability) {
            logActivity(date, prev.section, prev.name, "Availability", availability);
        }

        if (prev.remark !== remark && remark !== "") {
            logActivity(date, prev.section, prev.name, "Remarks", remark);
        }

        drilling.push({
            rig: c[0].innerText,
            location: c[1].querySelector("input").value,
            availability,
            remark,
            installDate: c[4].querySelector("input").value,
            deinstallDate: c[5].querySelector("input").value
        });
    });

    document.querySelectorAll("#productionTable tbody tr").forEach(row => {
        const c = row.querySelectorAll("td");
        const prev = initialState[index++];

        const availability = c[2].querySelector("select").value;
        const remark = c[3].querySelector("input").value;

        if (prev.availability !== availability) {
            logActivity(date, prev.section, prev.name, "Availability", availability);
        }

        if (prev.remark !== remark && remark !== "") {
            logActivity(date, prev.section, prev.name, "Remarks", remark);
        }

        production.push({
            installation: c[0].innerText,
            location: c[1].innerText,
            availability,
            remark
        });
    });

    await fetch("http://localhost:3000/save-dpr-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            date,
            drilling,
            production,
            activities: activityLogs
        })
    });

    captureInitialState();
    alert("DPR saved and Major Activities updated");
});

// ================= DOWNLOAD =================
document.querySelector(".download-btn").addEventListener("click", () => {
    const date = dprDate.value;
    window.open(`http://localhost:3000/api/export-excel?date=${date}`, "_blank");
});


// ================= LOGOUT =================
function logout() {
    window.location.href = "index.html";
}

// captureInitialState();

window.addEventListener("load", async () => {
    const today = dprDate.value;

    // 1️⃣ Try loading today's DPR
    const loadedToday = await loadDPRForDate(today);

    if (loadedToday) {
        return;
    }

    // 2️⃣ If not found, load last saved DPR
    const res = await fetch("http://localhost:3000/api/last-dpr");
    const data = await res.json();

    if (data.exists) {
        dprDate.value = data.date;
        await loadDPRForDate(data.date);
    }

    captureInitialState();
});

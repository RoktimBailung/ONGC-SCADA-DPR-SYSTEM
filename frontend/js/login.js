document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const userId = document.getElementById("userid").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");

    // Dummy credentials (for Phase-1 only)
    if (userId === "engineer" && password === "ongc123") {
        // Redirect to dashboard
        window.location.href = "dashboard.html";
    } else {
        errorMsg.textContent = "Invalid User ID or Password";
    }
});

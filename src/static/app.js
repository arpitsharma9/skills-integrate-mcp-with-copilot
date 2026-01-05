// Authentication state
let authToken = null;
let currentUserEmail = null;
let currentUserRole = null;

document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("login-section");
  const mainContent = document.getElementById("main-content");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutBtn = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const userRoleSpan = document.getElementById("user-role");
  
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const emailInput = document.getElementById("email");

  // Check if user is already logged in
  const savedToken = localStorage.getItem("authToken");
  const savedEmail = localStorage.getItem("userEmail");
  const savedRole = localStorage.getItem("userRole");
  
  if (savedToken && savedEmail && savedRole) {
    authToken = savedToken;
    currentUserEmail = savedEmail;
    currentUserRole = savedRole;
    showMainContent();
  }

  // Login form handler
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        currentUserEmail = result.email;
        currentUserRole = result.role;
        
        // Save to localStorage
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("userEmail", currentUserEmail);
        localStorage.setItem("userRole", currentUserRole);

        loginMessage.textContent = "Login successful!";
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");

        setTimeout(() => {
          showMainContent();
        }, 500);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    authToken = null;
    currentUserEmail = null;
    currentUserRole = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    
    loginSection.classList.remove("hidden");
    mainContent.classList.add("hidden");
    userInfo.classList.add("hidden");
    loginForm.reset();
  });

  function showMainContent() {
    loginSection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    userInfo.classList.remove("hidden");
    userEmailSpan.textContent = currentUserEmail;
    userRoleSpan.textContent = currentUserRole;
    
    // Pre-fill email for students
    if (currentUserRole === "student") {
      emailInput.value = currentUserEmail;
      emailInput.setAttribute("readonly", "readonly");
    } else {
      emailInput.removeAttribute("readonly");
      emailInput.value = "";
    }
    
    fetchActivities();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        // Only show delete buttons for teachers/admins, or for students on their own entry
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const canDelete = currentUserRole === "teacher" || 
                                     currentUserRole === "admin" || 
                                     (currentUserRole === "student" && email === currentUserEmail);
                    return `<li>
                      <span class="participant-email">${email}</span>
                      ${canDelete ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}
                    </li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Reset email for students
        if (currentUserRole === "student") {
          emailInput.value = currentUserEmail;
        }

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app (will be called after login)
});

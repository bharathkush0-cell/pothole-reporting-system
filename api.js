/* ===========================================================
   RoadWatch Backend — REST API Gateway (vanilla JS)
   Simulates async HTTP endpoints with mock latency + logs.
   =========================================================== */

(function () {
  const logPrefix = "[HTTP API]";

  /* Simulate network latency */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* Wrap a service call in a simulated HTTP response */
  async function apiCall(method, path, handler, minMs = 200, maxMs = 600) {
    const latency = minMs + Math.floor(Math.random() * (maxMs - minMs));
    await delay(latency);
    console.log(`${logPrefix} ${method} ${path} — processing...`);
    try {
      const data = await handler();
      console.log(`${logPrefix} ${method} ${path} → 200 OK (${latency}ms)`, data);
      return { ok: true, status: 200, data };
    } catch (err) {
      console.error(`${logPrefix} ${method} ${path} → 400 Error: ${err.message}`);
      return { ok: false, status: 400, error: err.message };
    }
  }

  const RW_API = {

    /* ══════════════════════════════════════════
       AUTH ENDPOINTS
    ═══════════════════════════════════════════ */

    register(name, phone, area) {
      return apiCall("POST", "/api/auth/register", () => {
        return RW_Auth.register(name, phone, area);
      }, 300, 700);
    },

    requestOTP(phone) {
      return apiCall("POST", "/api/auth/otp/request", () => {
        const code = RW_Auth.requestOTP(phone);
        return { message: "OTP sent", demoCode: code };
      }, 400, 900);
    },

    verifyOTP(phone, code) {
      return apiCall("POST", "/api/auth/otp/verify", () => {
        return RW_Auth.verifyOTP(phone, code);
      }, 300, 600);
    },

    adminLogin(username, password) {
      return apiCall("POST", "/api/auth/admin/login", () => {
        return RW_Auth.adminLogin(username, password);
      }, 300, 700);
    },

    logout() {
      return apiCall("POST", "/api/auth/logout", () => {
        RW_Auth.logout();
        return { message: "Signed out successfully." };
      }, 100, 200);
    },

    getCurrentUser() {
      // synchronous — no latency needed for local session reads
      return RW_Auth.getCurrentUser();
    },

    /* ══════════════════════════════════════════
       REPORTS ENDPOINTS
    ═══════════════════════════════════════════ */

    createReport(road, area, desc, gps, image) {
      return apiCall("POST", "/api/reports", async () => {
        const user = RW_Auth.getCurrentUser();
        const reporter = user ? (user.phone || user.name) : "Anonymous";

        // Step 1: create report record
        const report = RW_Reports.createReport(road, area, desc, gps, image, reporter);

        // Step 2: run AI analysis
        const analysis = RW_AIEngine.analyzeImage(image);

        // Step 3: update report with AI results
        RW_Reports.update(report.id, {
          severity:   analysis.severity,
          confidence: analysis.confidence,
          sizeCm:     analysis.sizeCm,
          aiAnalysis: analysis,
          status:     "Pending"
        });

        // Step 4: trigger notification
        const phone = user ? (user.phone || user.name) : "Anonymous";
        RW_Notifications.onReportSubmitted(phone, report.id, road);

        // Return merged object
        return { ...report, ...analysis, status: "Pending" };
      }, 800, 1800);
    },

    getReports(filters = {}) {
      return apiCall("GET", "/api/reports", () => {
        return RW_Reports.search(filters.query, filters);
      }, 200, 500);
    },

    getReportById(id) {
      return apiCall("GET", `/api/reports/${id}`, () => {
        const report = RW_Reports.getById(id);
        if (!report) throw new Error(`Report ${id} not found.`);
        return report;
      }, 150, 400);
    },

    getMyReports() {
      return apiCall("GET", "/api/reports/mine", () => {
        const user = RW_Auth.getCurrentUser();
        if (!user) return RW_Database.getAll(RW_Database.KEYS.REPORTS);
        return RW_Reports.getByUser(user.phone || user.name);
      }, 200, 400);
    },

    getAllReports() {
      return apiCall("GET", "/api/reports/all", () => {
        return RW_Database.getAll(RW_Database.KEYS.REPORTS);
      }, 200, 400);
    },

    /* ══════════════════════════════════════════
       ADMIN ENDPOINTS
    ═══════════════════════════════════════════ */

    updateReportStatus(reportId, newStatus) {
      return apiCall("PATCH", `/api/admin/reports/${reportId}/status`, () => {
        const user = RW_Auth.getCurrentUser();
        RW_Admin.updateStatus(reportId, newStatus, user ? user.name : "Admin");
        return RW_Reports.getById(reportId);
      }, 300, 600);
    },

    assignCrew(reportId, crewName) {
      return apiCall("POST", `/api/admin/reports/${reportId}/assign`, () => {
        const crew = RW_Admin.assignCrew(reportId, crewName);
        return { reportId, crew };
      }, 300, 600);
    },

    deleteReport(reportId) {
      return apiCall("DELETE", `/api/admin/reports/${reportId}`, () => {
        RW_Admin.deleteReport(reportId);
        return { deleted: reportId };
      }, 200, 500);
    },

    getAdminKPIs() {
      return apiCall("GET", "/api/admin/kpis", () => {
        return RW_Admin.getKPIs();
      }, 150, 350);
    },

    getUsers() {
      return apiCall("GET", "/api/admin/users", () => {
        return RW_Admin.getAllUsers();
      }, 200, 400);
    },

    /* ══════════════════════════════════════════
       ANALYTICS ENDPOINTS
    ═══════════════════════════════════════════ */

    getAnalytics() {
      return apiCall("GET", "/api/analytics", () => {
        return RW_Analytics.getFullDashboard();
      }, 300, 700);
    },

    getMonthlyTrend() {
      return apiCall("GET", "/api/analytics/monthly", () => {
        return RW_Analytics.getMonthlyTrend();
      }, 200, 500);
    },

    getHotspots() {
      return apiCall("GET", "/api/analytics/hotspots", () => {
        return RW_Analytics.getHotspots();
      }, 200, 400);
    },

    /* ══════════════════════════════════════════
       NOTIFICATIONS ENDPOINTS
    ═══════════════════════════════════════════ */

    getNotifications() {
      return apiCall("GET", "/api/notifications", () => {
        const user = RW_Auth.getCurrentUser();
        const phone = user ? (user.phone || user.name) : null;
        return RW_Notifications.getForUser(phone);
      }, 150, 350);
    },

    markNotificationsRead() {
      return apiCall("POST", "/api/notifications/read-all", () => {
        const user = RW_Auth.getCurrentUser();
        if (user) RW_Notifications.markAllRead(user.phone || user.name);
        return { message: "Notifications marked as read." };
      }, 100, 200);
    },

    /* ══════════════════════════════════════════
       PROFILE ENDPOINT
    ═══════════════════════════════════════════ */

    saveProfile(name, phone, area) {
      return apiCall("PUT", "/api/user/profile", () => {
        const exists = RW_Database.findOne(
          RW_Database.KEYS.USERS,
          u => u.phone === phone
        );
        if (exists) {
          RW_Database.update(
            RW_Database.KEYS.USERS,
            u => u.phone === phone,
            { name, area }
          );
        } else {
          RW_Database.insert(RW_Database.KEYS.USERS, {
            name, phone, area, role: "citizen",
            joinedAt: new Date().toISOString()
          });
        }
        // Update session
        const current = RW_Auth.getCurrentUser();
        if (current) {
          RW_Auth.createSession({ ...current, name, area });
        }
        return { name, phone, area };
      }, 200, 400);
    }
  };

  window.RW_API = RW_API;
  console.log("[RoadWatch Backend] ✅ All backend modules loaded. RW_API ready.");
})();

/* ===========================================================
   RoadWatch Backend — Admin Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Admin]";

  const CREWS = ["Team A-05", "Team B-12", "Team C-08", "Team D-21", "Team E-03"];

  const RW_Admin = {

    /* ── Report Management ── */

    getAllReports(filters = {}) {
      console.log(`${logPrefix} Fetching all reports with filters:`, filters);
      const { status, severity, query } = filters;
      return RW_Database.find(RW_Database.KEYS.REPORTS, r => {
        const matchStatus   = !status   || r.status   === status;
        const matchSeverity = !severity || r.severity === severity;
        const q = (query || "").toLowerCase();
        const matchQuery    = !q
          || r.id.toLowerCase().includes(q)
          || r.road.toLowerCase().includes(q)
          || (r.reporter && r.reporter.toLowerCase().includes(q));
        return matchStatus && matchSeverity && matchQuery;
      });
    },

    updateStatus(reportId, newStatus, adminName) {
      console.log(`${logPrefix} ${adminName || "Admin"} → status change: ${reportId} → "${newStatus}"`);
      const report = RW_Database.findOne(
        RW_Database.KEYS.REPORTS,
        r => r.id === reportId
      );
      if (!report) throw new Error(`Report ${reportId} not found.`);

      RW_Database.update(
        RW_Database.KEYS.REPORTS,
        r => r.id === reportId,
        { status: newStatus, updatedAt: new Date().toISOString() }
      );

      // Trigger appropriate notification
      const phone = report.reporter;
      if (newStatus === "Verified")    RW_Notifications.onReportVerified(phone, reportId);
      if (newStatus === "Resolved")    RW_Notifications.onReportResolved(phone, reportId, report.road);
      if (newStatus === "In Progress") RW_Notifications.onReportAssigned(phone, reportId, "the assigned crew");

      return true;
    },

    assignCrew(reportId, crewName) {
      const crew = crewName || CREWS[Math.floor(Math.random() * CREWS.length)];
      console.log(`${logPrefix} Assigning ${crew} to ${reportId}`);

      const report = RW_Database.findOne(
        RW_Database.KEYS.REPORTS,
        r => r.id === reportId
      );
      if (!report) throw new Error(`Report ${reportId} not found.`);

      RW_Database.update(
        RW_Database.KEYS.REPORTS,
        r => r.id === reportId,
        { assignedCrew: crew, status: "Assigned", updatedAt: new Date().toISOString() }
      );

      RW_Notifications.onReportAssigned(report.reporter, reportId, crew);
      return crew;
    },

    deleteReport(reportId) {
      console.log(`${logPrefix} Deleting report ${reportId}`);
      return RW_Database.delete(
        RW_Database.KEYS.REPORTS,
        r => r.id === reportId
      );
    },

    /* ── User Management ── */

    getAllUsers() {
      console.log(`${logPrefix} Fetching all citizen users`);
      return RW_Database.getAll(RW_Database.KEYS.USERS);
    },

    getUserStats(phone) {
      const userReports = RW_Database.find(
        RW_Database.KEYS.REPORTS,
        r => r.reporter === phone
      );
      return {
        total:    userReports.length,
        pending:  userReports.filter(r => r.status === "Pending").length,
        resolved: userReports.filter(r => r.status === "Resolved").length,
        high:     userReports.filter(r => r.severity === "High").length
      };
    },

    /* ── KPI Summary ── */

    getKPIs() {
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);
      return {
        total:    all.length,
        pending:  all.filter(r => r.status === "Pending").length,
        verified: all.filter(r => r.status === "Verified").length,
        resolved: all.filter(r => r.status === "Resolved").length,
        high:     all.filter(r => r.severity === "High").length,
        active:   all.filter(r => r.status !== "Resolved").length
      };
    },

    /* ── Settings ── */

    getSetting(key, fallback = null) {
      const settings = RW_Database.getAll(RW_Database.KEYS.SETTINGS);
      const entry = settings.find(s => s.key === key);
      return entry ? entry.value : fallback;
    },

    setSetting(key, value) {
      const exists = RW_Database.findOne(
        RW_Database.KEYS.SETTINGS,
        s => s.key === key
      );
      if (exists) {
        RW_Database.update(
          RW_Database.KEYS.SETTINGS,
          s => s.key === key,
          { value }
        );
      } else {
        RW_Database.insert(RW_Database.KEYS.SETTINGS, { key, value });
      }
    }
  };

  window.RW_Admin = RW_Admin;
})();

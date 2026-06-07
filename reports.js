/* ===========================================================
   RoadWatch Backend — Reports Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Reports]";

  const STATUS_FLOW = ["Submitted", "Pending", "Verified", "Assigned", "In Progress", "Resolved"];

  const RW_Reports = {
    // Create new pothole report
    createReport(road, area, desc, gps, imageBase64, reporterPhone) {
      console.log(`${logPrefix} Creating report on road: "${road}"`);

      if (!road || road.trim().length === 0) {
        throw new Error("Road name is required.");
      }
      if (!gps) {
        throw new Error("GPS location coordinates are required.");
      }

      const [latStr, lngStr] = gps.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error("Invalid GPS coordinates format. Must be 'latitude, longitude'.");
      }

      // Check current list size for generating new report ID
      const allReports = RW_Database.getAll(RW_Database.KEYS.REPORTS);
      const nextIdNumber = 1000 + allReports.length;
      const reportId = `PH-${nextIdNumber}`;

      // Build initial report object (Status starts at "Submitted" or "Pending")
      const newReport = {
        id: reportId,
        road: road.trim(),
        area: (area || "Indiranagar").trim(),
        desc: (desc || "No additional description provided.").trim(),
        severity: "Low", // Default before AI evaluation runs
        status: "Submitted", // Lifecycle step 1
        lat: lat,
        lng: lng,
        reportedAt: new Date().toISOString(),
        reporter: reporterPhone || "Ananya R.",
        confidence: 0.0,
        sizeCm: 0,
        image: imageBase64 || null
      };

      RW_Database.insert(RW_Database.KEYS.REPORTS, newReport);
      console.log(`${logPrefix} Report ${reportId} created successfully.`);
      return newReport;
    },

    // Get report by ID
    getById(id) {
      console.log(`${logPrefix} Getting report: ${id}`);
      return RW_Database.findOne(RW_Database.KEYS.REPORTS, r => r.id === id);
    },

    // Get reports by User
    getByUser(phoneOrName) {
      console.log(`${logPrefix} Getting reports for user: ${phoneOrName}`);
      return RW_Database.find(RW_Database.KEYS.REPORTS, r => r.reporter === phoneOrName || r.reporter === "You");
    },

    // Update Report details
    update(id, updates) {
      console.log(`${logPrefix} Updating report ${id}:`, updates);
      
      // Enforce status flows if updating status
      if (updates.status) {
        const currentReport = this.getById(id);
        if (!currentReport) {
          throw new Error("Report not found.");
        }
        
        // Validate lifecycle transition
        if (!this.isValidTransition(currentReport.status, updates.status)) {
          console.warn(`${logPrefix} Warning: non-standard status flow transition from "${currentReport.status}" to "${updates.status}"`);
        }
      }

      return RW_Database.update(RW_Database.KEYS.REPORTS, r => r.id === id, updates);
    },

    // Delete Report
    delete(id) {
      console.log(`${logPrefix} Deleting report ${id}`);
      return RW_Database.delete(RW_Database.KEYS.REPORTS, r => r.id === id);
    },

    // Status flow validation checks
    isValidTransition(oldStatus, newStatus) {
      const oldIdx = STATUS_FLOW.indexOf(oldStatus);
      const newIdx = STATUS_FLOW.indexOf(newStatus);
      
      if (oldIdx === -1 || newIdx === -1) return false;
      // Allow moving forward, or reset (in case of reassignment/rework)
      return newIdx >= oldIdx || newStatus === "Pending";
    },

    // Search and Filters
    search(query, filters = {}) {
      console.log(`${logPrefix} Searching reports. Query: "${query}", Filters:`, filters);
      
      const q = (query || "").toLowerCase();
      const status = filters.status || "";
      const severity = filters.severity || "";

      return RW_Database.find(RW_Database.KEYS.REPORTS, r => {
        // Query check
        const matchQuery = !q || 
          r.id.toLowerCase().includes(q) || 
          r.road.toLowerCase().includes(q) || 
          (r.area && r.area.toLowerCase().includes(q)) ||
          (r.desc && r.desc.toLowerCase().includes(q));

        // Filters checks
        const matchStatus = !status || r.status === status;
        const matchSeverity = !severity || r.severity === severity;

        return matchQuery && matchStatus && matchSeverity;
      });
    }
  };

  window.RW_Reports = RW_Reports;
})();

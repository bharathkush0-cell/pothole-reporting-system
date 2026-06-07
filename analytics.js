/* ===========================================================
   RoadWatch Backend — Analytics Engine (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Analytics]";

  function seededRand(s) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  const RW_Analytics = {

    /* ── Core KPIs ── */

    getSummary() {
      console.log(`${logPrefix} Computing citywide summary KPIs`);
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);

      const total    = all.length;
      const pending  = all.filter(r => ["Submitted","Pending"].includes(r.status)).length;
      const verified = all.filter(r => r.status === "Verified").length;
      const inProg   = all.filter(r => ["Assigned","In Progress"].includes(r.status)).length;
      const resolved = all.filter(r => r.status === "Resolved").length;
      const high     = all.filter(r => r.severity === "High").length;
      const active   = total - resolved;

      const resolutionRate = total > 0
        ? Math.round((resolved / total) * 100)
        : 0;

      // Avg resolution time (days) from seeded random for demo richness
      const avgResolutionDays = parseFloat((1.8 + Math.random() * 3.0).toFixed(1));

      // Satisfaction approximated from resolution rate
      const satisfaction = Math.min(99, 78 + resolutionRate * 0.2);

      return {
        total, pending, verified, inProg, resolved, high, active,
        resolutionRate,
        avgResolutionDays,
        satisfaction: Math.round(satisfaction),
        hotspots: 5  // static for demo — would come from clustering model
      };
    },

    /* ── Severity Distribution ── */

    getSeverityDistribution() {
      console.log(`${logPrefix} Computing severity distribution`);
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);
      return {
        Low:    all.filter(r => r.severity === "Low").length,
        Medium: all.filter(r => r.severity === "Medium").length,
        High:   all.filter(r => r.severity === "High").length
      };
    },

    /* ── Status Distribution ── */

    getStatusDistribution() {
      console.log(`${logPrefix} Computing status distribution`);
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);
      const statuses = ["Submitted", "Pending", "Verified", "Assigned", "In Progress", "Resolved"];
      const result = {};
      statuses.forEach(s => {
        result[s] = all.filter(r => r.status === s).length;
      });
      return result;
    },

    /* ── Monthly Trend (last 12 months) ── */

    getMonthlyTrend() {
      console.log(`${logPrefix} Computing monthly trend data`);
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);

      const months = Array.from({ length: 12 }, (_, i) =>
        new Date(2026, i, 1).toLocaleString("en", { month: "short" })
      );

      const counts = months.map((_, i) => {
        const real = all.filter(r => new Date(r.reportedAt).getMonth() === i).length;
        // Blend real data with seeded fill so chart is always interesting
        return real || Math.floor(18 + seededRand(i + 1) * 65);
      });

      const resolved = counts.map(c =>
        Math.floor(c * (0.45 + seededRand(c) * 0.40))
      );

      return { months, counts, resolved };
    },

    /* ── Top Hotspot Roads ── */

    getHotspots(limit = 5) {
      console.log(`${logPrefix} Computing top hotspot roads`);
      const all = RW_Database.getAll(RW_Database.KEYS.REPORTS);

      // Count reports per road
      const roadCounts = {};
      all.forEach(r => {
        roadCounts[r.road] = (roadCounts[r.road] || 0) + 1;
      });

      return Object.entries(roadCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([road, count]) => ({
          road,
          count,
          riskScore: Math.min(99, 50 + count * 4)
        }));
    },

    /* ── Full analytics bundle for dashboard ── */

    getFullDashboard() {
      return {
        summary:      this.getSummary(),
        severity:     this.getSeverityDistribution(),
        statusDist:   this.getStatusDistribution(),
        monthly:      this.getMonthlyTrend(),
        hotspots:     this.getHotspots()
      };
    }
  };

  window.RW_Analytics = RW_Analytics;
})();

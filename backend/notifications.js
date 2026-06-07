/* ===========================================================
   RoadWatch Backend — Notification Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Notifications]";

  const TYPE_ICONS = {
    ok:     "fa-solid fa-check-circle",
    warn:   "fa-solid fa-clock",
    accent: "fa-solid fa-bolt",
    info:   "fa-solid fa-circle-info",
    danger: "fa-solid fa-triangle-exclamation"
  };

  const RW_Notifications = {
    /* Push a notification for a user */
    push(phone, title, text, type = "info") {
      const notif = {
        id:        `notif-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        phone:     phone,
        title:     title,
        text:      text,
        type:      type,
        read:      false,
        timestamp: new Date().toISOString()
      };
      RW_Database.insert(RW_Database.KEYS.NOTIFICATIONS, notif);
      console.log(`${logPrefix} Notification pushed → "${title}" for ${phone}`);
      return notif;
    },

    /* Predefined triggers */
    onReportSubmitted(phone, reportId, road) {
      this.push(phone,
        `${reportId} submitted`,
        `Your pothole report on ${road} has been submitted and is under review.`,
        "info"
      );
    },

    onReportVerified(phone, reportId) {
      this.push(phone,
        `${reportId} verified`,
        `Your report has passed AI verification and is scheduled for repair.`,
        "warn"
      );
    },

    onReportAssigned(phone, reportId, crew) {
      this.push(phone,
        `${reportId} assigned`,
        `${crew} has been dispatched to repair the pothole.`,
        "accent"
      );
    },

    onReportResolved(phone, reportId, road) {
      this.push(phone,
        `${reportId} resolved`,
        `Your pothole on ${road} has been repaired. Thank you for reporting!`,
        "ok"
      );
    },

    onHotspotDetected(phone, road, riskScore) {
      this.push(phone,
        "Hotspot detected near you",
        `${road} risk score rose to ${riskScore}%. Caution advised.`,
        "danger"
      );
    },

    /* Fetch notifications for a user */
    getForUser(phone) {
      console.log(`${logPrefix} Fetching notifications for ${phone}`);
      return RW_Database.find(
        RW_Database.KEYS.NOTIFICATIONS,
        n => !phone || n.phone === phone || !n.phone
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    /* Mark as read */
    markRead(id) {
      RW_Database.update(
        RW_Database.KEYS.NOTIFICATIONS,
        n => n.id === id,
        { read: true }
      );
    },

    /* Mark all as read for user */
    markAllRead(phone) {
      RW_Database.update(
        RW_Database.KEYS.NOTIFICATIONS,
        n => n.phone === phone,
        { read: true }
      );
    },

    /* Count unread */
    unreadCount(phone) {
      return RW_Database.find(
        RW_Database.KEYS.NOTIFICATIONS,
        n => n.phone === phone && !n.read
      ).length;
    },

    /* Icon lookup helper */
    getIcon(type) {
      return TYPE_ICONS[type] || TYPE_ICONS.info;
    }
  };

  window.RW_Notifications = RW_Notifications;
})();

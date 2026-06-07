/* ===========================================================
   RoadWatch Backend — Database Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Database]";

  const KEYS = {
    USERS: "roadwatch_users",
    REPORTS: "roadwatch_reports_v1", // keep original key for backward compatibility
    NOTIFICATIONS: "roadwatch_notifications",
    ADMINS: "roadwatch_admins",
    SETTINGS: "roadwatch_settings"
  };

  // Seeding constants
  const SEED_ROADS = ["MG Road","Brigade Rd","Outer Ring Rd","Hosur Hwy","Sarjapur Rd","Whitefield Main","Indiranagar 100ft","Bannerghatta Rd","Tumkur Rd","Old Madras Rd"];
  const SEED_AREAS = ["Indiranagar","Koramangala","Whitefield","HSR","Jayanagar","BTM","Marathahalli"];
  const SEED_REPORTERS = ["Ananya R.","Kiran M.","Rohit S.","Priya N.","Arjun V."];
  const STATUSES = ["Pending","Verified","In Progress","Resolved"];
  const SEVERITIES = ["Low","Medium","High"];

  function seededRand(s) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  function generateSeed(count = 24) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const s = i + 1;
      arr.push({
        id: `PH-${1000 + i}`,
        road: SEED_ROADS[Math.floor(seededRand(s) * SEED_ROADS.length)],
        area: SEED_AREAS[Math.floor(seededRand(s * 2) * SEED_AREAS.length)],
        desc: "Deep pothole near junction, water collects after rain.",
        severity: SEVERITIES[Math.floor(seededRand(s * 3) * 3)],
        status: STATUSES[Math.floor(seededRand(s * 5) * 4)],
        lat: 12.9 + seededRand(s * 7) * 0.2,
        lng: 77.5 + seededRand(s * 11) * 0.2,
        reportedAt: new Date(Date.now() - Math.floor(seededRand(s * 13) * 30) * 864e5).toISOString(),
        reporter: SEED_REPORTERS[Math.floor(seededRand(s * 17) * 5)],
        confidence: 0.7 + seededRand(s * 19) * 0.29,
        sizeCm: Math.floor(15 + seededRand(s * 23) * 80),
        image: null,
      });
    }
    return arr;
  }

  const RW_Database = {
    KEYS: KEYS,

    init() {
      console.log(`${logPrefix} Initializing database collections...`);

      // Seed Admins
      if (!RW_Storage.getLocal(KEYS.ADMINS)) {
        console.log(`${logPrefix} Seeding default administrator account.`);
        const defaultAdmins = [
          { username: "admin", password: "admin123", name: "System Admin" }
        ];
        RW_Storage.setLocal(KEYS.ADMINS, defaultAdmins);
      }

      // Seed Users
      if (!RW_Storage.getLocal(KEYS.USERS)) {
        console.log(`${logPrefix} Seeding default citizen users.`);
        const defaultUsers = [
          { phone: "+91 98xxxxxx10", name: "Ananya Rao", area: "Indiranagar" }
        ];
        RW_Storage.setLocal(KEYS.USERS, defaultUsers);
      }

      // Seed Reports
      if (!RW_Storage.getLocal(KEYS.REPORTS)) {
        console.log(`${logPrefix} Seeding pothole reporting records.`);
        const reports = generateSeed();
        RW_Storage.setLocal(KEYS.REPORTS, reports);
      }

      // Seed Notifications
      if (!RW_Storage.getLocal(KEYS.NOTIFICATIONS)) {
        console.log(`${logPrefix} Seeding notifications.`);
        const defaultNotifications = [
          {
            id: "notif-1",
            phone: "+91 98xxxxxx10",
            title: "PH-1003 resolved",
            text: "Crew B-12 closed your report on MG Road.",
            type: "ok",
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: "notif-2",
            phone: "+91 98xxxxxx10",
            title: "PH-1009 verified",
            text: "Scheduled for repair in 48h.",
            type: "warn",
            timestamp: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: "notif-3",
            phone: "+91 98xxxxxx10",
            title: "New hotspot detected",
            text: "Outer Ring Rd risk score rose to 92%.",
            type: "accent",
            timestamp: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        RW_Storage.setLocal(KEYS.NOTIFICATIONS, defaultNotifications);
      }

      console.log(`${logPrefix} Database successfully initialized.`);
    },

    // CRUD - Select All
    getAll(key) {
      return RW_Storage.getLocal(key, []);
    },

    // CRUD - Find Items
    find(key, filterFn) {
      const items = this.getAll(key);
      return items.filter(filterFn);
    },

    // CRUD - Find One Item
    findOne(key, filterFn) {
      const items = this.getAll(key);
      return items.find(filterFn) || null;
    },

    // CRUD - Insert Item
    insert(key, item) {
      const items = this.getAll(key);
      items.push(item);
      RW_Storage.setLocal(key, items);
      console.log(`${logPrefix} Inserted item to collection "${key}"`, item);
      return item;
    },

    // CRUD - Update Item
    update(key, queryFn, updates) {
      const items = this.getAll(key);
      let updatedCount = 0;
      const updatedItems = items.map(item => {
        if (queryFn(item)) {
          updatedCount++;
          return { ...item, ...updates };
        }
        return item;
      });
      RW_Storage.setLocal(key, updatedItems);
      console.log(`${logPrefix} Updated ${updatedCount} items in collection "${key}"`);
      return updatedCount > 0;
    },

    // CRUD - Delete Item
    delete(key, queryFn) {
      const items = this.getAll(key);
      const initialLength = items.length;
      const filteredItems = items.filter(item => !queryFn(item));
      RW_Storage.setLocal(key, filteredItems);
      const deletedCount = initialLength - filteredItems.length;
      console.log(`${logPrefix} Deleted ${deletedCount} items from collection "${key}"`);
      return deletedCount > 0;
    }
  };

  window.RW_Database = RW_Database;
})();

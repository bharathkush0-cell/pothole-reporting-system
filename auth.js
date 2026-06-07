/* ===========================================================
   RoadWatch Backend — Authentication Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Auth]";
  const SESSION_KEY = "roadwatch_session_user";

  const RW_Auth = {
    // Register Citizen User
    register(name, phone, area) {
      console.log(`${logPrefix} Registration request: ${name} (${phone})`);
      
      // Validations
      if (!name || name.trim().length < 2) {
        throw new Error("Full name must be at least 2 characters long.");
      }
      const cleanedPhone = phone.replace(/\D/g, "");
      if (cleanedPhone.length < 10) {
        throw new Error("Please enter a valid 10-digit phone number.");
      }

      // Check if user already exists
      const existing = RW_Database.findOne(RW_Database.KEYS.USERS, u => u.phone === phone);
      if (existing) {
        console.log(`${logPrefix} Existing citizen user login: ${phone}`);
        // Log user in
        this.createSession({ name: existing.name, phone: existing.phone, role: "citizen", area: existing.area });
        return existing;
      }

      // Create new citizen user record
      const newUser = {
        name: name.trim(),
        phone: phone.trim(),
        area: (area || "Unknown").trim(),
        role: "citizen",
        joinedAt: new Date().toISOString()
      };
      RW_Database.insert(RW_Database.KEYS.USERS, newUser);
      
      this.createSession(newUser);
      return newUser;
    },

    // Login via simulated OTP (Citizen)
    requestOTP(phone) {
      console.log(`${logPrefix} OTP requested for: ${phone}`);
      const cleanedPhone = phone.replace(/\D/g, "");
      if (cleanedPhone.length < 10) {
        throw new Error("Enter a valid phone number.");
      }
      
      // Simulate OTP generation
      const mockOtp = String(Math.floor(100000 + Math.random() * 900000));
      // Store temporarily in sessionStorage for validation
      RW_Storage.setSession("rw_temp_otp", { phone, code: mockOtp, expiry: Date.now() + 180000 });
      
      console.log(`${logPrefix} Simulated OTP Generated for ${phone}: ${mockOtp}`);
      return mockOtp;
    },

    verifyOTP(phone, code) {
      console.log(`${logPrefix} OTP verification request: ${phone} -> ${code}`);
      const tempOtp = RW_Storage.getSession("rw_temp_otp");

      if (!tempOtp || tempOtp.phone !== phone || tempOtp.expiry < Date.now()) {
        throw new Error("OTP request expired. Please request a new code.");
      }

      // Allow bypass for demo "123456" or random generated OTP
      if (code === tempOtp.code || code === "123456" || code === "999999") {
        RW_Storage.removeSession("rw_temp_otp");
        
        // Find or auto-create citizen record
        let user = RW_Database.findOne(RW_Database.KEYS.USERS, u => u.phone === phone);
        if (!user) {
          user = {
            name: "Citizen Rao",
            phone: phone,
            area: "Indiranagar",
            role: "citizen",
            joinedAt: new Date().toISOString()
          };
          RW_Database.insert(RW_Database.KEYS.USERS, user);
        }

        const sessionUser = { name: user.name, phone: user.phone, role: "citizen", area: user.area };
        this.createSession(sessionUser);
        return sessionUser;
      }

      throw new Error("Invalid OTP code. Please check and try again.");
    },

    // Login via Credentials (Admin)
    adminLogin(username, password) {
      console.log(`${logPrefix} Admin Sign-in request: ${username}`);
      
      if (!username || !password) {
        throw new Error("Username and password are required.");
      }

      // Check admin record in DB
      const admin = RW_Database.findOne(RW_Database.KEYS.ADMINS, a => a.username.toLowerCase() === username.toLowerCase());
      if (admin && admin.password === password) {
        const sessionUser = { name: admin.name || "Administrator", username: admin.username, role: "admin" };
        this.createSession(sessionUser);
        return sessionUser;
      }

      throw new Error("Invalid administrator username or password.");
    },

    // Session Management
    createSession(user) {
      console.log(`${logPrefix} Session established for role "${user.role}" user "${user.name}"`);
      RW_Storage.setSession(SESSION_KEY, user);
    },

    getCurrentUser() {
      // Legacy compatibility: support local storage user key or session user
      const user = RW_Storage.getSession(SESSION_KEY);
      if (user) return user;
      
      // Fallback check on old legacy localStorage token
      const oldToken = localStorage.getItem("roadwatch_user_v1");
      if (oldToken) {
        try {
          const parsed = JSON.parse(oldToken);
          // Convert to session
          const sessionUser = { name: parsed.name, phone: parsed.phone, role: "citizen", area: parsed.area || "Indiranagar" };
          RW_Storage.setSession(SESSION_KEY, sessionUser);
          return sessionUser;
        } catch (_) {}
      }
      return null;
    },

    logout() {
      const user = this.getCurrentUser();
      if (user) {
        console.log(`${logPrefix} User "${user.name}" signed out.`);
      }
      RW_Storage.removeSession(SESSION_KEY);
      localStorage.removeItem("roadwatch_user_v1"); // Cleanup legacy storage key
    }
  };

  window.RW_Auth = RW_Auth;
})();

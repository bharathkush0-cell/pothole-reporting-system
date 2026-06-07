/* ===========================================================
   RoadWatch Backend — Storage Services (vanilla JS)
   =========================================================== */

(function () {
  const logPrefix = "[Backend-Storage]";

  const RW_Storage = {
    // LocalStorage wrappers
    getLocal(key, defaultValue = null) {
      console.log(`${logPrefix} Read LocalStorage key: "${key}"`);
      try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
      } catch (err) {
        console.error(`${logPrefix} Error parsing LocalStorage key "${key}":`, err);
        return defaultValue;
      }
    },

    setLocal(key, value) {
      console.log(`${logPrefix} Write LocalStorage key: "${key}"`);
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`${logPrefix} Error writing LocalStorage key "${key}":`, err);
        return false;
      }
    },

    removeLocal(key) {
      console.log(`${logPrefix} Remove LocalStorage key: "${key}"`);
      localStorage.removeItem(key);
    },

    // SessionStorage wrappers
    getSession(key, defaultValue = null) {
      console.log(`${logPrefix} Read SessionStorage key: "${key}"`);
      try {
        const value = sessionStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
      } catch (err) {
        console.error(`${logPrefix} Error parsing SessionStorage key "${key}":`, err);
        return defaultValue;
      }
    },

    setSession(key, value) {
      console.log(`${logPrefix} Write SessionStorage key: "${key}"`);
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`${logPrefix} Error writing SessionStorage key "${key}":`, err);
        return false;
      }
    },

    removeSession(key) {
      console.log(`${logPrefix} Remove SessionStorage key: "${key}"`);
      sessionStorage.removeItem(key);
    },

    clearAll() {
      console.log(`${logPrefix} Clear all database storage references`);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  window.RW_Storage = RW_Storage;
})();

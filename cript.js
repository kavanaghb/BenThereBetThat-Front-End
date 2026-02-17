[1mdiff --git a/script.js b/script.js[m
[1mindex 45fcecf..8e8b616 100644[m
[1m--- a/script.js[m
[1m+++ b/script.js[m
[36m@@ -994,23 +994,36 @@[m [mlet selectedBooks = new Set([m
 );[m
 [m
 if (bookmakerFilters) {[m
[31m-  bookmakerFilters.querySelectorAll("input[type='checkbox']").forEach(cb => {[m
[31m-    // Initialize checkbox state[m
[32m+[m[32m  const checkboxes = bookmakerFilters.querySelectorAll("input[type='checkbox']");[m
[32m+[m
[32m+[m[32m  checkboxes.forEach(cb => {[m
[32m+[m[32m    // ✅ Prevent double-binding if this UI is rebuilt/re-rendered[m
[32m+[m[32m    if (cb.dataset.bound === "1") return;[m
[32m+[m[32m    cb.dataset.bound = "1";[m
[32m+[m
[32m+[m[32m    // ✅ Initialize checkbox state:[m
[32m+[m[32m    // If nothing is selected, treat as "all selected"[m
     cb.checked = selectedBooks.size === 0 || selectedBooks.has(cb.value);[m
 [m
     cb.addEventListener("change", () => {[m
[31m-      // Update selected books set[m
[32m+[m[32m      // ✅ Update selectedBooks Set[m
       if (cb.checked) {[m
         selectedBooks.add(cb.value);[m
       } else {[m
         selectedBooks.delete(cb.value);[m
       }[m
 [m
[31m-      // Persist to localStorage[m
[32m+[m[32m      // ✅ If user unchecks everything, interpret as "show all"[m
[32m+[m[32m      // (clear the set, and re-check all boxes)[m
[32m+[m[32m      if (selectedBooks.size === 0) {[m
[32m+[m[32m        checkboxes.forEach(x => (x.checked = true));[m
[32m+[m[32m      }[m
[32m+[m
[32m+[m[32m      // ✅ Persist to localStorage[m
       localStorage.setItem("selectedBooks", JSON.stringify([...selectedBooks]));[m
 [m
[31m-      // ✅ Safe re-render only if data exists[m
[31m-      if (window.lastRenderedData && Array.isArray(window.lastRenderedData) && window.lastRenderedData.length > 0) {[m
[32m+[m[32m      // ✅ Safe re-render only if cached data exists[m
[32m+[m[32m      if (Array.isArray(window.lastRenderedData) && window.lastRenderedData.length > 0) {[m
         console.log("🔁 Updating table with current bookmaker filters:", [...selectedBooks]);[m
         rerenderConsensusTable(window.lastRenderedData);[m
       } else {[m
[36m@@ -1020,6 +1033,7 @@[m [mif (bookmakerFilters) {[m
   });[m
 }[m
 [m
[32m+[m
 // ===================================================[m
 // ⭐ LOAD TEAM LOGOS FROM JSON[m
 // ===================================================[m

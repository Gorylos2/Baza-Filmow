document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const btn = event.target.querySelector("button[type=submit]");

  if (!username || !password) {
    alert("Podaj nazwę użytkownika i hasło.");
    return;
  }

  // zablokuj przycisk na czas żądania
  const prevText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Logowanie…";

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      const msg =
        data?.message ||
        (res.status === 429 ? "Za dużo prób logowania. Spróbuj ponownie za chwilę." : "Błędny login lub hasło.");
      alert(msg);
      return;
    }

    if (!data.token) {
      alert("Serwer nie zwrócił tokenu.");
      return;
    }

    localStorage.setItem("token", data.token);
    // sukces → przekierowanie na stronę główną
    window.location.href = "/html/index.html";
  } catch (err) {
    alert("Błąd sieci: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
});


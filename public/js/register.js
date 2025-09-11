document.getElementById("registerForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Walidacja klienta dopasowana do backendu:
  if (username.length < 3) {
    alert("Login musi mieć co najmniej 3 znaki.");
    return;
  }
  // min. 8 znaków, min. 1 litera mała, 1 wielka i 1 cyfra (tak jak isStrongPassword z minSymbols:0)
  const passOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  if (!passOk) {
    alert("Hasło: min. 8 znaków, mała i wielka litera oraz cyfra.");
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    // Próbujemy odczytać JSON niezależnie od statusu
    let data = {};
    try { data = await res.json(); } catch (_) { /* brak treści/nie-JSON */ }

    if (!res.ok) {
      // Backend może zwrócić:
      // - { message: "..." }
      // - { errors: [ { msg: "...", param: "..." }, ... ] } (express-validator)
      const msg =
        data?.message ||
        data?.errors?.[0]?.msg ||
        (res.status === 429 ? "Za dużo prób. Spróbuj ponownie za chwilę." : "Wystąpił błąd podczas rejestracji.");
      alert(msg);
      return;
    }

    // Sukces 201
    alert("Rejestracja udana! Możesz się teraz zalogować.");
    // dopasuj ścieżkę do logowania do swojej struktury
    window.location.href = "/html/login.html";
  } catch (err) {
    // To są tylko realne błędy sieci (brak połączenia, CORS, itp.)
    alert("Błąd sieci: " + err.message);
  }
});


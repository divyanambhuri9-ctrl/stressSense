const API_URL =
  "http://localhost:5000/api/auth";


// ===============================
// SIGN UP
// ===============================

export async function signupUser(
  name,
  email,
  password
) {
  const response = await fetch(
    `${API_URL}/signup`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "include",

      body: JSON.stringify({
        name,
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Unable to create account."
    );
  }

  return data;
}


// ===============================
// LOGIN
// ===============================

export async function loginUser(
  email,
  password
) {
  const response = await fetch(
    `${API_URL}/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "include",

      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Unable to login."
    );
  }

  return data;
}


// ===============================
// CURRENT USER
// ===============================

export async function getCurrentUser() {
  const response = await fetch(
    `${API_URL}/me`,
    {
      method: "GET",
      credentials: "include"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Not authenticated."
    );
  }

  return data;
}


// ===============================
// LOGOUT
// ===============================

export async function logoutUser() {
  const response = await fetch(
    `${API_URL}/logout`,
    {
      method: "POST",
      credentials: "include"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Unable to logout."
    );
  }

  return data;
}
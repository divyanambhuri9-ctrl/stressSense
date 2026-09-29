const API_URL =
  "https://stresssense-backend-r2d5.onrender.com/api/sessions";


export async function saveExamSession(
  sessionData
) {
  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      credentials: "include",

      body: JSON.stringify(
        sessionData
      )
    }
  );


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to save exam session"
    );
  }


  return data;
}


export async function getExamSessions() {
  const response =
    await fetch(API_URL, {
      credentials: "include"
    });


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch exam sessions"
    );
  }


  return data;
}


export async function getExamSession(
  id
) {
  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        credentials: "include"
      }
    );


  const data =
    await response.json();


  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch exam session"
    );
  }


  return data;
}
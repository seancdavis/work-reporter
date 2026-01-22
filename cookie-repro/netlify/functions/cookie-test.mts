import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  console.log("--- Cookie Test Function ---");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  // console.log("Request headers:", Object.fromEntries(req.headers.entries()));

  if (req.method === "GET") {
    const cookie = context.cookies.get("test-cookie");
    console.log("GET - Cookie from context.cookies.get():", cookie);
    // console.log("GET - All cookies from header:", req.headers.get("cookie"));
    return new Response(
      cookie ? `Cookie value: ${cookie}` : "No cookie found",
      {
        headers: { "Content-Type": "text/plain" },
      },
    );
  }

  if (req.method === "POST") {
    const body = await req.json();
    const cookieValue = body["cookie-value"] as string;
    console.log("POST - Setting cookie value:", cookieValue);
    context.cookies.set({
      name: "test-cookie",
      value: cookieValue,
      path: "/",
      // httpOnly: true,
      // secure: true,
      // sameSite: "Lax",
    });
    console.log("POST - Cookie set called");
    const response = new Response(null, { status: 204 });
    console.log(
      "POST - Response headers:",
      Object.fromEntries(response.headers.entries()),
    );
    return response;
  }

  return new Response("Hello, world!");
};

export const config = {
  path: "/api/cookie-test",
};

import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [cookieValue, setCookieValue] = useState("Loading...");
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    fetch("/api/cookie-test")
      .then((res) => res.text())
      .then((text) => setCookieValue(text));
  }, []);

  const fetchCookieValue = async () => {
    const res = await fetch("/api/cookie-test");
    const text = await res.text();
    setCookieValue(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/cookie-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "cookie-value": inputValue }),
    });
    await fetchCookieValue();
    setInputValue("");
  };

  return (
    <>
      {/* Cookie Value */}
      <div>
        <h2>Cookie Value</h2>
        <code>{cookieValue}</code>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter cookie value"
          rows={3}
        />
        <br />
        <button type="submit">Set Cookie</button>
      </form>

      <hr />

      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;

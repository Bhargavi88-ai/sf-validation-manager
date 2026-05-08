import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL;

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [rules, setRules] = useState([]);

  const login = () => {
    window.location.href = `${API}/auth/login`;
  };

  useEffect(() => {
    fetch(`${API}/auth/status`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);

          fetch(`${API}/api/validation-rules`, {
            credentials: "include",
          })
            .then((res) => res.json())
            .then((data) => {
              setRules(data.rules || []);
            });
        }
      });
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>SF Validation Manager</h1>

      {!authenticated ? (
        <button onClick={login}>
          Login with Salesforce
        </button>
      ) : (
        <>
          <h2>Validation Rules</h2>

          {rules.length === 0 ? (
            <p>No rules found</p>
          ) : (
            <table border="1" cellPadding="10">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Active</th>
                </tr>
              </thead>

              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>{rule.name}</td>
                    <td>{rule.active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default App;
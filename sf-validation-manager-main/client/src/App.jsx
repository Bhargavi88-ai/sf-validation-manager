import './App.css'

function App() {

  const login = () => {
    window.location.href = "http://localhost:5000/auth/login"
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        backgroundColor: "#f4f6f9",
        fontFamily: "Arial"
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          marginBottom: "20px",
          color: "#0176d3"
        }}
      >
        SF Validation Manager
      </h1>

      <p
        style={{
          marginBottom: "30px",
          fontSize: "18px",
          color: "#444"
        }}
      >
        Manage Salesforce Validation Rules Easily
      </p>

      <button
        onClick={login}
        style={{
          padding: "14px 28px",
          fontSize: "18px",
          backgroundColor: "#0176d3",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Login with Salesforce
      </button>
    </div>
  )
}

export default App
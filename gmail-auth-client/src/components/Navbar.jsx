import React, { useState, useEffect } from "react";
import { gapi } from "gapi-script";
import axios from "axios";
import "./Navbar.css";

const CLIENT_ID =
  "804989141887-1ft28pqvcssm587so6u2cceckikvkkvv.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

const Navbar = () => {
  const [menu, setMenu] = useState("Home");
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    function start() {
      gapi.client
        .init({ clientId: CLIENT_ID, scope: SCOPES })
        .then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          setIsSignedIn(authInstance.isSignedIn.get());
          setIsReady(true);
        })
        .catch((err) => console.error("gapi init error", err));
    }

    gapi.load("client:auth2", start);
  }, []);

  const handleLoginAndFetch = async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      setIsSignedIn(true);

      await gapi.client.load("gmail", "v1");

      const res = await gapi.client.gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
      });

      const messages = res.result.messages || [];

      const details = await Promise.all(
        messages.map(async (msg) => {
          const m = await gapi.client.gmail.users.messages.get({
            userId: "me",
            id: msg.id,
          });
          const subject =
            m.result.payload.headers.find((h) => h.name === "Subject")?.value ||
            "";
          return { subject, snippet: m.result.snippet };
        })
      );

      const filtered = details.filter((email) =>
        email.subject.toLowerCase().includes("lead")
      );

      await axios.post("http://localhost:8089/emails", { emails: filtered });
    } catch (error) {
      console.error("Error during Gmail fetch or axios post:", error);
    }
  };

  const handleLogout = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signOut().then(() => {
      setIsSignedIn(false);
    });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  return (
    <div className="navbar">
      <ul className="navbar-links">
        {[
          "Home",
          "Demo",
          "Our Services",
          "Contact Us",
          "Jobs",
          "Book Online",
        ].map((label, i) => {
          const href = "#" + label.toLowerCase().replace(/\s+/g, "-");
          return (
            <li key={i}>
              <a
                href={href}
                onClick={() => setMenu(label)}
                className={menu === label ? "active" : ""}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="navbar-actions">
        <button className="dark-toggle" onClick={toggleDarkMode}>
          {darkMode ? "☀️" : "🌙"}
        </button>

        {isSignedIn ? (
          <button className="btn google-login" onClick={handleLogout}>
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              style={{ width: 18, height: 18, marginRight: 8 }}
            />
            Sign out
          </button>
        ) : (
          <button
            className="btn google-login"
            onClick={handleLoginAndFetch}
            disabled={!isReady}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              style={{ width: 18, height: 18, marginRight: 8 }}
            />
            Sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;

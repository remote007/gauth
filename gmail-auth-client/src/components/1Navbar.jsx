import React, { useState, useEffect } from "react";
import { gapi } from "gapi-script";
import axios from "axios";
import "./Navbar.css";

const CLIENT_ID = "804989141887-1ft28pqvcssm587so6u2cceckikvkkvv.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly";
const API_BASE_URL = "http://localhost:8083"; // Updated to match server port

const DomainInputPopup = ({ onSubmit, onClose, editDomain = "", editMode = false, userEmail = "" }) => {
  const [domain, setDomain] = useState(editDomain);
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    setDomain(editDomain);
  }, [editDomain]);

  const validateDomain = async (domainToTest) => {
    setIsValidating(true);
    setValidationMessage("");
    
    try {
      const response = await axios.post(`${API_BASE_URL}/user/domains/test`, {
        email: "test@example.com", // This is just for validation purposes
        domain: domainToTest
      });
      
      if (response.data.success && response.data.isValid) {
        setValidationMessage("✅ Domain appears valid");
        return true;
      } else {
        setValidationMessage("⚠️ Domain might have issues");
        return false;
      }
    } catch (error) {
      setValidationMessage("❌ Error validating domain");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const trimmed = domain.trim();
  
    if (!trimmed) return;
  
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(trimmed)) {
      setValidationMessage("❌ Invalid domain format");
      return;
    }
  
    try {
      setIsValidating(true);
      // Use userEmail passed as a prop
      const response = await axios.post(`${API_BASE_URL}/user/domains`, { 
        email: userEmail, // This needs to be passed as a prop
        domain: trimmed 
      });
      
      if (response.data.success) {
        setValidationMessage("✅ Domain saved successfully");
        // Notify parent component of success so it can update its state
        onSubmit(trimmed, editMode);
        // Close popup after a brief delay to show success message
        setTimeout(() => onClose(), 1000);
      } else {
        setValidationMessage("❌ Failed to save domain");
      }
    } catch (error) {
      console.error("Error saving domain:", error);
      setValidationMessage("❌ Error saving domain");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="domain-popup-overlay">
      <div className="domain-popup">
        <h3>{editMode ? "Edit Domain" : "Enter Email Domain to Monitor"}</h3>
        <p>We'll set up a cron job to search your inbox for emails from this domain</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
          {validationMessage && (
            <div className={`validation-message ${validationMessage.includes("✅") ? "success" : "warning"}`}>
              {validationMessage}
            </div>
          )}
          <div className="domain-popup-buttons">
            <button 
              type="submit" 
              className="btn primary"
              disabled={isValidating}
            >
              {isValidating ? "Validating..." : editMode ? "Update Domain" : "Save Domain"}
            </button>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DomainsList = ({ domains, onEdit, onDelete, loading }) => {
  if (loading) {
    return <div className="domains-list"><p>Loading domains...</p></div>;
  }
  
  if (domains.length === 0) {
    return <div className="domains-list"><p className="no-domains">No domains added yet</p></div>;
  }

  return (
    <div className="domains-list">
      <h3>Your Monitored Domains</h3>
      <ul>
        {domains.map((domain, index) => (
          <li key={index} className="domain-item">
            <span>{domain}</span>
            <div className="domain-actions">
              <button onClick={() => onEdit(domain)} className="btn-icon" title="Edit domain">
                ✏️
              </button>
              <button onClick={() => onDelete(domain)} className="btn-icon" title="Delete domain">
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Navbar = () => {
  const [menu, setMenu] = useState("Home");
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showDomainPopup, setShowDomainPopup] = useState(false);
  const [userDomains, setUserDomains] = useState([]);
  const [showDomainsList, setShowDomainsList] = useState(false);
  const [editingDomain, setEditingDomain] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState({ message: "", type: "" });

  useEffect(() => {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          clientId: CLIENT_ID,
          scope: SCOPES,
        })
        .then(() => {
          const auth = gapi.auth2.getAuthInstance();
          setIsSignedIn(auth.isSignedIn.get());
          setIsReady(true);
  
          if (auth.isSignedIn.get()) {
            const email = auth.currentUser.get().getBasicProfile().getEmail();
            setUserEmail(email);
            loadUserDomains(email);
          }
        })
        .catch((error) => {
          console.error("GAPI init error:", error);
        });
    });
  }, []);  

  const showStatusMessage = (message, type = "info") => {
    setActionStatus({ message, type });
    setTimeout(() => setActionStatus({ message: "", type: "" }), 3000);
  };

  const loadUserDomains = async (email) => {
    try {
      setIsLoading(true);
      // Get domains from server using the API endpoint
      const response = await axios.get(`${API_BASE_URL}/user/domains/${email}`);
      
      if (response.data.success) {
        setUserDomains(response.data.domains || []);
      } else {
        showStatusMessage("Failed to load domains", "error");
      }
    } catch (error) {
      console.error("Error loading user domains:", error);
      showStatusMessage("Error loading domains", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginAndFetch = async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      
      const email = authInstance.currentUser.get().getBasicProfile().getEmail();
      setUserEmail(email);
      setIsSignedIn(true);
      
      // Load user's domains from server
      await loadUserDomains(email);
      
      // If no domains found, show domain popup
      if (userDomains.length === 0) {
        setShowDomainPopup(true);
      } else {
        // Fetch emails for existing domains
        await fetchEmailsForDomains(userDomains);
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      showStatusMessage("Sign-in failed", "error");
    }
  };

  const fetchEmailsForDomains = async (domains) => {
    if (!domains || domains.length === 0) return;
    
    try {
      setIsLoading(true);
      showStatusMessage("Fetching emails...", "info");
      
      await gapi.client.load("gmail", "v1");
      
      // Create query string to find emails from any of the domains
      const domainQuery = domains.map(domain => `from:${domain}`).join(" OR ");
      
      const res = await gapi.client.gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
        q: domainQuery
      });

      const messages = res.result.messages || [];

      if (messages.length === 0) {
        showStatusMessage("No matching emails found", "info");
        setIsLoading(false);
        return;
      }

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

      const response = await axios.post(`${API_BASE_URL}/leads`, { emails: filtered });
      
      if (response.data.success) {
        showStatusMessage(`Found ${response.data.count} leads`, "success");
      } else {
        showStatusMessage("Failed to process emails", "error");
      }
    } catch (error) {
      console.error("Error during Gmail fetch or axios post:", error);
      showStatusMessage("Error processing emails", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = () => {
    setEditingDomain("");
    setIsEditMode(false);
    setShowDomainPopup(true);
  };

  const handleEditDomain = (domain) => {
    setEditingDomain(domain);
    setIsEditMode(true);
    setShowDomainPopup(true);
    setShowDomainsList(false);
  };

  const handleDeleteDomain = async (domain) => {
    try {
      setIsLoading(true);
      const response = await axios.delete(`${API_BASE_URL}/user/domains/${userEmail}/${domain}`);
      
      if (response.data.success) {
        // Update local state
        setUserDomains(response.data.domains || []);
        showStatusMessage("Domain deleted successfully", "success");
      } else {
        showStatusMessage("Failed to delete domain", "error");
      }
    } catch (error) {
      console.error("Error deleting domain:", error);
      showStatusMessage("Error deleting domain", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainSubmit = async (domain, isEdit) => {
    try {
      setIsLoading(true);
      
      if (isEdit) {
        // Update existing domain
        const response = await axios.put(`${API_BASE_URL}/user/domains/${userEmail}/${editingDomain}`, { 
          newDomain: domain 
        });
        
        if (response.data.success) {
          // Update local state with server response
          setUserDomains(response.data.domains || []);
          showStatusMessage("Domain updated successfully", "success");
        } else {
          showStatusMessage("Failed to update domain", "error");
        }
      } else {
        const response = await axios.post(`${API_BASE_URL}/user/domains`, { 
          email: userEmail, 
          domain:domain 
        });
        
        if (response.data.success) {
          // Update local state with server response
          setUserDomains(response.data.domains || []);
          showStatusMessage("Domain added successfully", "success");
        } else {
          showStatusMessage("Failed to add domain", "error");
        }
      }
      
      // Close popups
      setShowDomainPopup(false);
      setEditingDomain("");
      setIsEditMode(false);
      
      // Fetch emails for the updated domain
      await fetchEmailsForDomains([domain]);
    } catch (error) {
      console.error("Error saving domain:", error);
      showStatusMessage("Error saving domain", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signOut().then(() => {
      setIsSignedIn(false);
      setUserDomains([]);
      setUserEmail("");
      setShowDomainsList(false);
      showStatusMessage("Signed out successfully", "info");
    });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  const toggleDomainsList = () => {
    setShowDomainsList(!showDomainsList);
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
        
        {isSignedIn && (
          <>
            <li>
              <a 
                href="#add-domain" 
                onClick={handleAddDomain}
                className={menu === "Add Domain" ? "active" : ""}
              >
                Add Domain
              </a>
            </li>
            <li>
              <a 
                href="#manage-domains" 
                onClick={toggleDomainsList}
                className={menu === "Manage Domains" ? "active" : ""}
              >
                Manage Domains
                {userDomains.length > 0 && (
                  <span className="domain-count">{userDomains.length}</span>
                )}
              </a>
            </li>
          </>
        )}
      </ul>

      <div className="navbar-actions">
        {actionStatus.message && (
          <div className={`status-message ${actionStatus.type}`}>
            {actionStatus.message}
          </div>
        )}
        
        <button className="dark-toggle" onClick={toggleDarkMode}>
          {darkMode ? "☀️" : "🌙"}
        </button>

        {isSignedIn ? (
          <button 
            className="btn google-login" 
            onClick={handleLogout}
            disabled={isLoading}
          >
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
            disabled={!isReady || isLoading}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              style={{ width: 18, height: 18, marginRight: 8 }}
            />
            Sign in with Google
          </button>
        )}
      </div>

      {showDomainPopup && (
        <DomainInputPopup
          onSubmit={handleDomainSubmit}
          onClose={() => setShowDomainPopup(false)}
          editDomain={editingDomain}
          editMode={isEditMode}
          userEmail={userEmail}
        />
      )}

      {showDomainsList && userDomains.length > 0 && (
        <DomainsList
          domains={userDomains}
          onEdit={handleEditDomain}
          onDelete={handleDeleteDomain}
          loading={isLoading}
        />
      )}
    </div>
  );
};

export default Navbar;
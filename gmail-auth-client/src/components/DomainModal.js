import React, { useState } from "react";
import "./DomainModal.css";

const DomainModal = ({ isOpen, onClose, onSubmit, isNewUser }) => {
  const [domainName, setDomainName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate domain name
    if (!domainName.trim()) {
      setError("Domain name is required");
      return;
    }
    
    // Simple domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domainName)) {
      setError("Please enter a valid domain name (e.g., example.com)");
      return;
    }
    
    onSubmit(domainName);
    setDomainName("");
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="domain-modal-overlay">
      <div className="domain-modal">
        <h2>{isNewUser ? "Welcome! Add Your Domain" : "Add a New Domain"}</h2>
        
        {isNewUser && (
          <p className="modal-description">
            To get started with lead management, please enter your domain name.
          </p>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="domain">Domain Name:</label>
            <input
              type="text"
              id="domain"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="example.com"
              required
            />
            {error && <p className="error-message">{error}</p>}
          </div>
          
          <div className="modal-actions">
            {!isNewUser && (
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="submit-btn">
              {isNewUser ? "Get Started" : "Add Domain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainModal;
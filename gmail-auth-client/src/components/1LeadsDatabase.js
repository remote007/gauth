import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Calendar, Trash2, MessageCircle, Phone } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./LeadsDatabase.css";

const Button = ({ icon, onClick, variant = "icon", children }) => (
  <button className={`btn ${variant}`} onClick={onClick}>
    {icon && <span className="icon">{icon}</span>}
    {children}
  </button>
);

const Checkbox = () => <input type="checkbox" />;

export default function LeadsDatabase() {
  const [leads, setLeads] = useState([]);
  const [selectedDate, setSelectedDate] = useState({});
  const [visibleId, setVisibleId] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const iconRefs = useRef({});

  useEffect(() => {
    axios.get("http://localhost:8089/leads")
      .then((res) => {
        setLeads(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch leads:", err);
      });
  }, []);

  const toggleDatePicker = (id) => {
    if (visibleId === id) {
      setVisibleId(null);
      return;
    }
    const rect = iconRefs.current[id]?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setVisibleId(id);
    }
  };

  const handleDateChange = (date, id) => {
    // First update the local state with the selected date
    setSelectedDate((prev) => ({ ...prev, [id]: date }));
    
    // Close the date picker popup
    setVisibleId(null);
    
    // Then update the backend with the new date
    axios.put(`http://localhost:8089/leads/${id}/date`, { date: date.toISOString() })
      .then((response) => {
        console.log('Date updated successfully', response.data);
        
        // Update the lead in the local state to reflect the change
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            (lead._id === id || lead.id === id) 
              ? { ...lead, date: date.toISOString() } 
              : lead
          )
        );
      })
      .catch((err) => {
        console.error("Failed to update date:", err);
      });
  };

  const handleStatusChange = (e, leadId) => {
    const updatedStatus = e.target.value;
    // Update the database with the new status
    axios.put(`http://localhost:8089/leads/${leadId}/status`, { status: updatedStatus })
      .then(() => {
        console.log('Status updated successfully');
        // Update the leads array with the new status
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead._id === leadId ? { ...lead, status: updatedStatus } : lead
          )
        );
      })
      .catch((err) => {
        console.error("Failed to update status:", err);
      });
  };

  const handleDelete = (leadId) => {
    // Delete the lead from the database
    axios.delete(`http://localhost:8089/leads/${leadId}`)
      .then(() => {
        setLeads((prevLeads) => prevLeads.filter(lead => lead._id !== leadId));
        console.log('Lead deleted successfully');
      })
      .catch((err) => {
        console.error("Failed to delete lead:", err);
      });
  };

  const openWhatsApp = (phone) => {
    // Open WhatsApp chat with the phone number
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleBackClick = () => {
    window.location.href = "/dashboard";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!Object.values(iconRefs.current).some(ref => ref && ref.contains(e.target))) {
        setVisibleId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="leads-database-container">
      <div className="header">
        <h1>Leads Database</h1>
        <div className="buttons">
          <Button onClick={handleBackClick}>Back to Dashboard</Button>
        </div>
      </div>

      <div className="content-wrapper">
        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th><Checkbox /></th>
                <th>Name</th>
                <th>Category</th>
                <th>Event Date</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id || lead.id}>
                  <td><Checkbox /></td>
                  <td>{lead.name}</td>
                  <td>{lead.category}</td>
                  <td>
                    {selectedDate[lead._id]?.toLocaleDateString("en-GB") ||
                     selectedDate[lead.id]?.toLocaleDateString("en-GB") ||
                     new Date(lead.date || lead.eventDate).toLocaleDateString("en-GB")}
                  </td>
                  <td>{lead.phone || "N/A"}</td>
                  <td>{lead.email}</td>
                  <td>
                    <div className="action-buttons">
                      <Button icon={<MessageCircle size={16} />} onClick={() => openWhatsApp(lead.phone)} />
                      <span ref={(el) => (iconRefs.current[lead._id || lead.id] = el)}>
                        <Button
                          icon={<Calendar size={16} />}
                          onClick={() => toggleDatePicker(lead._id || lead.id)}
                        />
                      </span>
                      <Button
                        icon={<Trash2 size={16} color="red" />}
                        onClick={() => handleDelete(lead._id || lead.id)}
                      />
                    </div>
                  </td>
                  <td>
                    <select
                      value={lead.status || "New"}
                      onChange={(e) => handleStatusChange(e, lead._id || lead.id)}
                    >
                      <option value="New">New</option>
                      <option value="Converted">Converted</option>
                      <option value="Dropped">Dropped</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleId && (
          <div
            className="datepicker-popup absolute"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
              position: "absolute",
              zIndex: 9999,
            }}
          >
            <DatePicker
              selected={selectedDate[visibleId] || null}
              onChange={(date) => handleDateChange(date, visibleId)}
              inline
            />
          </div>
        )}
      </div>
    </div>
  );
}
